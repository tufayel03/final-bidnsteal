const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const sequenceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

attachJsonTransform(sequenceSchema);

module.exports = mongoose.model("Sequence", sequenceSchema);
