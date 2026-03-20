const express = require("express");
const mongoose = require("mongoose");
const Auction = require("../models/Auction");
const Product = require("../models/Product");
const { requireAdmin } = require("../middleware/auth");
const { recalculateAuctionBidState, syncAuctionStatus } = require("../services/auctionService");
const { parsePagination } = require("../utils/http");
const { sanitizeText } = require("../utils/validation");

const router = express.Router();

async function findAuction(identifier) {
  const lookup = String(identifier || "").trim();
  if (!lookup) return null;

  if (mongoose.Types.ObjectId.isValid(lookup)) {
    const byId = await Auction.findById(lookup).populate("productId winner");
    if (byId) return byId;

    const byProductId = await Auction.findOne({ productId: lookup }).populate("productId winner");
    if (byProductId) return byProductId;
  }

  const product = await Product.findOne({ slug: lookup });
  if (!product) return null;
  return Auction.findOne({ productId: product._id }).populate("productId winner");
}

function parseDateInput(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeAuctionForAdmin(auction) {
  const winner =
    auction.winner && typeof auction.winner === "object" && auction.winner._id
      ? {
          id: String(auction.winner._id),
          name: String(auction.winner.name || ""),
          email: String(auction.winner.email || "")
        }
      : auction.status === "ended" && auction.highestBid
        ? {
            id: String(auction.highestBid.bidderId || ""),
            name: String(auction.highestBid.bidderName || ""),
            email: String(auction.highestBid.bidderEmail || "")
          }
        : null;

  return {
    ...auction.toJSON(),
    productId: auction.productId?.id || auction.productId,
    product: auction.productId
      ? {
          id: auction.productId.id,
          slug: auction.productId.slug,
          title: auction.productId.title,
          image: auction.productId.images?.[0] || ""
        }
      : null,
    winner,
    timeLeftMs: Math.max(0, new Date(auction.endAt).getTime() - Date.now())
  };
}

router.use(requireAdmin);

router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);

  const [items, total] = await Promise.all([
    Auction.find().populate("productId winner").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Auction.countDocuments()
  ]);

  const now = Date.now();
  const mapped = [];
  for (const item of items) {
    await syncAuctionStatus(item);
    mapped.push({
      ...serializeAuctionForAdmin(item),
      timeLeftMs: Math.max(0, new Date(item.endAt).getTime() - now)
    });
  }

  return res.json({
    items: mapped,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

router.get("/:identifier", async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  await syncAuctionStatus(auction);
  return res.json(serializeAuctionForAdmin(auction));
});

router.delete("/:identifier/bids/:bidId", async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  await syncAuctionStatus(auction);
  if (auction.status === "ended") {
    return res.status(400).json({ message: "Bids can only be removed before an auction ends." });
  }

  const bidId = String(req.params.bidId || "").trim();
  if (!bidId) {
    return res.status(400).json({ message: "Bid identifier missing." });
  }

  const nextBids = (auction.bids || []).filter((bid) => String(bid?._id || bid?.id || "") !== bidId);
  if (nextBids.length === (auction.bids || []).length) {
    return res.status(404).json({ message: "Bid not found." });
  }

  auction.bids = nextBids;
  recalculateAuctionBidState(auction);
  await auction.save();
  await auction.populate("productId winner");

  return res.json(serializeAuctionForAdmin(auction));
});

router.delete("/:identifier", async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  const product =
    auction.productId && typeof auction.productId === "object" && auction.productId._id
      ? auction.productId
      : await Product.findById(auction.productId);

  await Auction.findByIdAndDelete(auction._id);

  if (product && product.saleMode === "auction") {
    product.saleMode = "fixed";
    await product.save();
  }

  return res.json({
    ok: true,
    id: String(auction._id),
    productId: String(product?._id || auction.productId || "")
  });
});

router.post("/", async (req, res) => {
  const productId = String(req.body?.productId || "").trim();
  const product = mongoose.Types.ObjectId.isValid(productId)
    ? await Product.findById(productId)
    : await Product.findOne({ slug: productId });

  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }
  if (product.deletedAt) {
    return res.status(400).json({ message: "Cannot create an auction for a deleted product." });
  }

  const existing = await Auction.findOne({ productId: product._id });
  if (existing) {
    return res.status(400).json({ message: "Auction already exists for this product." });
  }

  const startAt = parseDateInput(req.body?.startAt);
  const endAt = parseDateInput(req.body?.endAt);
  if (!startAt || !endAt) {
    return res.status(400).json({ message: "Valid auction start and end times are required." });
  }
  if (endAt <= startAt) {
    return res.status(400).json({ message: "Auction end time must be after the start time." });
  }

  const auction = await Auction.create({
    productId: product._id,
    status: startAt.getTime() <= Date.now() ? "live" : "scheduled",
    startAt,
    endAt,
    startingPrice: Math.max(0, Number(req.body.startingPrice || 0)),
    currentPrice: Math.max(0, Number(req.body.startingPrice || 0)),
    reservePrice: req.body.reservePrice !== undefined ? Math.max(0, Number(req.body.reservePrice)) : null,
    minIncrement: Math.max(1, Number(req.body.minIncrement || 1)),
    buyNowPrice: Math.max(0, Number(req.body.buyNowPrice || 0)),
    year: Number(req.body.year || new Date().getFullYear()),
    authenticity: sanitizeText(req.body.authenticity || "Verified Tier 1", 120) || "Verified Tier 1",
    description: sanitizeText(req.body.description, 5000)
  });

  return res.status(201).json(auction);
});

router.patch("/:identifier", async (req, res) => {
  const auction = await findAuction(req.params.identifier);
  if (!auction) {
    return res.status(404).json({ message: "Auction not found." });
  }

  if (req.body?.status !== undefined) {
    const nextStatus = String(req.body.status || "").trim().toLowerCase();
    if (!["scheduled", "live", "ended", "cancelled"].includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid auction status." });
    }
    auction.status = nextStatus;
  }
  if (req.body?.startAt !== undefined) {
    const nextStartAt = parseDateInput(req.body.startAt);
    if (!nextStartAt) {
      return res.status(400).json({ message: "Invalid auction start time." });
    }
    auction.startAt = nextStartAt;
  }
  if (req.body?.endAt !== undefined) {
    const nextEndAt = parseDateInput(req.body.endAt);
    if (!nextEndAt) {
      return res.status(400).json({ message: "Invalid auction end time." });
    }
    auction.endAt = nextEndAt;
  }
  if (auction.endAt <= auction.startAt) {
    return res.status(400).json({ message: "Auction end time must be after the start time." });
  }
  if (req.body?.startingPrice !== undefined) auction.startingPrice = Math.max(0, Number(req.body.startingPrice || 0));
  if (req.body?.reservePrice !== undefined) auction.reservePrice = req.body.reservePrice === null ? null : Math.max(0, Number(req.body.reservePrice));
  if (req.body?.minIncrement !== undefined) auction.minIncrement = Math.max(1, Number(req.body.minIncrement || 1));
  if (req.body?.buyNowPrice !== undefined) auction.buyNowPrice = Math.max(0, Number(req.body.buyNowPrice || 0));
  if (req.body?.authenticity !== undefined) auction.authenticity = sanitizeText(req.body.authenticity || "Verified Tier 1", 120) || "Verified Tier 1";
  if (req.body?.description !== undefined) auction.description = sanitizeText(req.body.description, 5000);

  await syncAuctionStatus(auction);
  await auction.save();

  return res.json(serializeAuctionForAdmin(auction));
});

module.exports = router;
