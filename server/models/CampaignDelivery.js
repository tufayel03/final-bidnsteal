const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const campaignDeliverySchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    subscriberId: { type: mongoose.Schema.Types.ObjectId, ref: "Subscriber", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "" },
    sequence: { type: Number, required: true },
    state: { type: String, enum: ["queued", "processing", "sent", "failed"], default: "queued", index: true },
    attemptCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    sentAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" }
  },
  { timestamps: true }
);

campaignDeliverySchema.index({ campaignId: 1, sequence: 1 }, { unique: true });
campaignDeliverySchema.index({ campaignId: 1, state: 1, sequence: 1 });

attachJsonTransform(campaignDeliverySchema);

module.exports = mongoose.model("CampaignDelivery", campaignDeliverySchema);
