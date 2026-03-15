const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { requireAdmin } = require("../middleware/auth");
const { parsePagination } = require("../utils/http");
const { makeOrderNumber } = require("../utils/orderNumbers");
const {
  hasRequiredShippingAddress,
  isValidEmail,
  normalizeEmail,
  normalizeShippingAddress,
  sanitizeText
} = require("../utils/validation");

const router = express.Router();
const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;

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
    if (!orderId || seen.has(orderId) || !OBJECT_ID_PATTERN.test(orderId)) {
      continue;
    }
    seen.add(orderId);
    unique.push(orderId);
  }

  return unique;
}

function moneyError(fieldName) {
  return `${fieldName} must be a valid non-negative amount.`;
}

function normalizeMoneyValue(value, fieldName) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw Object.assign(new Error(moneyError(fieldName)), { status: 400 });
  }
  return Number(amount.toFixed(2));
}

function normalizeOrderItemType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "auction" ? "auction" : "fixed";
}

function computeOrderSubtotal(items = []) {
  return Number(
    items.reduce((sum, item) => {
      const qty = Number(item?.qty || 0);
      const unitPrice = Number(item?.unitPrice || 0);
      return sum + (qty * unitPrice);
    }, 0).toFixed(2)
  );
}

function fixedInventoryItemsFromItems(items) {
  const grouped = new Map();

  for (const item of items || []) {
    if (!item?.productId) continue;
    if (String(item.type || "").toLowerCase() === "auction") continue;

    const qty = Math.max(1, Number(item.qty || 0));
    const productId = String(item.productId);
    grouped.set(productId, (grouped.get(productId) || 0) + qty);
  }

  return [...grouped.entries()].map(([productId, qty]) => ({ productId, qty }));
}

async function normalizeOrderItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw Object.assign(new Error("Order must include at least one product."), { status: 400 });
  }

  const normalizedItems = [];

  for (const [index, rawItem] of items.entries()) {
    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
    const itemNumber = index + 1;
    const productId = String(item.productId || "").trim();
    if (!productId || !OBJECT_ID_PATTERN.test(productId)) {
      throw Object.assign(new Error(`Line ${itemNumber} is missing a valid product.`), { status: 400 });
    }

    const product = await Product.findById(productId).select("title slug price stock images saleMode deletedAt");
    if (!product || product.deletedAt) {
      throw Object.assign(new Error(`Line ${itemNumber} references a product that no longer exists.`), { status: 404 });
    }

    const type = normalizeOrderItemType(item.type || product.saleMode || "fixed");
    if (type === "fixed" && String(product.saleMode || "").toLowerCase() === "auction") {
      throw Object.assign(new Error(`${product.title} can only be purchased through auction.`), { status: 400 });
    }

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
      throw Object.assign(new Error(`Line ${itemNumber} quantity must be a whole number between 1 and 999.`), { status: 400 });
    }

    const unitPrice = normalizeMoneyValue(item.unitPrice, `Line ${itemNumber} unit price`);
    const titleSnapshot = sanitizeText(item.titleSnapshot || product.title, 180) || product.title;
    const slugSnapshot = sanitizeText(item.slugSnapshot || product.slug, 180) || product.slug;
    const imageUrl = sanitizeText(item.imageUrl || product.images?.[0] || "", 2048);
    const auctionId = String(item.auctionId || "").trim();

    normalizedItems.push({
      productId: product._id,
      auctionId: auctionId && OBJECT_ID_PATTERN.test(auctionId) ? auctionId : null,
      titleSnapshot,
      slugSnapshot,
      qty,
      unitPrice,
      type,
      imageUrl
    });
  }

  return normalizedItems;
}

async function buildOrderUpdatePayload(body, options = {}) {
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

  if (allowCustomerFields && body?.shippingFee !== undefined) {
    payload.shippingFee = normalizeMoneyValue(body.shippingFee, "Shipping fee");
  }

  if (allowCustomerFields && body?.discount !== undefined) {
    payload.discount = normalizeMoneyValue(body.discount, "Discount");
  }

  if (allowCustomerFields && body?.items !== undefined) {
    payload.items = await normalizeOrderItems(body.items);
  }

  return payload;
}

function fixedInventoryItems(order) {
  return fixedInventoryItemsFromItems(order?.items || []);
}

async function reserveProductInventory(productId, qty, options = {}) {
  const amount = Math.max(0, Number(qty || 0));
  if (!amount) return null;

  const allowNegativeStock = options.allowNegativeStock !== false;
  const missingMessage = options.missingMessage || "Unable to save order items because one or more products no longer exist.";
  const outOfStockMessage = options.outOfStockMessage || "Unable to save order items because one or more products are out of stock.";
  const product = allowNegativeStock
    ? await Product.findByIdAndUpdate(
      productId,
      { $inc: { stock: -amount } },
      { new: true }
    )
    : await Product.findOneAndUpdate(
      { _id: productId, stock: { $gte: amount } },
      { $inc: { stock: -amount } },
      { new: true }
    );

  if (product) return product;

  const exists = await Product.exists({ _id: productId });
  if (!exists) {
    throw Object.assign(new Error(missingMessage), { status: 404 });
  }

  throw Object.assign(new Error(outOfStockMessage), { status: 400 });
}

async function adjustInventoryForEditedItems(order, nextItems) {
  if (!order || order.inventoryReleasedAt) return;

  const previousItems = fixedInventoryItems(order);
  const nextFixedItems = fixedInventoryItemsFromItems(nextItems);
  const previousMap = new Map(previousItems.map((item) => [item.productId, item.qty]));
  const nextMap = new Map(nextFixedItems.map((item) => [item.productId, item.qty]));
  const productIds = new Set([...previousMap.keys(), ...nextMap.keys()]);
  const increases = [];
  const decreases = [];

  for (const productId of productIds) {
    const previousQty = Number(previousMap.get(productId) || 0);
    const nextQty = Number(nextMap.get(productId) || 0);
    if (nextQty > previousQty) {
      increases.push({ productId, qty: nextQty - previousQty });
    } else if (previousQty > nextQty) {
      decreases.push({ productId, qty: previousQty - nextQty });
    }
  }

  const reserved = [];

  try {
    for (const item of increases) {
      await reserveProductInventory(item.productId, item.qty, { allowNegativeStock: true });
      reserved.push(item);
    }
  } catch (error) {
    for (const item of reserved.reverse()) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
    }
    throw error;
  }

  for (const item of decreases) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
  }
}

async function releaseInventoryForOrder(order) {
  if (!order || order.inventoryReleasedAt) return;

  for (const item of fixedInventoryItems(order)) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
  }

  order.inventoryReleasedAt = new Date();
}

async function releaseInventoryForItems(order, items) {
  if (!order || order.inventoryReleasedAt) return;

  for (const item of fixedInventoryItemsFromItems(items)) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
  }

  order.inventoryReleasedAt = new Date();
}

async function reclaimInventoryForOrder(order) {
  if (!order?.inventoryReleasedAt) return;

  const reserved = [];

  try {
    for (const item of fixedInventoryItems(order)) {
      await reserveProductInventory(item.productId, item.qty, {
        allowNegativeStock: true,
        missingMessage: "Unable to reactivate this order because one or more products no longer exist.",
        outOfStockMessage: "Unable to reactivate this order because one or more items are out of stock."
      });
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
  const nextRequestedFulfillmentStatus = Object.prototype.hasOwnProperty.call(payload, "fulfillmentStatus")
    ? String(payload.fulfillmentStatus || "").toLowerCase()
    : previousFulfillmentStatus;
  const shouldCancelOrder = previousFulfillmentStatus !== "cancelled" && nextRequestedFulfillmentStatus === "cancelled";
  const shouldReactivateOrder = previousFulfillmentStatus === "cancelled" && nextRequestedFulfillmentStatus !== "cancelled";
  const previousItemsSnapshot = Array.isArray(order.items) ? order.items.map((item) => ({ ...item })) : [];

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
    if (order.shippingAddress.fullName) {
      order.customerName = order.shippingAddress.fullName;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "items")) {
    if (!shouldCancelOrder && !shouldReactivateOrder) {
      await adjustInventoryForEditedItems(order, payload.items);
    }
    order.items = payload.items;
    order.subtotal = computeOrderSubtotal(payload.items);
  }

  if (Object.prototype.hasOwnProperty.call(payload, "shippingFee")) {
    order.shippingFee = payload.shippingFee;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "discount")) {
    order.discount = payload.discount;
  }

  order.total = Math.max(0, Number((Number(order.subtotal || 0) + Number(order.shippingFee || 0) - Number(order.discount || 0)).toFixed(2)));

  const nextFulfillmentStatus = String(order.fulfillmentStatus || "").toLowerCase();
  if (previousFulfillmentStatus !== "cancelled" && nextFulfillmentStatus === "cancelled") {
    await releaseInventoryForItems(order, previousItemsSnapshot);
  }
  if (previousFulfillmentStatus === "cancelled" && nextFulfillmentStatus !== "cancelled") {
    await reclaimInventoryForOrder(order);
  }

  await order.save();
  return order;
}

async function createAdminOrder(body = {}) {
  const payload = await buildOrderUpdatePayload(body, { allowCustomerFields: true });
  if (!Array.isArray(payload.items) || !payload.items.length) {
    throw Object.assign(new Error("Order must include at least one product."), { status: 400 });
  }

  const rawUserId = String(body?.userId || "").trim();
  if (rawUserId && !OBJECT_ID_PATTERN.test(rawUserId)) {
    throw Object.assign(new Error("Selected user is invalid."), { status: 400 });
  }

  const user = rawUserId
    ? await User.findById(rawUserId).select("name email phone shippingAddress")
    : null;
  if (rawUserId && !user) {
    throw Object.assign(new Error("Selected user no longer exists."), { status: 404 });
  }

  const shippingAddress = normalizeShippingAddress(payload.shippingAddress || {}, user?.shippingAddress || {});
  const customerName = sanitizeText(
    body?.customerName || shippingAddress.fullName || user?.name,
    120
  );
  const customerEmail = normalizeEmail(body?.customerEmail || user?.email || "");

  if (!customerName) {
    throw Object.assign(new Error("Customer name is required."), { status: 400 });
  }
  if (!customerEmail || !isValidEmail(customerEmail)) {
    throw Object.assign(new Error("A valid customer email is required."), { status: 400 });
  }

  shippingAddress.fullName = sanitizeText(shippingAddress.fullName || customerName, 120);
  shippingAddress.phone = sanitizeText(shippingAddress.phone || user?.phone, 40);

  if (!hasRequiredShippingAddress(shippingAddress)) {
    throw Object.assign(new Error("Complete shipping details are required."), { status: 400 });
  }

  const subtotal = computeOrderSubtotal(payload.items);
  const shippingFee = Object.prototype.hasOwnProperty.call(payload, "shippingFee") ? payload.shippingFee : 0;
  const discount = Object.prototype.hasOwnProperty.call(payload, "discount") ? payload.discount : 0;
  const fulfillmentStatus = payload.fulfillmentStatus || "pending";
  const inventoryReleasedAt = fulfillmentStatus === "cancelled" ? new Date() : null;
  const itemsToReserve = inventoryReleasedAt ? [] : fixedInventoryItemsFromItems(payload.items);
  const reservedItems = [];

  try {
    for (const item of itemsToReserve) {
      await reserveProductInventory(item.productId, item.qty, {
        allowNegativeStock: true,
        missingMessage: "Unable to create this order because one or more products no longer exist."
      });
      reservedItems.push(item);
    }

    return await Order.create({
      orderNumber: await makeOrderNumber(),
      userId: user?._id || null,
      customerName,
      customerEmail,
      paymentMethod: sanitizeText(body?.paymentMethod || "cod", 40) || "cod",
      paymentStatus: payload.paymentStatus || "unpaid",
      fulfillmentStatus,
      customerNote: Object.prototype.hasOwnProperty.call(payload, "customerNote") ? payload.customerNote : "",
      subtotal,
      shippingFee,
      discount,
      total: Math.max(0, Number((subtotal + shippingFee - discount).toFixed(2))),
      items: payload.items,
      shippingAddress,
      inventoryReleasedAt
    });
  } catch (error) {
    for (const item of reservedItems.reverse()) {
      await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.qty } });
    }
    throw error;
  }
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

router.post("/", async (req, res) => {
  try {
    const order = await createAdminOrder(req.body || {});
    return res.status(201).json(order);
  } catch (error) {
    return res.status(Number(error?.status) || 400).json({ message: error.message || "Unable to create order." });
  }
});

router.patch("/bulk/status", async (req, res) => {
  const orderIds = normalizeOrderIds(req.body?.orderIds);
  if (!orderIds.length) {
    return res.status(400).json({ message: "Select at least one valid order." });
  }

  let payload;
  try {
    payload = await buildOrderUpdatePayload(req.body, { allowCustomerFields: false });
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
    payload = await buildOrderUpdatePayload(req.body, { allowCustomerFields: true });
  } catch (error) {
    return res.status(Number(error?.status) || 400).json({ message: error.message || "Invalid order update." });
  }

  await applyOrderUpdate(order, payload);
  return res.json(order);
});

router.patch("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  let payload;
  try {
    payload = await buildOrderUpdatePayload(req.body, { allowCustomerFields: true });
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
