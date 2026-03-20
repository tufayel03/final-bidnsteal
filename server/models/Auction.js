const mongoose = require("mongoose");
const { attachJsonTransform } = require("./helpers");

const bidSchema = new mongoose.Schema(
  {
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bidderName: { type: String, default: "" },
    bidderEmail: { type: String, default: "" },
    amount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const highestBidSchema = new mongoose.Schema(
  {
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    bidderName: { type: String, default: "" },
    bidderEmail: { type: String, default: "" },
    amount: { type: Number, default: null },
    at: { type: Date, default: null }
  },
  { _id: false }
);

const auctionSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, unique: true },
    status: { type: String, enum: ["scheduled", "live", "ended", "cancelled"], default: "scheduled" },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    startingPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    reservePrice: { type: Number, default: null },
    reservePriceReached: { type: Boolean, default: false },
    minIncrement: { type: Number, default: 1 },
    totalBids: { type: Number, default: 0 },
    lastBidAt: { type: Date, default: null },
    highestBid: { type: highestBidSchema, default: () => ({}) },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    winnerEmailSentAt: { type: Date, default: null },
    buyNowPrice: { type: Number, default: 0 },
    viewerCount: { type: Number, default: 0 },
    year: { type: Number, default: new Date().getFullYear() },
    authenticity: { type: String, default: "Verified Tier 1" },
    description: { type: String, default: "" },
    bids: { type: [bidSchema], default: [] }
  },
  { timestamps: true }
);

attachJsonTransform(auctionSchema);

module.exports = mongoose.model("Auction", auctionSchema);
