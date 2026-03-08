const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const campaignSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    html: { type: String, default: "" },
    status: { type: String, enum: ["draft", "queued", "sending", "sent", "failed"], default: "draft" },
    hourlyRateLimit: { type: Number, default: 0 },
    dailyRateLimit: { type: Number, default: 0 },
    nextSendAt: { type: Date, default: null },
    queueStartedAt: { type: Date, default: null },
    dispatchLockedAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    recipientCount: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

attachJsonTransform(campaignSchema);

module.exports = mongoose.model("Campaign", campaignSchema);
