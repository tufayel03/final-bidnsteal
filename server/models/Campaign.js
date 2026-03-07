const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const campaignSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    html: { type: String, default: "" },
    status: { type: String, enum: ["draft", "sent"], default: "draft" },
    sentAt: { type: Date, default: null },
    recipientCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

attachJsonTransform(campaignSchema);

module.exports = mongoose.model("Campaign", campaignSchema);
