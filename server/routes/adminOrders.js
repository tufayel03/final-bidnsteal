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

function buildOrderUpdatePayload(body, options = {}) {
  const allowCustomerFields = options.allowCustomerFields !== false;
  const payload = {};

  if (body?.paymentStatus !== undefined) {
    const paymentStatus = normalizePaymentStatus(body.paymentStatus);
    if (!paymentStatus) {
      throw Object.assign(new Error("Invalid payment status."), { status: 400 });
    }
    payload.paymentStatus = paymentStatus;
  }

  if (body?.fulfillmentStatus !== undefined) {
    const fulfillmentStatus = normalizeFulfillmentStatus(body.fulfillmentStatus);
    if (!fulfillmentStatus) {
      throw Object.assign(new Error("Invalid fulfillment status."), { status: 400 });
    }
    payload.fulfillmentStatus = fulfillmentStatus;
  }

  if (allowCustomerFields && body?.customerNote !== undefined) {
    payload.customerNote = sanitizeText(body.customerNote, 1000);
  }

  if (allowCustomerFields && body?.shippingAddress && typeof body.shippingAddress === "object") {
    payload.shippingAddress = body.shippingAddress;
  }

  return payload;
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

async function applyOrderUpdate(order, payload = {}) {
  if (!order) return order;

  if (String(order.paymentStatus || "").toLowerCase() === "collected") {
    order.paymentStatus = "paid";
  }

  const previousFulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();

  if (Object.prototype.hasOwnProperty.call(payload, "paymentStatus")) {
    order.paymentStatus = payload.paymentStatus;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "fulfillmentStatus")) {
    order.fulfillmentStatus = payload.fulfillmentStatus;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "customerNote")) {
    order.customerNote = payload.customerNote;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "shippingAddress")) {
    order.shippingAddress = normalizeShippingAddress(payload.shippingAddress, order.shippingAddress || {});
  }

  const nextFulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();
  if (previousFulfillmentStatus !== "cancelled" && nextFulfillmentStatus === "cancelled") {
    await releaseInventoryForOrder(order);
  }
  if (previousFulfillmentStatus === "cancelled" && nextFulfillmentStatus !== "cancelled") {
    await reclaimInventoryForOrder(order);
  }

  await order.save();
  return order;
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

router.patch("/bulk/status", async (req, res) => {
  const orderIds = normalizeOrderIds(req.body?.orderIds);
  if (!orderIds.length) {
    return res.status(400).json({ message: "Select at least one valid order." });
  }

  let payload;
  try {
    payload = buildOrderUpdatePayload(req.body, { allowCustomerFields: false });
  } catch (error) {
    return res.status(Number(error?.status) || 400).json({ message: error.message || "Invalid order update." });
  }

  if (
    !Object.prototype.hasOwnProperty.call(payload, "paymentStatus") &&
    !Object.prototype.hasOwnProperty.call(payload, "fulfillmentStatus")
  ) {
    return res.status(400).json({ message: "Choose a payment status or fulfillment status to apply." });
  }

  const foundOrders = await Order.find({ _id: { $in: orderIds } });
  const byId = new Map(foundOrders.map((order) => [String(order._id), order]));

  const updatedOrders = [];
  const failed = [];

  for (const orderId of orderIds) {
    const order = byId.get(orderId);
    if (!order) {
      failed.push({ orderId, message: "Order not found." });
      continue;
    }

    try {
      await applyOrderUpdate(order, payload);
      updatedOrders.push(order);
    } catch (error) {
      failed.push({
        orderId,
        orderNumber: order.orderNumber || "",
        message: error.message || "Failed to update order."
      });
    }
  }

  return res.json({
    ok: failed.length === 0,
    updatedOrders,
    updatedCount: updatedOrders.length,
    failed,
    failedCount: failed.length
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

  let payload;
  try {
    payload = buildOrderUpdatePayload(req.body, { allowCustomerFields: true });
  } catch (error) {
    return res.status(Number(error?.status) || 400).json({ message: error.message || "Invalid order update." });
  }

  await applyOrderUpdate(order, payload);
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
