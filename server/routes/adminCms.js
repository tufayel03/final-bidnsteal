const mongoose = require("mongoose");
const express = require("express");
const Auction = require("../models/Auction");
const Campaign = require("../models/Campaign");
const CampaignDelivery = require("../models/CampaignDelivery");
const CampaignTemplate = require("../models/CampaignTemplate");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Subscriber = require("../models/Subscriber");
const User = require("../models/User");
const { env } = require("../config/env");
const { requireAdmin } = require("../middleware/auth");
const {
  getCheckoutSettings,
  sanitizeCheckoutSettingsForClient,
  saveCheckoutSettings
} = require("../services/checkoutSettingsService");
const {
  attachMediaTemplateContext,
  buildTransactionalEmailContext,
  createTransport,
  getSmtpSettings,
  renderTemplateString,
  sendEmail,
  sendTemplateEmail
} = require("../services/emailService");
const { syncAuctions } = require("../services/auctionService");
const { normalizeCampaignForAdmin, queueCampaignDispatch } = require("../services/campaignDispatchService");
const { normalizeSiteProfile } = require("../services/siteProfileService");
const {
  createSteadfastOrder,
  fetchSteadfastCustomerHistory,
  getCourierSettings,
  getSteadfastBalance,
  getSteadfastStatusByConsignmentId,
  normalizeDeliveryStatus,
  sanitizeCourierSettingsForClient,
  saveCourierSettings
} = require("../services/steadfastService");
const {
  ensureEmailTemplates,
  getSystemEmailTemplateDefinition,
  isSystemEmailTemplateKey,
  mergeEmailTemplates,
  normalizeEmailTemplateRecord
} = require("../services/emailTemplateService");
const { getSetting, setSetting } = require("../services/settingsService");
const { parsePagination } = require("../utils/http");
const { encryptSecret } = require("../utils/secrets");
const { isValidEmail, sanitizeText } = require("../utils/validation");

const router = express.Router();

function normalizeCouponProductIds(values) {
  const seen = new Set();
  return (Array.isArray(values) ? values : [])
    .map((value) => {
      if (value && typeof value === "object") {
        return String(value.id || value._id || "").trim();
      }
      return String(value || "").trim();
    })
    .filter((value) => {
      if (!value || !mongoose.Types.ObjectId.isValid(value) || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}

function serializeCouponForAdmin(coupon) {
  const json = coupon?.toJSON ? coupon.toJSON() : coupon;

  return {
    ...json,
    customerUsageMode: json?.customerUsageMode === "once" ? "once" : "multiple",
    productIds: normalizeCouponProductIds(json?.productIds),
    targetProducts: (Array.isArray(coupon?.productIds) ? coupon.productIds : [])
      .map((product) => {
        if (!product || typeof product !== "object") return null;
        const id = String(product.id || product._id || "").trim();
        if (!id) return null;
        return {
          id,
          title: String(product.title || "").trim() || "Untitled product",
          slug: String(product.slug || "").trim(),
          saleMode: String(product.saleMode || "fixed").trim() || "fixed"
        };
      })
      .filter(Boolean)
  };
}

function sanitizeSmtpSettingsForClient(value = {}) {
  return {
    enabled: Boolean(value.enabled),
    host: String(value.host || ""),
    port: Number(value.port || 465),
    secure: value.secure !== false,
    username: String(value.username || ""),
    hasPassword: Boolean(value.passwordEncrypted || value.hasPassword),
    passwordMasked: value.passwordEncrypted || value.hasPassword ? "********" : "",
    fromEmail: String(value.fromEmail || ""),
    fromName: String(value.fromName || ""),
    replyTo: String(value.replyTo || ""),
    ignoreTLS: Boolean(value.ignoreTLS)
  };
}

function normalizePhone(value) {
  return String(value || "").replace(/\D+/g, "");
}

function normalizeOrderIds(orderIds) {
  if (!Array.isArray(orderIds)) return [];

  const unique = [];
  const seen = new Set();

  for (const value of orderIds) {
    const orderId = String(value || "").trim();
    if (!orderId || seen.has(orderId) || !/^[a-f0-9]{24}$/i.test(orderId)) {
      continue;
    }
    seen.add(orderId);
    unique.push(orderId);
  }

  return unique;
}

function buildFulfillmentStatusFromCourier(deliveryStatus, currentStatus) {
  const normalized = normalizeDeliveryStatus(deliveryStatus);
  if (["delivered", "partial_delivered"].includes(normalized)) {
    return "delivered";
  }
  if (["cancelled", "returned", "hold", "pending_return"].includes(normalized)) {
    return "cancelled";
  }
  if (["in_transit", "transit", "picked_up", "pending_pickup"].includes(normalized)) {
    return currentStatus === "pending" ? "processing" : currentStatus;
  }
  return currentStatus;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderItemsTable(order, withImages = false) {
  return (order.items || [])
    .map((item) => {
      const title = escapeHtml(item.titleSnapshot || "Item");
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const subtotal = qty * unitPrice;
      const image = withImages && item.imageUrl
        ? `<td style="padding:8px;border:1px solid #ddd;"><img src="${escapeHtml(item.imageUrl)}" alt="" width="56" height="56" style="object-fit:cover;" /></td>`
        : "";
      return `<tr>${image}<td style="padding:8px;border:1px solid #ddd;">${title}</td><td style="padding:8px;border:1px solid #ddd;">${qty}</td><td style="padding:8px;border:1px solid #ddd;">BDT ${unitPrice}</td><td style="padding:8px;border:1px solid #ddd;">BDT ${subtotal}</td></tr>`;
    })
    .join("");
}

function formatFulfillmentStatusLabel(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "on_hold") return "On Hold";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

const ORDER_STATUS_EMAIL_CONFIG = {
  processing: {
    templateKey: "order-processing",
    fallbackSubject: (order) => `We are preparing order ${order.orderNumber}`,
    fallbackHtml: (order) => `<p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> is now being prepared.</p>`
  },
  on_hold: {
    templateKey: "order-on-hold",
    fallbackSubject: (order) => `Order ${order.orderNumber} is on hold`,
    fallbackHtml: (order) => `<p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> is currently on hold.</p>`
  },
  shipped: {
    templateKey: "order-shipped",
    fallbackSubject: (order) => `Order ${order.orderNumber} has shipped`,
    fallbackHtml: (order) => `<p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> is on the way.</p>`
  },
  cancelled: {
    templateKey: "order-cancelled",
    fallbackSubject: (order) => `Order ${order.orderNumber} has been cancelled`,
    fallbackHtml: (order) => `<p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> has been cancelled.</p>`
  }
};

async function notifyOrderStatusTransition(order, previousFulfillmentStatus = "") {
  const nextStatus = String(order?.fulfillmentStatus || "").trim().toLowerCase();
  if (!order || !nextStatus || nextStatus === String(previousFulfillmentStatus || "").trim().toLowerCase()) {
    return;
  }

  const config = ORDER_STATUS_EMAIL_CONFIG[nextStatus];
  if (!config || !isValidEmail(order.customerEmail)) {
    return;
  }

  const shippingAddress = order.shippingAddress || {};

  try {
    const context = await buildTransactionalEmailContext({
      customer: {
        name: order.customerName,
        email: order.customerEmail
      },
      order: {
        number: order.orderNumber,
        total: `BDT ${Number(order.total || 0)}`,
        status: nextStatus,
        fulfillment_label: formatFulfillmentStatusLabel(nextStatus),
        payment_status: order.paymentStatus,
        tracking_code: String(order.courier?.trackingCode || order.courier?.consignmentId || "").trim(),
        items_table: buildOrderItemsTable(order, false),
        items_table_with_images: buildOrderItemsTable(order, true)
      },
      shipping: {
        address: [
          shippingAddress.addressLine1,
          shippingAddress.addressLine2,
          shippingAddress.area,
          shippingAddress.city,
          shippingAddress.postalCode,
          shippingAddress.country
        ].filter(Boolean).join(", "),
        city: shippingAddress.city || ""
      }
    });

    await sendTemplateEmail({
      templateKey: config.templateKey,
      to: order.customerEmail,
      context,
      fallbackSubject: config.fallbackSubject(order),
      fallbackHtml: config.fallbackHtml(order)
    });
  } catch (error) {
    console.error(`[admin-cms] failed to send ${config.templateKey} email`, error);
  }
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeCampaignRateLimit(value) {
  const parsed = Math.max(0, Math.floor(Number(value || 0)));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function dispatchSteadfastOrder(order, options = {}) {
  if (!order) {
    throw Object.assign(new Error("Order not found."), { status: 404 });
  }

  const force = Boolean(options.force);
  if (order.courier?.consignmentId && !force) {
    throw Object.assign(new Error("Order is already sent to courier."), { status: 409, code: "already_sent" });
  }

  const result = await createSteadfastOrder(order);
  const previousFulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();
  order.courier = {
    ...(order.courier || {}),
    provider: "steadfast",
    trackingCode: result.trackingCode || order.courier?.trackingCode || null,
    consignmentId: result.consignmentId || order.courier?.consignmentId || null,
    statusCode: "created",
    deliveryStatus: result.deliveryStatus || "pending_pickup"
  };
  order.fulfillmentStatus = buildFulfillmentStatusFromCourier(order.courier.deliveryStatus, order.fulfillmentStatus);
  await order.save();
  await notifyOrderStatusTransition(order, previousFulfillmentStatus);
  return order;
}

function utcStartOfDay(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcEndOfDay(value) {
  const date = utcStartOfDay(value);
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
  return date;
}

function utcStartOfMonth(value) {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function utcEndOfMonth(value) {
  const date = utcStartOfMonth(value);
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCMilliseconds(date.getUTCMilliseconds() - 1);
  return date;
}

function addUtcDays(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date;
}

function addUtcMonths(value, months) {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + Number(months || 0));
  return date;
}

function formatRevenueDayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatRevenueMonthKey(value) {
  return new Date(value).toISOString().slice(0, 7);
}

function formatRevenueLabel(key, bucket) {
  if (bucket === "month") {
    const [year, month] = String(key || "").split("-").map((part) => Number(part || 0));
    const date = new Date(Date.UTC(year || 1970, Math.max(0, (month || 1) - 1), 1));
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }

  const [year, month, day] = String(key || "").split("-").map((part) => Number(part || 0));
  const date = new Date(Date.UTC(year || 1970, Math.max(0, (month || 1) - 1), day || 1));
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function resolveRevenueTelemetryWindow(query = {}) {
  const range = String(query.range || "7d").trim().toLowerCase();
  const today = utcStartOfDay(new Date());

  if (range === "7d") {
    return {
      range,
      bucket: "day",
      startDate: addUtcDays(today, -6),
      endDate: utcEndOfDay(today)
    };
  }

  if (range === "1m") {
    return {
      range,
      bucket: "day",
      startDate: addUtcDays(today, -29),
      endDate: utcEndOfDay(today)
    };
  }

  if (range === "6m") {
    return {
      range,
      bucket: "month",
      startDate: utcStartOfMonth(addUtcMonths(today, -5)),
      endDate: utcEndOfMonth(today)
    };
  }

  if (range === "12m") {
    return {
      range,
      bucket: "month",
      startDate: utcStartOfMonth(addUtcMonths(today, -11)),
      endDate: utcEndOfMonth(today)
    };
  }

  if (range === "custom") {
    const from = String(query.from || "").trim();
    const to = String(query.to || "").trim();
    if (!from || !to) {
      const error = new Error("Both from and to dates are required for a custom revenue range.");
      error.status = 400;
      throw error;
    }

    const rawStart = new Date(from);
    const rawEnd = new Date(to);
    if (Number.isNaN(rawStart.getTime()) || Number.isNaN(rawEnd.getTime())) {
      const error = new Error("Custom revenue dates are invalid.");
      error.status = 400;
      throw error;
    }

    const startDate = utcStartOfDay(rawStart);
    const endDate = utcEndOfDay(rawEnd);
    if (startDate > endDate) {
      const error = new Error("The revenue range start date must be before the end date.");
      error.status = 400;
      throw error;
    }

    const spanDays = Math.floor((utcStartOfDay(rawEnd) - utcStartOfDay(rawStart)) / 86_400_000) + 1;
    return {
      range,
      bucket: spanDays > 62 ? "month" : "day",
      startDate,
      endDate
    };
  }

  const error = new Error("Unsupported revenue range.");
  error.status = 400;
  throw error;
}

function buildRevenueTelemetrySeries(orders, startDate, endDate, bucket) {
  const totals = new Map();

  (orders || []).forEach((order) => {
    const createdAt = new Date(order.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return;
    }
    const key = bucket === "month" ? formatRevenueMonthKey(createdAt) : formatRevenueDayKey(createdAt);
    totals.set(key, roundMoney((totals.get(key) || 0) + Number(order.total || 0)));
  });

  const labels = [];
  const values = [];
  const keys = [];

  if (bucket === "month") {
    let cursor = utcStartOfMonth(startDate);
    const boundary = utcStartOfMonth(endDate);
    while (cursor <= boundary) {
      const key = formatRevenueMonthKey(cursor);
      keys.push(key);
      labels.push(formatRevenueLabel(key, "month"));
      values.push(roundMoney(totals.get(key) || 0));
      cursor = utcStartOfMonth(addUtcMonths(cursor, 1));
    }
  } else {
    let cursor = utcStartOfDay(startDate);
    const boundary = utcStartOfDay(endDate);
    while (cursor <= boundary) {
      const key = formatRevenueDayKey(cursor);
      keys.push(key);
      labels.push(formatRevenueLabel(key, "day"));
      values.push(roundMoney(totals.get(key) || 0));
      cursor = utcStartOfDay(addUtcDays(cursor, 1));
    }
  }

  return {
    keys,
    labels,
    values,
    total: roundMoney(values.reduce((sum, value) => sum + Number(value || 0), 0))
  };
}

async function buildReservationSnapshot() {
  await syncAuctions();

  const [auctions, orders] = await Promise.all([
    Auction.find({ status: "ended", winner: { $ne: null } }).populate("productId").sort({ endAt: -1 }),
    Order.find({ sourceAuctionId: { $ne: null } }).select("sourceAuctionId userId total orderNumber createdAt")
  ]);

  const ordersByAuctionId = new Map(
    orders
      .filter((order) => order.sourceAuctionId)
      .map((order) => [String(order.sourceAuctionId), order])
  );

  const active = [];
  const consumed = [];

  for (const auction of auctions) {
    const order = ordersByAuctionId.get(String(auction._id));
    const product = auction.productId;
    const entry = {
      id: `reservation-${auction.id}`,
      auctionId: auction.id,
      orderId: order?.id || "",
      orderNumber: order?.orderNumber || "",
      userId: String(order?.userId || auction.winner || ""),
      reservedAt: order?.createdAt || auction.endedAt || auction.endAt,
      total: roundMoney(order?.total || auction.currentPrice || auction.highestBid?.amount || auction.startingPrice),
      status: order ? "consumed" : "active",
      items: [
        {
          productId: product?.id || String(auction.productId || ""),
          title: product?.title || "Auction Lot",
          qty: 1,
          imageUrl: product?.images?.[0] || ""
        }
      ]
    };

    if (order) {
      consumed.push(entry);
    } else {
      active.push(entry);
    }
  }

  return { active, expired: [], consumed };
}

function buildWalletItems(snapshot, usersById) {
  const grouped = new Map();

  const touchWallet = (userId) => {
    const key = String(userId || "").trim() || "unknown";
    if (!grouped.has(key)) {
      const user = usersById.get(key);
      grouped.set(key, {
        id: `wallet-${key}`,
        userId: key,
        userName: user?.name || "",
        userEmail: user?.email || "",
        balance: 0,
        lockedBalance: 0
      });
    }
    return grouped.get(key);
  };

  for (const item of snapshot.active || []) {
    const wallet = touchWallet(item.userId);
    wallet.lockedBalance = roundMoney(wallet.lockedBalance + Number(item.total || 0));
  }

  for (const item of snapshot.consumed || []) {
    const wallet = touchWallet(item.userId);
    wallet.balance = roundMoney(wallet.balance + Number(item.total || 0));
  }

  return Array.from(grouped.values()).sort(
    (a, b) => (Number(b.lockedBalance || 0) + Number(b.balance || 0)) - (Number(a.lockedBalance || 0) + Number(a.balance || 0))
  );
}

async function buildTemplateContext() {
  const base = await buildTransactionalEmailContext({
    customer: {
      name: "Test Customer",
      email: env.adminEmail
    },
    order: {
      number: "TEST-ORDER-001",
      total: "BDT 0",
      status: "pending",
      fulfillment_label: "Pending",
      payment_status: "unpaid",
      tracking_code: "TRACK-0001",
      items_table: "<tr><td>Sample item</td><td>1</td><td>BDT 0</td></tr>",
      items_table_with_images: "<tr><td>Sample item</td><td>1</td><td>BDT 0</td></tr>"
    },
    shipping: {
      address: "Dhaka, Bangladesh",
      city: "Dhaka"
    },
    auction: {
      title: "Auction title",
      amount: "BDT 0",
      url: ""
    },
    product: {
      title: "Product title"
    }
  });

  return {
    ...base,
    auth: {
      ...base.auth,
      reset_link: base.site.url
        ? `${base.site.url}/reset-password?token=sample`
        : "/reset-password?token=sample"
    },
    auction: {
      ...base.auction,
      url: base.site.url ? `${base.site.url}/auction/sample-lot` : "/auction/sample-lot"
    }
  };
}

async function buildCampaignPreviewContext() {
  const templateContext = await buildTemplateContext();
  return {
    ...templateContext,
    subscriber: {
      name: "Collector One",
      email: templateContext.support?.email || env.adminEmail
    }
  };
}

router.use(requireAdmin);

router.get("/site-profile", async (_req, res) => {
  return res.json(normalizeSiteProfile(await getSetting("siteProfile", {})));
});

router.put("/site-profile", async (req, res) => {
  const current = normalizeSiteProfile(await getSetting("siteProfile", {}));
  const next = normalizeSiteProfile({
    ...current,
    ...(req.body || {})
  });

  if (next.supportEmail && !isValidEmail(next.supportEmail)) {
    return res.status(400).json({ message: "Support email must be a valid email address." });
  }

  const rawSiteUrl = String(req.body?.siteUrl || "").trim();
  if (rawSiteUrl && !next.siteUrl) {
    return res.status(400).json({ message: "Site URL must be a valid http or https URL." });
  }

  const rawLogoUrl = String(req.body?.logoUrl || "").trim();
  if (rawLogoUrl && !next.logoUrl) {
    return res.status(400).json({ message: "Logo URL must be a valid uploaded asset path or http/https URL." });
  }

  const saved = await setSetting("siteProfile", next);
  return res.json(normalizeSiteProfile(saved));
});

router.get("/campaigns/templates", async (req, res) => {
  const limit = Math.max(1, Number(req.query.limit || 100));
  const items = await CampaignTemplate.find().sort({ createdAt: -1 }).limit(limit);
  return res.json({ items, total: items.length });
});

router.post("/campaigns/templates", async (req, res) => {
  const template = await CampaignTemplate.create({
    key: String(req.body?.key || req.body?.name || `template-${Date.now()}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
    name: String(req.body?.name || "").trim(),
    subject: String(req.body?.subject || "").trim(),
    html: String(req.body?.html || "")
  });
  return res.status(201).json(template);
});

router.patch("/campaigns/templates/:id", async (req, res) => {
  const template = await CampaignTemplate.findByIdAndUpdate(
    req.params.id,
    {
      name: String(req.body?.name || "").trim(),
      subject: String(req.body?.subject || "").trim(),
      html: String(req.body?.html || "")
    },
    { new: true }
  );
  if (!template) {
    return res.status(404).json({ message: "Template not found." });
  }
  return res.json(template);
});

router.delete("/campaigns/templates/:id", async (req, res) => {
  const template = await CampaignTemplate.findByIdAndDelete(req.params.id);
  if (!template) {
    return res.status(404).json({ message: "Template not found." });
  }
  return res.json({ ok: true });
});

router.get("/campaigns", async (_req, res) => {
  const items = await Campaign.find().sort({ createdAt: -1 });
  return res.json({ items: items.map((item) => normalizeCampaignForAdmin(item)), total: items.length });
});

router.post("/campaigns", async (req, res) => {
  const campaign = await Campaign.create({
    subject: String(req.body?.subject || "").trim(),
    html: String(req.body?.html || ""),
    hourlyRateLimit: normalizeCampaignRateLimit(req.body?.hourlyRateLimit),
    dailyRateLimit: normalizeCampaignRateLimit(req.body?.dailyRateLimit)
  });
  return res.status(201).json(normalizeCampaignForAdmin(campaign));
});

router.post("/campaigns/preview", async (req, res) => {
  const subject = String(req.body?.subject || "").trim();
  const html = String(req.body?.html || "");
  if (!subject && !html.trim()) {
    return res.status(400).json({ message: "Campaign subject or HTML is required for preview." });
  }

  const context = await attachMediaTemplateContext(await buildCampaignPreviewContext());
  return res.json({
    subjectTemplate: subject,
    htmlTemplate: html,
    subject: renderTemplateString(subject || "", context),
    html: renderTemplateString(html || "", context),
    context
  });
});

router.post("/campaigns/:id/send", async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found." });
  }

  const result = await queueCampaignDispatch(campaign);
  return res.json({
    ok: true,
    queued: result.queued,
    intervalMs: result.intervalMs,
    intervalMinutes: result.intervalMs ? Number((result.intervalMs / 60000).toFixed(2)) : 0,
    campaign: result.campaign
  });
});

router.post("/campaigns/:id/resend-non-openers", async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found." });
  }

  const result = await queueCampaignDispatch(campaign, { force: true });
  return res.json({
    ok: true,
    queued: result.queued,
    intervalMs: result.intervalMs,
    intervalMinutes: result.intervalMs ? Number((result.intervalMs / 60000).toFixed(2)) : 0,
    campaign: result.campaign
  });
});

router.delete("/campaigns/:id", async (req, res) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);
  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found." });
  }
  await CampaignDelivery.deleteMany({ campaignId: campaign._id });
  return res.json({ ok: true });
});

router.get("/coupons", async (req, res) => {
  const query = {};
  if (req.query.isActive === "true") query.isActive = true;
  if (req.query.isActive === "false") query.isActive = false;
  const items = await Coupon.find(query).populate("productIds", "title slug saleMode").sort({ createdAt: -1 });
  return res.json({ items: items.map((coupon) => serializeCouponForAdmin(coupon)), total: items.length });
});

router.post("/coupons", async (req, res) => {
  const coupon = await Coupon.create({
    code: String(req.body?.code || "").trim().toUpperCase(),
    type: req.body?.type === "fixed" ? "fixed" : "percent",
    value: Number(req.body?.value || 0),
    maxUses: Number(req.body?.maxUses || 0),
    expiresAt: req.body?.expiresAt ? new Date(req.body.expiresAt) : null,
    minOrderAmount: Number(req.body?.minOrderAmount || 0),
    appliesTo: ["store", "auction", "both"].includes(req.body?.appliesTo) ? req.body.appliesTo : "both",
    customerUsageMode: req.body?.customerUsageMode === "once" ? "once" : "multiple",
    productIds: normalizeCouponProductIds(req.body?.productIds),
    isActive: req.body?.isActive !== false
  });
  await coupon.populate("productIds", "title slug saleMode");
  return res.status(201).json(serializeCouponForAdmin(coupon));
});

router.patch("/coupons/:id", async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).populate("productIds", "title slug saleMode");
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found." });
  }
  if (req.body?.code !== undefined) coupon.code = String(req.body.code).trim().toUpperCase();
  if (req.body?.type !== undefined) coupon.type = req.body.type === "fixed" ? "fixed" : "percent";
  if (req.body?.value !== undefined) coupon.value = Number(req.body.value || 0);
  if (req.body?.maxUses !== undefined) coupon.maxUses = Number(req.body.maxUses || 0);
  if (req.body?.expiresAt !== undefined) coupon.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
  if (req.body?.minOrderAmount !== undefined) coupon.minOrderAmount = Number(req.body.minOrderAmount || 0);
  if (req.body?.appliesTo !== undefined) coupon.appliesTo = req.body.appliesTo;
  if (req.body?.customerUsageMode !== undefined) coupon.customerUsageMode = req.body.customerUsageMode === "once" ? "once" : "multiple";
  if (req.body?.productIds !== undefined) coupon.productIds = normalizeCouponProductIds(req.body.productIds);
  if (req.body?.isActive !== undefined) coupon.isActive = Boolean(req.body.isActive);
  await coupon.save();
  await coupon.populate("productIds", "title slug saleMode");
  return res.json(serializeCouponForAdmin(coupon));
});

router.delete("/coupons/:id", async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found." });
  }
  return res.json({ ok: true });
});

router.get("/financial/summary", async (_req, res) => {
  const [orders, customerCount, endedAuctions, reservations] = await Promise.all([
    Order.find().sort({ createdAt: 1 }),
    User.countDocuments({ role: "customer" }),
    Auction.find({ status: "ended" }).select("startingPrice currentPrice highestBid winner"),
    buildReservationSnapshot()
  ]);
  let gmv = 0;
  const monthlyMap = new Map();
  orders.forEach((order) => {
    const total = Number(order.total || 0);
    gmv += total;
    const month = new Date(order.createdAt).toISOString().slice(0, 7);
    const current = monthlyMap.get(month) || { month, orders: 0, gmv: 0, netRevenue: 0, fees: 0 };
    current.orders += 1;
    current.gmv += total;
    current.netRevenue += total * 0.95;
    current.fees += total * 0.05;
    monthlyMap.set(month, current);
  });

  const customersWithOrders = new Set(
    orders
      .map((order) => String(order.userId || order.customerEmail || "").trim())
      .filter(Boolean)
  ).size;
  const conversionRate = customerCount
    ? roundMoney((customersWithOrders / customerCount) * 100)
    : 0;

  const upliftValues = endedAuctions
    .map((auction) => {
      const startingPrice = Number(auction.startingPrice || 0);
      const finalPrice = Number(auction.highestBid?.amount || auction.currentPrice || 0);
      if (startingPrice <= 0 || finalPrice < startingPrice) {
        return 0;
      }
      return ((finalPrice - startingPrice) / startingPrice) * 100;
    });
  const avgAuctionUplift = upliftValues.length
    ? roundMoney(upliftValues.reduce((sum, value) => sum + value, 0) / upliftValues.length)
    : 0;

  const lockedBalance = roundMoney(
    (reservations.active || []).reduce((sum, item) => sum + Number(item.total || 0), 0)
  );
  const settledBalance = roundMoney(
    (reservations.consumed || []).reduce((sum, item) => sum + Number(item.total || 0), 0)
  );

  return res.json({
    gmv,
    netRevenue: gmv * 0.95,
    feesCollected: gmv * 0.05,
    conversionRate,
    avgAuctionUplift,
    walletBalances: { total: roundMoney(lockedBalance + settledBalance), locked: lockedBalance },
    monthlyReport: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))
  });
});

router.get("/financial/revenue-telemetry", async (req, res) => {
  const { range, bucket, startDate, endDate } = resolveRevenueTelemetryWindow(req.query);
  const orders = await Order.find({
    createdAt: {
      $gte: startDate,
      $lte: endDate
    }
  })
    .select("createdAt total")
    .sort({ createdAt: 1 })
    .lean();

  const series = buildRevenueTelemetrySeries(orders, startDate, endDate, bucket);
  return res.json({
    range,
    bucket,
    from: startDate.toISOString(),
    to: endDate.toISOString(),
    ...series
  });
});

router.get("/wallets", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const reservations = await buildReservationSnapshot();
  const userIds = Array.from(
    new Set(
      [...(reservations.active || []), ...(reservations.consumed || [])]
        .map((item) => String(item.userId || "").trim())
        .filter(Boolean)
    )
  );

  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name email")
    : [];
  const usersById = new Map(users.map((user) => [String(user._id), { name: user.name, email: user.email }]));
  const items = buildWalletItems(reservations, usersById);
  const pagedItems = items.slice(skip, skip + limit);

  return res.json({
    items: pagedItems,
    total: items.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(items.length / limit))
  });
});

router.get("/reservations", async (_req, res) => {
  return res.json(await buildReservationSnapshot());
});

router.get("/disputes", async (req, res) => {
  const value = await getSetting("disputes", []);
  const items = String(req.query.status || "")
    ? value.filter((item) => item.status === req.query.status)
    : value;
  return res.json({
    items,
    total: items.length,
    page: 1,
    limit: Number(req.query.limit || 50),
    totalPages: 1
  });
});

router.patch("/disputes/:id", async (req, res) => {
  const value = await getSetting("disputes", []);
  const next = value.map((item) => (item.id === req.params.id ? { ...item, ...req.body } : item));
  await setSetting("disputes", next);
  return res.json(next.find((item) => item.id === req.params.id) || { id: req.params.id, ...req.body });
});

router.get("/email-templates", async (_req, res) => {
  const items = await ensureEmailTemplates();
  return res.json({ items });
});

router.post("/email-templates", async (req, res) => {
  const items = await ensureEmailTemplates();
  const key = String(req.body?.key || "").trim();
  if (!key) {
    return res.status(400).json({ message: "Template key is required." });
  }

  const systemDefinition = getSystemEmailTemplateDefinition(key);
  const template = normalizeEmailTemplateRecord({
    ...(systemDefinition || {}),
    key,
    label: systemDefinition?.label || req.body?.label,
    description: systemDefinition?.description || req.body?.description,
    subjectTemplate: String(req.body?.subjectTemplate || systemDefinition?.subjectTemplate || ""),
    htmlTemplate: String(req.body?.htmlTemplate || systemDefinition?.htmlTemplate || ""),
    isActive: systemDefinition ? true : req.body?.isActive !== false,
    isSystem: Boolean(systemDefinition),
    isDeletable: systemDefinition ? false : true
  });

  const existingIndex = items.findIndex((item) => item.key === template.key);
  if (existingIndex >= 0) items[existingIndex] = template;
  else items.push(template);
  await setSetting("emailTemplates", mergeEmailTemplates(items));
  return res.status(201).json(template);
});

router.get("/email-templates/transport/smtp", async (_req, res) => {
  const smtp = await getSmtpSettings();
  return res.json(sanitizeSmtpSettingsForClient(smtp));
});

router.put("/email-templates/transport/smtp", async (req, res) => {
  const current = await getSmtpSettings();
  const next = {
    enabled: Boolean(req.body?.enabled),
    host: sanitizeText(req.body?.host, 255),
    port: Number(req.body?.port || 465),
    secure: req.body?.secure !== false,
    username: sanitizeText(req.body?.username, 255),
    passwordEncrypted: req.body?.password ? encryptSecret(req.body.password) : current.passwordEncrypted || "",
    hasPassword: Boolean(req.body?.password || current.passwordEncrypted || current.hasPassword),
    passwordMasked: req.body?.password || current.passwordEncrypted || current.hasPassword ? "********" : "",
    fromEmail: sanitizeText(req.body?.fromEmail, 255),
    fromName: sanitizeText(req.body?.fromName, 120),
    replyTo: sanitizeText(req.body?.replyTo, 255),
    ignoreTLS: Boolean(req.body?.ignoreTLS)
  };
  if (next.enabled) {
    if (!next.host || !next.username || !next.fromEmail) {
      return res.status(400).json({ message: "SMTP host, username, and from email are required when SMTP is enabled." });
    }
    if (!isValidEmail(next.fromEmail)) {
      return res.status(400).json({ message: "From email must be a valid email address." });
    }
    if (next.replyTo && !isValidEmail(next.replyTo)) {
      return res.status(400).json({ message: "Reply-to email must be valid." });
    }
    if (!next.passwordEncrypted) {
      return res.status(400).json({ message: "SMTP password is required when SMTP is enabled." });
    }
  }
  await setSetting("smtp", next);
  return res.json(sanitizeSmtpSettingsForClient(next));
});

router.post("/email-templates/transport/smtp/test", async (req, res) => {
  const to = sanitizeText(req.body?.to, 255);
  if (!to || !isValidEmail(to)) {
    return res.status(400).json({ message: "Enter a valid recipient email address." });
  }
  const transport = await createTransport();
  await transport.verify();
  await sendEmail({
    to,
    subject: "BidnSteal SMTP test",
    html: "<p>Your BidnSteal SMTP configuration is working.</p>"
  });
  return res.json({ ok: true, message: `SMTP test email sent to ${to}` });
});

router.get("/email-templates/:key", async (req, res) => {
  const items = await ensureEmailTemplates();
  const template = items.find((item) => item.key === req.params.key);
  if (!template) {
    return res.status(404).json({ message: "Template not found." });
  }
  return res.json(template);
});

router.put("/email-templates/:key", async (req, res) => {
  const items = await ensureEmailTemplates();
  const systemDefinition = getSystemEmailTemplateDefinition(req.params.key);
  const existingTemplate = items.find((item) => item.key === req.params.key) || {};
  const template = normalizeEmailTemplateRecord({
    ...(systemDefinition || {}),
    ...existingTemplate,
    key: req.params.key,
    label: systemDefinition?.label || existingTemplate.label,
    description: systemDefinition?.description || existingTemplate.description,
    subjectTemplate: String(req.body?.subjectTemplate || ""),
    htmlTemplate: String(req.body?.htmlTemplate || ""),
    isActive: systemDefinition ? true : req.body?.isActive !== false,
    isSystem: Boolean(systemDefinition || existingTemplate.isSystem),
    isDeletable: systemDefinition ? false : existingTemplate.isDeletable !== false
  });

  const existingIndex = items.findIndex((item) => item.key === req.params.key);
  if (existingIndex >= 0) items[existingIndex] = template;
  else items.push(template);
  await setSetting("emailTemplates", mergeEmailTemplates(items));
  return res.json(template);
});

router.delete("/email-templates/:key", async (req, res) => {
  const items = await ensureEmailTemplates();
  if (isSystemEmailTemplateKey(req.params.key)) {
    return res.status(403).json({ message: "System templates cannot be deleted." });
  }

  const nextItems = items.filter((item) => String(item?.key || "").trim() !== String(req.params.key || "").trim());

  if (nextItems.length === items.length) {
    return res.status(404).json({ message: "Template not found." });
  }

  await setSetting("emailTemplates", mergeEmailTemplates(nextItems));
  return res.json({ ok: true, key: req.params.key });
});

router.post("/email-templates/:key/preview", async (req, res) => {
  const items = await ensureEmailTemplates();
  const template = items.find((item) => item.key === req.params.key);
  if (!template) {
    return res.status(404).json({ message: "Template not found." });
  }
  const context = await attachMediaTemplateContext(await buildTemplateContext());
  return res.json({
    subjectTemplate: template.subjectTemplate,
    htmlTemplate: template.htmlTemplate,
    subject: renderTemplateString(template.subjectTemplate || "", context),
    html: renderTemplateString(template.htmlTemplate || "", context),
    context
  });
});

router.post("/email-templates/:key/test-send", async (req, res) => {
  const to = sanitizeText(req.body?.email, 255);
  if (!to || !isValidEmail(to)) {
    return res.status(400).json({ message: "Enter a valid recipient email address." });
  }
  const context = await buildTemplateContext();
  context.customer = {
    ...context.customer,
    email: to
  };

  await sendTemplateEmail({
    templateKey: req.params.key,
    to,
    context,
    fallbackSubject: `${context.site.name} template test: ${req.params.key}`,
    fallbackHtml: `<p>This is a ${sanitizeText(context.site.name, 120)} template test email.</p>`
  });

  return res.json({ ok: true, message: `Template test email sent to ${to}` });
});

router.get("/courier/steadfast/settings", async (_req, res) => {
  const value = await getCourierSettings();
  return res.json(sanitizeCourierSettingsForClient(value));
});

router.get("/checkout/settings", async (_req, res) => {
  const value = await getCheckoutSettings();
  return res.json(sanitizeCheckoutSettingsForClient(value));
});

router.put("/checkout/settings", async (req, res) => {
  const deliveryChargeDhaka = Number(req.body?.deliveryChargeDhaka ?? 0);
  const deliveryChargeOutsideDhaka = Number(req.body?.deliveryChargeOutsideDhaka ?? 0);

  if (!Number.isFinite(deliveryChargeDhaka) || deliveryChargeDhaka < 0) {
    return res.status(400).json({ message: "Dhaka delivery charge must be a valid non-negative amount." });
  }

  if (!Number.isFinite(deliveryChargeOutsideDhaka) || deliveryChargeOutsideDhaka < 0) {
    return res.status(400).json({ message: "Outside Dhaka delivery charge must be a valid non-negative amount." });
  }

  const saved = await saveCheckoutSettings({
    allowGuestOrder: Boolean(req.body?.allowGuestOrder),
    deliveryChargeDhaka,
    deliveryChargeOutsideDhaka
  });

  return res.json(sanitizeCheckoutSettingsForClient(saved));
});

router.put("/courier/steadfast/settings", async (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  const apiKey = sanitizeText(req.body?.apiKey, 255);
  const secretKey = sanitizeText(req.body?.secretKey, 255);
  const fraudCheckerEmail = sanitizeText(req.body?.fraudCheckerEmail, 255);

  if (enabled && !apiKey) {
    return res.status(400).json({ message: "Courier API key is required when delivery sync is enabled." });
  }

  const current = await getCourierSettings();
  if (enabled && !secretKey && !(current.secretKeyEncrypted || current.hasSecret)) {
    return res.status(400).json({ message: "Courier secret key is required when delivery sync is enabled." });
  }

  if (fraudCheckerEmail && !isValidEmail(fraudCheckerEmail)) {
    return res.status(400).json({ message: "Fraud checker email must be a valid email address." });
  }

  const saved = await saveCourierSettings({
    enabled,
    baseUrl: sanitizeText(req.body?.baseUrl, 255),
    apiKey,
    secretKey,
    fraudCheckerEnabled: Boolean(req.body?.fraudCheckerEnabled),
    fraudCheckerEmail,
    fraudCheckerPassword: sanitizeText(req.body?.fraudCheckerPassword, 255),
    defaultDeliveryType: Number(req.body?.defaultDeliveryType || 0) === 1 ? 1 : 0,
    defaultItemDescription: sanitizeText(req.body?.defaultItemDescription, 255)
  });

  return res.json(sanitizeCourierSettingsForClient(saved));
});

router.get("/courier/steadfast/balance", async (_req, res) => {
  const balance = await getSteadfastBalance();
  return res.json(balance);
});

router.post("/courier/steadfast/orders/bulk-create", async (req, res) => {
  const orderIds = normalizeOrderIds(req.body?.orderIds);
  if (!orderIds.length) {
    return res.status(400).json({ message: "Select at least one valid order." });
  }

  const force = Boolean(req.body?.force);
  const foundOrders = await Order.find({ _id: { $in: orderIds } });
  const byId = new Map(foundOrders.map((order) => [String(order._id), order]));

  const updatedOrders = [];
  const conflicts = [];
  const failed = [];

  for (const orderId of orderIds) {
    const order = byId.get(orderId);
    if (!order) {
      failed.push({ orderId, message: "Order not found." });
      continue;
    }

    try {
      const updated = await dispatchSteadfastOrder(order, { force });
      updatedOrders.push(updated);
    } catch (error) {
      if (Number(error?.status) === 409) {
        conflicts.push({
          orderId,
          orderNumber: order.orderNumber || "",
          message: error.message || "Order is already sent to courier."
        });
        continue;
      }

      failed.push({
        orderId,
        orderNumber: order.orderNumber || "",
        message: error.message || "Failed to send order to courier."
      });
    }
  }

  return res.json({
    ok: failed.length === 0 && conflicts.length === 0,
    message:
      updatedOrders.length && !failed.length && !conflicts.length
        ? `Sent ${updatedOrders.length} order(s) to courier.`
        : "Bulk courier dispatch completed.",
    updatedOrders,
    updatedCount: updatedOrders.length,
    conflicts,
    conflictCount: conflicts.length,
    failed,
    failedCount: failed.length
  });
});

router.post("/courier/steadfast/orders/:id/create", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  const force = Boolean(req.body?.force);

  try {
    await dispatchSteadfastOrder(order, { force });
  } catch (error) {
    if (Number(error?.status) === 409) {
      return res.status(409).json({ message: error.message || "Order is already sent to courier.", order });
    }
    throw error;
  }

  return res.json({
    ok: true,
    message: `Order ${order.orderNumber} sent to courier.`,
    trackingCode: order.courier.trackingCode,
    consignmentId: order.courier.consignmentId,
    deliveryStatus: order.courier.deliveryStatus,
    order
  });
});

router.post("/courier/steadfast/orders/:id/sync-status", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  if (!order.courier?.consignmentId) {
    return res.status(400).json({ message: "Order has not been sent to courier yet." });
  }

  const result = await getSteadfastStatusByConsignmentId(order.courier.consignmentId);
  const previousFulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();
  order.courier = {
    ...(order.courier || {}),
    provider: "steadfast",
    statusCode: result.deliveryStatus || order.courier?.statusCode || "unknown",
    deliveryStatus: result.deliveryStatus || order.courier?.deliveryStatus || "unknown"
  };
  order.fulfillmentStatus = buildFulfillmentStatusFromCourier(order.courier.deliveryStatus, order.fulfillmentStatus);
  await order.save();
  await notifyOrderStatusTransition(order, previousFulfillmentStatus);
  return res.json({
    ok: true,
    deliveryStatus: order.courier.deliveryStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    order
  });
});

async function loadCustomerSuccessRate(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  const phoneNumber = normalizePhone(order.shippingAddress?.phone || "");
  if (!phoneNumber) {
    return res.json({
      phoneNumber: "",
      totalOrders: 0,
      totalDelivered: 0,
      totalCancelled: 0,
      successRatio: 0,
      hasFraudHistory: false,
      fraudCount: 0
    });
  }
  const snapshot = await fetchSteadfastCustomerHistory(phoneNumber);
  return res.json(snapshot);
}

router.get(
  [
    "/courier/steadfast/orders/:id/customer-success-rate",
    "/courier/steadfast/orders/:id/check-score",
    "/courier/steadfast/orders/:id/checkscore",
    "/courier/steadfast/orders/:id/score",
    "/courier/orders/:id/customer-success-rate",
    "/courier/orders/:id/check-score",
    "/courier/orders/:id/checkscore",
    "/courier/orders/:id/score"
  ],
  loadCustomerSuccessRate
);

module.exports = router;
