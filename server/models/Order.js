const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
    auctionId: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", default: null },
    titleSnapshot: { type: String, required: true },
    slugSnapshot: { type: String, default: "" },
    qty: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
    type: { type: String, enum: ["fixed", "auction"], default: "fixed" },
    imageUrl: { type: String, default: "" }
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    area: { type: String, default: "" },
    city: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "BD" }
  },
  { _id: false }
);

const courierSchema = new mongoose.Schema(
  {
    provider: { type: String, default: "steadfast" },
    trackingCode: { type: String, default: null },
    consignmentId: { type: String, default: null },
    statusCode: { type: String, default: null },
    deliveryStatus: { type: String, default: null }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    sourceAuctionId: { type: mongoose.Schema.Types.ObjectId, ref: "Auction", default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    paymentMethod: { type: String, default: "cod" },
    paymentStatus: { type: String, enum: ["unpaid", "paid", "refunded"], default: "unpaid" },
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending"
    },
    customerNote: { type: String, default: "" },
    couponCode: { type: String, default: "" },
    subtotal: { type: Number, required: true, default: 0 },
    shippingFee: { type: Number, required: true, default: 0 },
    discount: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
    items: { type: [orderItemSchema], default: [] },
    shippingAddress: { type: shippingAddressSchema, default: () => ({}) },
    courier: { type: courierSchema, default: () => ({}) },
    inventoryReleasedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

orderSchema.pre("validate", function normalizeLegacyPaymentStatus(next) {
  if (String(this.paymentStatus || "").toLowerCase() === "collected") {
    this.paymentStatus = "paid";
  }
  next();
});

// Only auction-backed orders should be unique per auction. Fixed-price orders
// keep `sourceAuctionId: null`, so the index must ignore null values.
orderSchema.index(
  { sourceAuctionId: 1 },
  {
    name: "sourceAuctionId_1",
    unique: true,
    partialFilterExpression: { sourceAuctionId: { $type: "objectId" } }
  }
);

attachJsonTransform(orderSchema);

module.exports = mongoose.model("Order", orderSchema);
