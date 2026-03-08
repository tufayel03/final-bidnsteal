const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const mediaAssetSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true, unique: true },
    templateTagId: { type: String, unique: true, sparse: true, index: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    url: { type: String, required: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

attachJsonTransform(mediaAssetSchema);

module.exports = mongoose.model("MediaAsset", mediaAssetSchema);
