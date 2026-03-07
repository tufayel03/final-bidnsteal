const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const campaignTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, default: "" },
    html: { type: String, default: "" }
  },
  { timestamps: true }
);

attachJsonTransform(campaignTemplateSchema);

module.exports = mongoose.model("CampaignTemplate", campaignTemplateSchema);
