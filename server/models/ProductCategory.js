const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const productCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "", trim: true }
  },
  { timestamps: true }
);

productCategorySchema.index({ name: 1 }, { unique: true });

attachJsonTransform(productCategorySchema);

module.exports = mongoose.model("ProductCategory", productCategorySchema);
