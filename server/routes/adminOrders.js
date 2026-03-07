const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { requireAdmin } = require("../middleware/auth");
const { parsePagination } = require("../utils/http");
const { normalizeShippingAddress, sanitizeText } = require("../utils/validation");

const router = express.Router();

function normalizePaymentStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "collected") return "paid";
  if (["unpaid", "paid", "refunded"].includes(normalized)) return normalized;
  return "";
}

function normalizeFulfillmentStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pending", "processing", "shipped", "delivered", "cancelled"].includes(normalized)) {
    return normalized;
  }
  return "";
}

function fixedInventoryItems(order) {
  const grouped = new Map();

  for (const item of order?.items || []) {
    if (!item?.productId) continue;
    if (String(item.type || "").toLowerCase() === "auction") continue;

    const qty = Math.max(1, Number(item.qty || 0));
    const productId = String(item.productId);
    grouped.set(productId, (grouped.get(productId) || 0) + qty);
  }

  return [...grouped.entries()].map(([productId, qty]) => ({ productId, qty }));
}

async function releaseInventoryForOrder(order) {
  if (!order || order.inventoryReleasedAt) return;

  for (const item of fixedInventoryItems(order)) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
  }

  order.inventoryReleasedAt = new Date();
}

async function reclaimInventoryForOrder(order) {
  if (!order?.inventoryReleasedAt) return;

  const reserved = [];

  try {
    for (const item of fixedInventoryItems(order)) {
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.qty } },
        { $inc: { stock: -item.qty } },
        { new: true }
      );

      if (!product) {
        throw Object.assign(new Error("Unable to reactivate this order because one or more items are out of stock."), { status: 400 });
      }

      reserved.push(item);
    }
  } catch (error) {
    for (const item of reserved.reverse()) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
    }
    throw error;
  }

  order.inventoryReleasedAt = null;
}

function shouldReleaseInventoryOnDelete(order) {
  if (!order || order.inventoryReleasedAt) return false;
  return !["shipped", "delivered"].includes(String(order.fulfillmentStatus || "").toLowerCase());
}

router.use(requireAdmin);

router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const query = {};

  if (req.query.status) {
    const fulfillmentStatus = normalizeFulfillmentStatus(req.query.status);
    if (fulfillmentStatus) {
      query.fulfillmentStatus = fulfillmentStatus;
    }
  }
  if (req.query.paymentStatus) {
    const paymentStatus = normalizePaymentStatus(req.query.paymentStatus);
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
  }

  const [items, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(query)
  ]);

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

router.get("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }
  return res.json(order);
});

router.patch("/:id/status", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  if (String(order.paymentStatus || "").toLowerCase() === "collected") {
    order.paymentStatus = "paid";
  }

  const previousFulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();

  if (req.body?.paymentStatus !== undefined) {
    const paymentStatus = normalizePaymentStatus(req.body.paymentStatus);
    if (!paymentStatus) {
      return res.status(400).json({ message: "Invalid payment status." });
    }
    order.paymentStatus = paymentStatus;
  }
  if (req.body?.fulfillmentStatus !== undefined) {
    const fulfillmentStatus = normalizeFulfillmentStatus(req.body.fulfillmentStatus);
    if (!fulfillmentStatus) {
      return res.status(400).json({ message: "Invalid fulfillment status." });
    }
    order.fulfillmentStatus = fulfillmentStatus;
  }
  if (req.body?.customerNote !== undefined) {
    order.customerNote = sanitizeText(req.body.customerNote, 1000);
  }
  if (req.body?.shippingAddress && typeof req.body.shippingAddress === "object") {
    order.shippingAddress = normalizeShippingAddress(req.body.shippingAddress, order.shippingAddress || {});
  }

  const nextFulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();
  if (previousFulfillmentStatus !== "cancelled" && nextFulfillmentStatus === "cancelled") {
    await releaseInventoryForOrder(order);
  }
  if (previousFulfillmentStatus === "cancelled" && nextFulfillmentStatus !== "cancelled") {
    await reclaimInventoryForOrder(order);
  }

  await order.save();
  return res.json(order);
});

router.delete("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  if (shouldReleaseInventoryOnDelete(order)) {
    await releaseInventoryForOrder(order);
  }

  await order.deleteOne();
  return res.json({ ok: true });
});

module.exports = router;
