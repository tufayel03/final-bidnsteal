const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["percent", "fixed"], default: "percent" },
    value: { type: Number, required: true, default: 0 },
    maxUses: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    minOrderAmount: { type: Number, default: 0 },
    appliesTo: { type: String, enum: ["store", "auction", "both"], default: "both" },
    customerUsageMode: { type: String, enum: ["multiple", "once"], default: "multiple" },
    productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

attachJsonTransform(couponSchema);

module.exports = mongoose.model("Coupon", couponSchema);
