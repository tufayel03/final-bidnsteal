const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    source: { type: String, default: "manual" },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

attachJsonTransform(subscriberSchema);

module.exports = mongoose.model("Subscriber", subscriberSchema);
