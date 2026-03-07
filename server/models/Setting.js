const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  { timestamps: true }
);

attachJsonTransform(settingSchema);

module.exports = mongoose.model("Setting", settingSchema);
