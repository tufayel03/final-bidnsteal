const bcrypt = require("bcryptjs");
const express = require("express");
const Order = require("../models/Order");
const Subscriber = require("../models/Subscriber");
const User = require("../models/User");
const { env } = require("../config/env");
const { requireAdmin } = require("../middleware/auth");
const { sendTemplateEmail } = require("../services/emailService");
const { getPublicSiteProfile } = require("../services/siteProfileService");
const { containsRegex, parsePagination } = require("../utils/http");
const { createPasswordResetToken } = require("../utils/passwordReset");
const { isValidEmail, normalizeEmail, normalizeShippingAddress, passwordStrengthError, sanitizeText } = require("../utils/validation");

const router = express.Router();

function escapeCsv(value) {
  return `"${String(value || "").replace(/"/g, "\"\"")}"`;
}

function normalizeAdminOrder(order) {
  const raw = typeof order?.toJSON === "function" ? order.toJSON() : order;
  return {
    ...raw,
    paymentStatus: String(raw?.paymentStatus || "").toLowerCase() === "collected"
      ? "paid"
      : String(raw?.paymentStatus || "unpaid").toLowerCase(),
    fulfillmentStatus: String(raw?.fulfillmentStatus || "pending").toLowerCase(),
    shipping: Number(raw?.shippingFee ?? raw?.shipping ?? 0),
    shippingFee: Number(raw?.shippingFee ?? raw?.shipping ?? 0)
  };
}

function normalizePrimaryAddress(address) {
  const source = address && typeof address === "object" ? address : {};
  return {
    fullName: String(source.fullName || "").trim(),
    phone: String(source.phone || "").trim(),
    addressLine1: String(source.addressLine1 || "").trim(),
    addressLine2: String(source.addressLine2 || "").trim(),
    area: String(source.area || "").trim(),
    city: String(source.city || "").trim(),
    postalCode: String(source.postalCode || "").trim(),
    country: String(source.country || "BD").trim() || "BD"
  };
}

function hasAddressFields(address) {
  return ["fullName", "phone", "addressLine1", "addressLine2", "area", "city", "postalCode"].some(
    (key) => Boolean(String(address?.[key] || "").trim())
  );
}

async function enrichUsersWithSpend(users) {
  const ids = users.map((user) => user._id);
  const totals = await Order.aggregate([
    { $match: { userId: { $in: ids } } },
    {
      $group: {
        _id: "$userId",
        totalSpent: { $sum: "$total" },
        orderCount: { $sum: 1 },
        lastOrderAt: { $max: "$createdAt" }
      }
    }
  ]);

  const totalsMap = new Map(
    totals.map((item) => [
      String(item._id),
      {
        totalSpent: Number(item.totalSpent || 0),
        orderCount: Number(item.orderCount || 0),
        lastOrderAt: item.lastOrderAt || null
      }
    ])
  );
  return users.map((user) => ({
    ...user.toJSON(),
    totalSpent: totalsMap.get(user.id)?.totalSpent || 0,
    orderCount: totalsMap.get(user.id)?.orderCount || 0,
    lastOrderAt: totalsMap.get(user.id)?.lastOrderAt || null
  }));
}

async function buildAdminUserDetails(user) {
  const match = {
    $or: [{ userId: user._id }, { customerEmail: user.email }]
  };

  const [totals = null, recentOrdersRaw = []] = await Promise.all([
    Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: "$total" },
          orderCount: { $sum: 1 },
          lastOrderAt: { $max: "$createdAt" }
        }
      }
    ]).then((items) => items[0] || null),
    Order.find(match).sort({ createdAt: -1 }).limit(10)
  ]);

  const shippingAddress = normalizePrimaryAddress(user.shippingAddress || {});
  const addresses = hasAddressFields(shippingAddress) ? [{ ...shippingAddress, label: "Primary" }] : [];

  return {
    ...user.toJSON(),
    shippingAddress,
    addresses,
    totalSpent: Number(totals?.totalSpent || 0),
    orderCount: Number(totals?.orderCount || 0),
    lastOrderAt: totals?.lastOrderAt || null,
    recentOrders: recentOrdersRaw.map((order) => normalizeAdminOrder(order))
  };
}

router.use(requireAdmin);

router.get("/users", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const search = String(req.query.search || "").trim();
  const role = String(req.query.role || "").trim();
  const sort = String(req.query.sort || "").trim();

  const query = {};
  if (search) {
    const searchRegex = containsRegex(search);
    query.$or = [
      { email: searchRegex },
      { name: searchRegex }
    ];
  }
  if (role) query.role = role;

  const total = await User.countDocuments(query);
  let items;
  if (sort === "top_spent") {
    const allUsers = await User.find(query);
    items = await enrichUsersWithSpend(allUsers);
    items.sort((a, b) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0));
    items = items.slice(skip, skip + limit);
  } else {
    const rawUsers = await User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
    items = await enrichUsersWithSpend(rawUsers);
  }

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

router.get("/users/export", async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  const csv = [
    "email,name,phone,role,isSuspended,createdAt",
    ...users.map((user) =>
      [
        escapeCsv(user.email),
        escapeCsv(user.name),
        escapeCsv(user.phone),
        escapeCsv(user.role),
        user.isSuspended ? "true" : "false",
        user.createdAt ? new Date(user.createdAt).toISOString() : ""
      ].join(",")
    )
  ].join("\r\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"users.csv\"");
  return res.send(csv);
});

router.post("/users/import", async (req, res) => {
  const rows = Array.isArray(req.body?.users) ? req.body.users : [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    try {
      const email = String(row.email || "").toLowerCase().trim();
      if (!email) {
        skipped += 1;
        continue;
      }
      if (!isValidEmail(email)) {
        throw new Error("Invalid email address.");
      }

      const existing = await User.findOne({ email });
      if (existing) {
        if (row.name) existing.name = sanitizeText(row.name, 120);
        if (row.phone) existing.phone = sanitizeText(row.phone, 40);
        if (row.role) existing.role = row.role === "admin" ? "admin" : "customer";
        if (row.isSuspended !== undefined) existing.isSuspended = Boolean(row.isSuspended);
        if (row.password) {
          const passwordError = passwordStrengthError(String(row.password));
          if (passwordError) {
            throw new Error(passwordError);
          }
          existing.passwordHash = await bcrypt.hash(String(row.password), 10);
        }
        await existing.save();
        updated += 1;
      } else {
        const password = String(row.password || "");
        if (!password) {
          throw new Error("Password is required for new users.");
        }
        const passwordError = passwordStrengthError(password);
        if (passwordError) {
          throw new Error(passwordError);
        }
        await User.create({
          name: sanitizeText(row.name || email.split("@")[0], 120),
          email,
          phone: sanitizeText(row.phone || "", 40),
          role: row.role === "admin" ? "admin" : "customer",
          isSuspended: Boolean(row.isSuspended),
          passwordHash: await bcrypt.hash(password, 10)
        });
        created += 1;
      }
    } catch (error) {
      skipped += 1;
      errors.push({ rowNumber: row.rowNumber || 0, message: error.message });
    }
  }

  return res.json({ created, updated, skipped, errors });
});

router.get("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  return res.json(await buildAdminUserDetails(user));
});

router.patch("/users/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (req.body?.name !== undefined) {
    const name = sanitizeText(req.body.name, 120);
    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }
    user.name = name;
  }

  if (req.body?.email !== undefined) {
    const email = normalizeEmail(req.body.email);
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "A valid email is required." });
    }
    const existing = await User.findOne({ email, _id: { $ne: user._id } }).select("_id");
    if (existing) {
      return res.status(409).json({ message: "Another user already uses this email address." });
    }
    user.email = email;
  }

  if (req.body?.phone !== undefined) {
    user.phone = sanitizeText(req.body.phone, 40);
  }

  if (req.body?.role !== undefined) {
    user.role = req.body.role === "admin" ? "admin" : "customer";
  }

  if (req.body?.isSuspended !== undefined) {
    user.isSuspended = Boolean(req.body.isSuspended);
  }

  if (req.body?.shippingAddress && typeof req.body.shippingAddress === "object") {
    user.shippingAddress = normalizeShippingAddress(req.body.shippingAddress, user.shippingAddress || {});
  }

  await user.save();
  return res.json(await buildAdminUserDetails(user));
});

router.patch("/users/:id/role", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  user.role = req.body?.role === "admin" ? "admin" : "customer";
  await user.save();
  return res.json({ id: user.id, email: user.email, role: user.role });
});

router.patch("/users/:id/suspend", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  user.isSuspended = Boolean(req.body?.suspend);
  await user.save();
  return res.json({ id: user.id, email: user.email, isSuspended: user.isSuspended });
});

router.post("/users/:id/send-password-reset", async (req, res) => {
  const user = await User.findById(req.params.id).select("+passwordResetToken +passwordResetExpiresAt");
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const resetToken = createPasswordResetToken();
  user.passwordResetToken = resetToken.hashedToken;
  user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const siteProfile = await getPublicSiteProfile();
  const storefrontBase = String(siteProfile.siteUrl || env.clientUrls[0] || "").replace(/\/$/, "");
  const resetLink = storefrontBase
    ? `${storefrontBase}/reset-password?token=${encodeURIComponent(resetToken.token)}`
    : `/reset-password?token=${encodeURIComponent(resetToken.token)}`;

  try {
    await sendTemplateEmail({
      templateKey: "password-reset",
      to: user.email,
      context: {
        customer: {
          name: user.name,
          email: user.email
        },
        site: {
          name: siteProfile.siteName || "BidnSteal",
          url: storefrontBase
        },
        support: {
          email: siteProfile.supportEmail || env.adminEmail
        },
        auth: {
          login_link: storefrontBase ? `${storefrontBase}/login` : "/login",
          reset_link: resetLink
        }
      },
      fallbackSubject: `Reset your ${siteProfile.siteName || "BidnSteal"} password`,
      fallbackHtml: `<p>Hello ${user.name || "there"},</p><p>Use the secure link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 60 minutes.</p>`
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Unable to send password reset email." });
  }

  return res.json({ ok: true, message: `Password reset email sent to ${user.email}` });
});

router.get("/subscribers/export", async (_req, res) => {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 });
  const csv = [
    "email,name,source,isActive,createdAt",
    ...subscribers.map((item) =>
      [
        escapeCsv(item.email),
        escapeCsv(item.name),
        escapeCsv(item.source),
        item.isActive ? "true" : "false",
        item.createdAt ? new Date(item.createdAt).toISOString() : ""
      ].join(",")
    )
  ].join("\r\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"subscribers.csv\"");
  return res.send(csv);
});

router.post("/subscribers/import", express.text({ type: "*/*" }), async (req, res) => {
  const lines = String(req.body || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const dataLines = lines[0]?.toLowerCase().includes("email") ? lines.slice(1) : lines;
  let inserted = 0;
  let skipped = 0;
  const errors = [];

  for (const line of dataLines) {
    try {
      const [emailRaw, nameRaw, sourceRaw] = line.split(",").map((part) => part.replace(/^["']|["']$/g, "").trim());
      const email = normalizeEmail(emailRaw);
      if (!email) {
        skipped += 1;
        continue;
      }
      if (!isValidEmail(email)) {
        throw new Error("Invalid subscriber email address.");
      }
      const existing = await Subscriber.findOne({ email });
      if (existing) {
        skipped += 1;
        continue;
      }
      await Subscriber.create({
        email,
        name: sanitizeText(nameRaw || "", 120),
        source: sanitizeText(sourceRaw || "csv-import", 80),
        isActive: true
      });
      inserted += 1;
    } catch (error) {
      skipped += 1;
      errors.push(error.message);
    }
  }

  return res.json({ ok: true, inserted, skipped, errors });
});

router.get("/subscribers", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const search = String(req.query.search || "").trim();
  const isActive = String(req.query.isActive || "").trim();
  const query = {};

  if (search) {
    const searchRegex = containsRegex(search);
    query.$or = [
      { email: searchRegex },
      { name: searchRegex }
    ];
  }
  if (isActive === "true") query.isActive = true;
  if (isActive === "false") query.isActive = false;

  const [items, total] = await Promise.all([
    Subscriber.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Subscriber.countDocuments(query)
  ]);

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

router.post("/subscribers", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: "A valid email is required." });
  }

  const existing = await Subscriber.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Subscriber with this email already exists." });
  }

  const subscriber = await Subscriber.create({
    email,
    name: sanitizeText(req.body?.name, 120),
    source: sanitizeText(req.body?.source || "manual", 80),
    isActive: req.body?.isActive !== false
  });

  return res.status(201).json(subscriber);
});

router.patch("/subscribers/:id/toggle", async (req, res) => {
  const subscriber = await Subscriber.findById(req.params.id);
  if (!subscriber) {
    return res.status(404).json({ message: "Subscriber not found." });
  }
  subscriber.isActive = !subscriber.isActive;
  await subscriber.save();
  return res.json({ ok: true, isActive: subscriber.isActive });
});

router.delete("/subscribers/:id", async (req, res) => {
  const subscriber = await Subscriber.findByIdAndDelete(req.params.id);
  if (!subscriber) {
    return res.status(404).json({ message: "Subscriber not found." });
  }
  return res.json({ ok: true });
});

module.exports = router;
