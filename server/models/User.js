const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

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

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "customer"], default: "customer" },
    phone: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    isSuspended: { type: Boolean, default: false },
    shippingAddress: { type: shippingAddressSchema, default: () => ({}) },
    passwordResetToken: { type: String, default: "", select: false },
    passwordResetExpiresAt: { type: Date, default: null, select: false },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true }
);

attachJsonTransform(userSchema);

module.exports = mongoose.model("User", userSchema);
