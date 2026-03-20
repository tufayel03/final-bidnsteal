const bcrypt = require("bcryptjs");
const express = require("express");
const mongoose = require("mongoose");
const Auction = require("../models/Auction");
const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Subscriber = require("../models/Subscriber");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { trackAuctionViewer } = require("../services/auctionAudienceService");
const { createAuctionWinnerOrder, syncAuctionStatus, syncAuctions, toPublicAuction, toPublicProduct } = require("../services/auctionService");
const { getCheckoutSettings, resolveDeliveryCharge } = require("../services/checkoutSettingsService");
const { buildTransactionalEmailContext, sendTemplateEmail } = require("../services/emailService");
const { getPublicSiteProfile } = require("../services/siteProfileService");
const { containsRegex } = require("../utils/http");
const { makeOrderNumber } = require("../utils/orderNumbers");
const { hasRequiredShippingAddress, isValidEmail, normalizeEmail, normalizeShippingAddress, passwordStrengthError, sanitizeText } = require("../utils/validation");

const router = express.Router();
let transactionSupportCache = null;

function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

function withSession(query, session) {
  return session ? query.session(session) : query;
}

async function deleteOrderById(orderId, session) {
  if (!orderId) return;
  const query = Order.deleteOne({ _id: orderId });
  if (session) {
    await query.session(session);
    return;
  }
  await query;
}

async function supportsTransactions() {
  if (transactionSupportCache !== null) {
    return transactionSupportCache;
  }

  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionSupportCache = Boolean(hello?.setName || hello?.msg === "isdbgrid");
  } catch {
    transactionSupportCache = false;
  }

  return transactionSupportCache;
}

async function findProduct(identifier, options = {}) {
  const lookup = String(identifier || "").trim();
  if (!lookup) return null;
  const session = options.session;

  if (isObjectId(lookup)) {
    const byId = await withSession(Product.findById(lookup), session);
    if (byId) return byId;
  }

  return withSession(Product.findOne({ slug: lookup }), session);
}

function buildProductLookup(identifier) {
  const lookup = String(identifier || "").trim();
  if (!lookup) return null;
  return isObjectId(lookup) ? { _id: lookup } : { slug: lookup };
}

async function reserveProductStock(identifier, qty, session) {
  const lookup = buildProductLookup(identifier);
  if (!lookup) return null;

  return withSession(
    Product.findOneAndUpdate(
      {
        ...lookup,
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        stock: { $gte: qty }
      },
      { $inc: { stock: -qty } },
      { new: true }
    ),
    session
  );
}

async function rollbackReservedStock(productId, qty) {
  if (!productId || !qty) return;
  await Product.updateOne({ _id: productId }, { $inc: { stock: Math.max(1, Number(qty || 0)) } });
}

async function incrementCouponUsage(coupon, session) {
  const query = {
    _id: coupon._id,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }]
  };
  if (coupon.maxUses) {
    query.usedCount = { $lt: coupon.maxUses };
  }

  return withSession(
    Coupon.findOneAndUpdate(query, { $inc: { usedCount: 1 } }, { new: true }),
    session
  );
}

function getCouponCustomerUsageMode(coupon) {
  return String(coupon?.customerUsageMode || "").trim().toLowerCase() === "once" ? "once" : "multiple";
}

async function hasCustomerUsedCoupon(coupon, { user = null, customerEmail = "" } = {}, session = null) {
  if (getCouponCustomerUsageMode(coupon) !== "once") {
    return false;
  }

  const normalizedCouponCode = sanitizeText(coupon?.code, 64).toUpperCase();
  const normalizedCustomerEmail = normalizeEmail(customerEmail || user?.email || "");
  const identityQueries = [];

  if (user?._id) {
    identityQueries.push({ userId: user._id });
  }
  if (normalizedCustomerEmail) {
    identityQueries.push({ customerEmail: normalizedCustomerEmail });
  }
  if (!normalizedCouponCode || !identityQueries.length) {
    return false;
  }

  const existingOrder = await withSession(
    Order.exists({
      couponCode: normalizedCouponCode,
      $or: identityQueries
    }),
    session
  );

  return Boolean(existingOrder);
}

async function assertCouponCustomerEligible(coupon, context = {}, session = null) {
  if (await hasCustomerUsedCoupon(coupon, context, session)) {
    throw Object.assign(new Error("This coupon can only be used once per customer."), { status: 400 });
  }
}

async function rollbackCouponUsage(couponId) {
  if (!couponId) return;
  await Coupon.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

async function findAuction(identifier) {
  const lookup = String(identifier || "").trim();
  if (!lookup) return null;

  if (isObjectId(lookup)) {
    const byId = await Auction.findById(lookup).populate("productId");
    if (byId) return byId;
  }

  const product = await Product.findOne({ slug: lookup });
  if (!product) return null;
  return Auction.findOne({ productId: product._id }).populate("productId");
}

function buildOrderSummary(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod || "cod",
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    subtotal: Number(order.subtotal || 0),
    shippingFee: Number(order.shippingFee || 0),
    discount: Number(order.discount || 0),
    total: order.total,
    createdAt: order.createdAt,
    customerNote: order.customerNote || "",
    items: order.items || [],
    shippingAddress: order.shippingAddress || {}
  };
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

function formatMoneyLabel(value) {
  return `BDT ${Number(value || 0)}`;
}

function formatFulfillmentStatusLabel(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized === "on_hold") return "On Hold";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function buildAuctionDetailUrl(siteUrl, auction, product) {
  const identifier = encodeURIComponent(String(product?.slug || auction?.id || auction?._id || "").trim());
  return siteUrl ? `${siteUrl}/auction/${identifier}` : `/auction/${identifier}`;
}

async function notifyOutbidBidder({ auction, product, previousHighestBid, currentBidAmount, currentBidder } = {}) {
  const previousHighestEmail = normalizeEmail(previousHighestBid?.bidderEmail || "");
  const currentBidderEmail = normalizeEmail(currentBidder?.email || "");

  if (!previousHighestEmail || !isValidEmail(previousHighestEmail) || previousHighestEmail === currentBidderEmail) {
    return;
  }

  try {
    const context = await buildTransactionalEmailContext({
      customer: {
        name: previousHighestBid?.bidderName || "Bidder",
        email: previousHighestEmail
      },
      auction: {
        title: product?.title || "Auction lot",
        amount: formatMoneyLabel(currentBidAmount || 0),
        url: ""
      },
      product: {
        title: product?.title || "Auction lot"
      }
    });

    const auctionUrl = buildAuctionDetailUrl(context.site.url, auction, product);

    await sendTemplateEmail({
      templateKey: "auction-outbid",
      to: previousHighestEmail,
      context: {
        ...context,
        auction: {
          ...context.auction,
          url: auctionUrl
        }
      },
      fallbackSubject: `You were outbid on ${product?.title || "an auction lot"}`,
      fallbackHtml: `<p>Hello ${escapeHtml(previousHighestBid?.bidderName || "there")},</p><p>Another bidder placed a higher offer on <strong>${escapeHtml(product?.title || "this lot")}</strong>.</p><p>Current bid: <strong>${formatMoneyLabel(currentBidAmount || 0)}</strong></p><p><a href="${auctionUrl}">View auction</a></p>`
    });
  } catch (error) {
    console.error("[store] failed to send auction outbid email", error);
  }
}

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
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}

function calculateItemsSubtotal(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (total, item) => total + Number(item.unitPrice || 0) * Number(item.qty || 0),
    0
  );
}

function calculateCouponEligibleSubtotal(coupon, items, fallbackSubtotal = 0) {
  const scope = String(coupon?.appliesTo || "both").trim().toLowerCase();
  if (scope === "auction") {
    return 0;
  }

  const normalizedItems = Array.isArray(items) ? items : [];
  if (!normalizedItems.length) {
    return Number(fallbackSubtotal || 0);
  }

  const targetedProductIds = new Set(normalizeCouponProductIds(coupon?.productIds));
  return normalizedItems.reduce((total, item) => {
    if (String(item?.type || "fixed").trim().toLowerCase() !== "fixed") {
      return total;
    }

    const productId = String(item?.productId || "").trim();
    if (targetedProductIds.size > 0 && !targetedProductIds.has(productId)) {
      return total;
    }

    return total + Number(item.unitPrice || 0) * Number(item.qty || 0);
  }, 0);
}

function calculateCouponDiscount(coupon, eligibleSubtotal) {
  const subtotal = Math.max(0, Number(eligibleSubtotal || 0));
  if (subtotal <= 0) {
    return 0;
  }

  return coupon.type === "percent"
    ? Number(((subtotal * coupon.value) / 100).toFixed(2))
    : Math.min(subtotal, Number(coupon.value || 0));
}

function assertCouponEligibleForStore(coupon, items = [], fallbackSubtotal = 0) {
  const targetedProductIds = normalizeCouponProductIds(coupon?.productIds);
  const scope = String(coupon?.appliesTo || "both").trim().toLowerCase();

  if (scope === "auction") {
    throw Object.assign(new Error("Coupon is not available for store checkout."), { status: 400 });
  }

  if (targetedProductIds.length > 0 && (!Array.isArray(items) || !items.length)) {
    throw Object.assign(new Error("Cart items are required to validate this coupon."), { status: 400 });
  }

  const eligibleSubtotal = calculateCouponEligibleSubtotal(coupon, items, fallbackSubtotal);
  if (eligibleSubtotal <= 0) {
    throw Object.assign(new Error("Coupon does not apply to items in your cart."), { status: 400 });
  }

  if (eligibleSubtotal < Number(coupon.minOrderAmount || 0)) {
    const message = targetedProductIds.length > 0
      ? "Selected products do not meet coupon requirements."
      : "Order total does not meet coupon requirements.";
    throw Object.assign(new Error(message), { status: 400 });
  }

  return {
    eligibleSubtotal,
    discount: calculateCouponDiscount(coupon, eligibleSubtotal)
  };
}

async function buildCouponValidationItems(items) {
  const normalizedItems = [];

  for (const item of Array.isArray(items) ? items : []) {
    const qty = Number(item?.qty || 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 25) {
      throw Object.assign(new Error("Item quantity must be a whole number."), { status: 400 });
    }

    const product = await findProduct(item?.productId || item?.id || item?.slug);
    if (!product) {
      throw Object.assign(new Error("One or more products no longer exist."), { status: 404 });
    }

    normalizedItems.push({
      productId: String(product._id || ""),
      qty,
      unitPrice: Number(product.price || 0),
      type: String(product.saleMode || "fixed").trim().toLowerCase() === "fixed" ? "fixed" : "auction"
    });
  }

  return normalizedItems;
}

async function createStoreOrder({
  items,
  shippingAddress,
  customerNote,
  couponCode,
  user = null,
  customerEmail = "",
  shippingFee = 0,
  session = null
}) {
  const touchedProducts = [];
  let coupon = null;
  let couponUsageApplied = false;
  let order = null;

  try {
    const normalizedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const qty = Number(item.qty || 1);
      if (!Number.isInteger(qty) || qty < 1 || qty > 25) {
        throw Object.assign(new Error("Item quantity must be a whole number."), { status: 400 });
      }

      const product = await reserveProductStock(item.productId || item.id || item.slug, qty, session);
      if (!product) {
        const existingProduct = await findProduct(item.productId || item.id || item.slug, { session });
        if (!existingProduct) {
          throw Object.assign(new Error("One or more products no longer exist."), { status: 404 });
        }
        throw Object.assign(new Error(`${existingProduct.title} does not have enough stock.`), { status: 400 });
      }

      if (String(product.saleMode || "").toLowerCase() !== "fixed") {
        throw Object.assign(new Error(`${product.title} must be purchased through the auction page.`), { status: 400 });
      }

      touchedProducts.push({
        productId: product._id,
        qty
      });

      subtotal += Number(product.price || 0) * qty;
      normalizedItems.push({
        productId: product._id,
        titleSnapshot: product.title,
        slugSnapshot: product.slug,
        qty,
        unitPrice: product.price,
        type: "fixed",
        imageUrl: product.images?.[0] || ""
      });
    }

    const normalizedCustomerName = sanitizeText(
      shippingAddress.fullName || user?.name || "",
      120
    );
    const normalizedCustomerEmail = normalizeEmail(customerEmail || user?.email || "");
    const normalizedShippingFee = roundMoney(shippingFee);

    if (!normalizedCustomerName) {
      throw Object.assign(new Error("Customer name is required."), { status: 400 });
    }
    if (!normalizedCustomerEmail || !isValidEmail(normalizedCustomerEmail)) {
      throw Object.assign(new Error("A valid customer email is required."), { status: 400 });
    }

    let discount = 0;
    if (couponCode) {
      coupon = await withSession(Coupon.findOne({ code: couponCode, isActive: true }), session);
      if (!coupon) {
        throw Object.assign(new Error("Coupon not found."), { status: 404 });
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        throw Object.assign(new Error("Coupon has expired."), { status: 400 });
      }
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw Object.assign(new Error("Coupon usage limit reached."), { status: 400 });
      }

      await assertCouponCustomerEligible(coupon, { user, customerEmail: normalizedCustomerEmail }, session);
      discount = assertCouponEligibleForStore(coupon, normalizedItems, subtotal).discount;
    }

    if (coupon) {
      const couponAfterIncrement = await incrementCouponUsage(coupon, session);
      if (!couponAfterIncrement) {
        throw Object.assign(new Error("Coupon usage limit reached."), { status: 400 });
      }
      coupon = couponAfterIncrement;
      couponUsageApplied = true;
    }

    const orderPayload = {
      orderNumber: await makeOrderNumber(),
      userId: user?._id || null,
      customerName: normalizedCustomerName,
      customerEmail: normalizedCustomerEmail,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      fulfillmentStatus: "pending",
      customerNote,
      couponCode,
      subtotal,
      shippingFee: normalizedShippingFee,
      discount,
      total: Math.max(0, Number((subtotal + normalizedShippingFee - discount).toFixed(2))),
      items: normalizedItems,
      shippingAddress
    };

    if (session) {
      const [created] = await Order.create([orderPayload], { session });
      order = created;
    } else {
      order = await Order.create(orderPayload);
    }

    return order;
  } catch (error) {
    if (!session) {
      for (const entry of touchedProducts.reverse()) {
        try {
          await rollbackReservedStock(entry.productId, entry.qty);
        } catch (rollbackError) {
          console.error("[store] product stock rollback failed", rollbackError);
        }
      }

      if (coupon && couponUsageApplied) {
        try {
          await rollbackCouponUsage(coupon._id);
        } catch (rollbackError) {
          console.error("[store] coupon rollback failed", rollbackError);
        }
      }

      if (order?._id) {
        try {
          await deleteOrderById(order._id);
        } catch (rollbackError) {
          console.error("[store] order rollback failed", rollbackError);
        }
      }
    }

    throw error;
  }
}

router.get("/products", async (req, res) => {
  const query = {
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    saleMode: "fixed"
  };

  const search = String(req.query.search || "").trim();
  const category = String(req.query.category || "").trim();

  if (search) {
    const searchRegex = containsRegex(search);
    query.$and = [
      {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { sku: searchRegex }
        ]
      }
    ];
  }
  if (category) query.category = category;
  if (req.query.featured === "true") query.isFeatured = true;

  const products = await Product.find(query).sort({ isFeatured: -1, createdAt: -1 });
  return res.json(products.map((product) => toPublicProduct(product)));
});

router.get("/products/:identifier", async (req, res) => {
  const product = await findProduct(req.params.identifier);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }
  return res.json(toPublicProduct(product));
});

router.get("/site-profile", async (_req, res) => {
  return res.json(await getPublicSiteProfile());
});

router.get("/auctions", async (req, res) => {
  await syncAuctions();
  const status = String(req.query.status || "").toUpperCase();
  const auctions = await Auction.find().populate("productId").sort({ createdAt: -1 });

  const mapped = auctions
    .filter((auction) => {
      const publicStatus = auction.status === "live" ? "LIVE" : auction.status === "ended" ? "ENDED" : "UPCOMING";
      return !status || status === "ALL" ? true : publicStatus === status;
    })
    .map((auction) => toPublicAuction(auction, auction.productId));

  return res.json(mapped);
});

router.get("/auctions/:identifier", async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  await syncAuctionStatus(auction);
  await auction.populate("productId");
  await trackAuctionViewer(req, auction);

  return res.json(toPublicAuction(auction, auction.productId, req.user?.id || ""));
});

router.post("/auctions/:identifier/bids", requireAuth, async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  await syncAuctionStatus(auction);
  if (auction.status !== "live") {
    return res.status(400).json({ message: "This auction is not live." });
  }

  const amount = Number(req.body?.amount || 0);
  const minimum = Number(auction.currentPrice || auction.startingPrice || 0) + Number(auction.minIncrement || 1);
  if (!Number.isFinite(amount) || amount < minimum) {
    return res.status(400).json({ message: `Bid must be at least ${minimum}.` });
  }

  const previousHighestBid = auction.highestBid?.bidderEmail
    ? {
        bidderId: auction.highestBid.bidderId || null,
        bidderName: auction.highestBid.bidderName || "",
        bidderEmail: auction.highestBid.bidderEmail || "",
        amount: Number(auction.highestBid.amount || 0),
        at: auction.highestBid.at || null
      }
    : null;

  auction.bids.push({
    bidderId: req.user._id,
    bidderName: req.user.name,
    bidderEmail: req.user.email,
    amount,
    createdAt: new Date()
  });
  auction.currentPrice = amount;
  auction.totalBids = auction.bids.length;
  auction.lastBidAt = new Date();
  auction.highestBid = {
    bidderId: req.user._id,
    bidderName: req.user.name,
    bidderEmail: req.user.email,
    amount,
    at: new Date()
  };
  auction.reservePriceReached = auction.reservePrice ? amount >= auction.reservePrice : false;
  await auction.save();
  await auction.populate("productId");
  await notifyOutbidBidder({
    auction,
    product: auction.productId,
    previousHighestBid,
    currentBidAmount: amount,
    currentBidder: req.user
  });

  return res.status(201).json(toPublicAuction(auction, auction.productId, req.user.id));
});

router.post("/auctions/:identifier/buy-now", requireAuth, async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  await syncAuctionStatus(auction);
  if (auction.status === "ended") {
    return res.status(400).json({ message: "This auction has already ended." });
  }
  if (!auction.buyNowPrice) {
    return res.status(400).json({ message: "Buy now is not available for this auction." });
  }

  if (!hasRequiredShippingAddress(normalizeShippingAddress(req.user.shippingAddress || {}))) {
    return res.status(400).json({ message: "Complete your shipping details before buying this auction." });
  }

  const endedAt = new Date();
  const updatedAuction = await Auction.findOneAndUpdate(
    { _id: auction._id, status: { $ne: "ended" } },
    {
      $set: {
        status: "ended",
        endedAt,
        currentPrice: auction.buyNowPrice,
        highestBid: {
          bidderId: req.user._id,
          bidderName: req.user.name,
          bidderEmail: req.user.email,
          amount: auction.buyNowPrice,
          at: endedAt
        },
        winner: req.user._id
      }
    },
    { new: true }
  );
  if (!updatedAuction) {
    return res.status(409).json({ message: "This auction has already been completed." });
  }

  await syncAuctionStatus(updatedAuction);

  const order = await createAuctionWinnerOrder(updatedAuction, req.user);
  return res.json({ ok: true, order: buildOrderSummary(order) });
});

router.post("/auctions/:identifier/claim", requireAuth, async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  await syncAuctionStatus(auction);
  if (auction.status !== "ended") {
    return res.status(400).json({ message: "This auction has not ended yet." });
  }

  const highestAmount = Number(
    auction.highestBid?.amount ||
      auction.currentPrice ||
      [...(auction.bids || [])].reduce((max, bid) => Math.max(max, Number(bid.amount || 0)), 0)
  );
  const highestBidderId = String(auction.highestBid?.bidderId || auction.winner || "");
  const userMaxBid = [...(auction.bids || [])]
    .filter(
      (bid) =>
        String(bid.bidderId || "") === String(req.user._id) ||
        String(bid.bidderEmail || "").toLowerCase() === String(req.user.email || "").toLowerCase()
    )
    .reduce((max, bid) => Math.max(max, Number(bid.amount || 0)), 0);

  const userIsHighestBidder = highestBidderId
    ? highestBidderId === String(req.user._id)
    : userMaxBid > 0 && userMaxBid === highestAmount;

  if (!userIsHighestBidder) {
    return res.status(403).json({ message: "Only the winning bidder can claim this auction." });
  }

  if (!hasRequiredShippingAddress(normalizeShippingAddress(req.user.shippingAddress || {}))) {
    return res.status(400).json({ message: "Complete your shipping details before claiming this auction." });
  }

  if (!auction.winner) {
    auction.winner = req.user._id;
    await auction.save();
    await syncAuctionStatus(auction);
  }

  const order = await createAuctionWinnerOrder(auction, req.user);
  return res.json({ ok: true, order: buildOrderSummary(order) });
});

router.post("/coupons/validate", async (req, res) => {
  const code = sanitizeText(req.body?.code, 64).toUpperCase();
  const subtotal = Number(req.body?.subtotal || 0);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const customerEmail = normalizeEmail(req.body?.customerEmail || req.body?.email || req.user?.email || "");
  if (!code) {
    return res.status(400).json({ message: "Coupon code is required." });
  }
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ message: "Subtotal must be a valid amount." });
  }
  const coupon = await Coupon.findOne({ code, isActive: true });
  if (!coupon) {
    return res.status(404).json({ message: "Coupon not found." });
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ message: "Coupon has expired." });
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ message: "Coupon usage limit reached." });
  }
  try {
    await assertCouponCustomerEligible(coupon, { user: req.user || null, customerEmail });
    const normalizedItems = items.length ? await buildCouponValidationItems(items) : [];
    const { discount } = assertCouponEligibleForStore(
      coupon,
      normalizedItems,
      items.length ? calculateItemsSubtotal(normalizedItems) : subtotal
    );

    return res.json({
      code: coupon.code,
      discount
    });
  } catch (error) {
    return res.status(error?.status || 400).json({ message: error?.message || "Unable to validate coupon." });
  }
});

router.post("/subscribers", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const name = sanitizeText(req.body?.name, 120);
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  const subscriber = await Subscriber.findOneAndUpdate(
    { email },
    { email, name, source: "storefront", isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(201).json({ id: subscriber.id, email: subscriber.email, name: subscriber.name });
});

router.post("/orders", async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const currentUser = req.user || null;
  const checkoutSettings = await getCheckoutSettings();
  const shippingAddress = normalizeShippingAddress(
    req.body?.shippingAddress || {},
    currentUser?.shippingAddress || {}
  );
  const customerNote = sanitizeText(req.body?.customerNote, 1000);
  const couponCode = sanitizeText(req.body?.couponCode, 64).toUpperCase();
  const customerEmail = currentUser
    ? normalizeEmail(currentUser.email)
    : normalizeEmail(
        req.body?.customerEmail || req.body?.email || req.body?.shippingAddress?.email || ""
      );

  if (!items.length) {
    return res.status(400).json({ message: "At least one item is required." });
  }
  if (items.length > 25) {
    return res.status(400).json({ message: "Too many items in a single order." });
  }
  if (!currentUser && !checkoutSettings.allowGuestOrder) {
    return res.status(403).json({ message: "Guest checkout is currently disabled." });
  }
  if (!hasRequiredShippingAddress(shippingAddress)) {
    return res.status(400).json({ message: "Complete shipping details are required." });
  }
  if (!currentUser && (!customerEmail || !isValidEmail(customerEmail))) {
    return res.status(400).json({ message: "A valid customer email is required for guest checkout." });
  }

  const shippingFee = resolveDeliveryCharge(shippingAddress, checkoutSettings);

  const useTransactions = await supportsTransactions();
  const dbSession = useTransactions ? await mongoose.startSession() : null;

  try {
    let order = null;

    if (dbSession) {
      await dbSession.withTransaction(async () => {
        order = await createStoreOrder({
          items,
          shippingAddress,
          customerNote,
          couponCode,
          user: currentUser,
          customerEmail,
          shippingFee,
          session: dbSession
        });
      });
    } else {
      order = await createStoreOrder({
        items,
        shippingAddress,
        customerNote,
        couponCode,
        user: currentUser,
        customerEmail,
        shippingFee
      });
    }

    try {
      const context = await buildTransactionalEmailContext({
        customer: {
          name: order.customerName,
          email: order.customerEmail
        },
        order: {
          number: order.orderNumber,
          total: formatMoneyLabel(order.total || 0),
          status: order.fulfillmentStatus,
          fulfillment_label: formatFulfillmentStatusLabel(order.fulfillmentStatus),
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
          city: shippingAddress.city
        }
      });

      await sendTemplateEmail({
        templateKey: "order-confirmation",
        to: order.customerEmail,
        context,
        fallbackSubject: `Your order ${order.orderNumber} is confirmed`,
        fallbackHtml: `<p>Thanks for ordering from ${escapeHtml(context.site.name || "BidnSteal")}.</p><p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> is confirmed.</p>`
      });
    } catch (error) {
      console.error("[store] failed to send order confirmation email", error);
    }

    return res.status(201).json(buildOrderSummary(order));
  } catch (error) {
    const status = Number(error?.status || 500);
    return res.status(status).json({ message: error.message || "Unable to place order." });
  } finally {
    if (dbSession) {
      await dbSession.endSession();
    }
  }
});

router.get("/orders/my", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  return res.json(orders.map((order) => buildOrderSummary(order)));
});

router.get("/users/me/activity", requireAuth, async (req, res) => {
  const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  const auctions = await Auction.find({
    $or: [
      { "bids.bidderId": req.user._id },
      { "bids.bidderEmail": req.user.email },
      { winner: req.user._id }
    ]
  }).populate("productId");

  return res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || "",
      shippingAddress: req.user.shippingAddress || {}
    },
    orders: orders.map((order) => buildOrderSummary(order)),
    auctions: auctions.map((auction) => toPublicAuction(auction, auction.productId, req.user.id))
  });
});

router.patch("/users/me/profile", requireAuth, async (req, res) => {
  const nextName = sanitizeText(req.body?.name || req.user.name, 120);
  if (!nextName) {
    return res.status(400).json({ message: "Name is required." });
  }
  req.user.name = nextName;
  req.user.phone = sanitizeText(req.body?.phone || req.user.phone || "", 40);
  await req.user.save();
  return res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    phone: req.user.phone || "",
    shippingAddress: req.user.shippingAddress || {}
  });
});

router.patch("/users/me/password", requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || "");
  const nextPassword = String(req.body?.nextPassword || "");
  if (!currentPassword || !nextPassword) {
    return res.status(400).json({ message: "Current and new passwords are required." });
  }
  const passwordError = passwordStrengthError(nextPassword);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const user = await User.findById(req.user._id).select("+passwordHash");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(400).json({ message: "Current password is incorrect." });
  }

  user.passwordHash = await bcrypt.hash(nextPassword, 10);
  user.passwordResetToken = "";
  user.passwordResetExpiresAt = null;
  await user.save();
  return res.json({ ok: true });
});

router.patch("/users/me/shipping", requireAuth, async (req, res) => {
  req.user.shippingAddress = normalizeShippingAddress(req.body || {}, req.user.shippingAddress || {});
  if (!hasRequiredShippingAddress(req.user.shippingAddress)) {
    return res.status(400).json({ message: "Complete shipping details are required." });
  }
  await req.user.save();
  return res.json(req.user.shippingAddress);
});

module.exports = router;
