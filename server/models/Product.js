const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const productSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "Cars", trim: true },
    price: { type: Number, required: true, default: 0 },
    sku: { type: String, default: "", trim: true },
    stock: { type: Number, required: true, default: 0 },
    condition: { type: String, default: "carded", trim: true },
    saleMode: { type: String, enum: ["fixed", "auction", "hybrid"], default: "fixed" },
    series: { type: String, default: "", trim: true },
    images: [{ type: String }],
    tags: [{ type: String }],
    description: { type: String, default: "" },
    badge: { type: String, default: "" },
    rating: { type: Number, default: 4.8 },
    isFeatured: { type: Boolean, default: false },
    isNewDrop: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

attachJsonTransform(productSchema);

module.exports = mongoose.model("Product", productSchema);
