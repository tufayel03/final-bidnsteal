const Auction = require("../models/Auction");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { normalizeShippingAddress } = require("../utils/validation");
const { makeOrderNumber } = require("../utils/orderNumbers");

async function syncAuctionStatus(auction) {
  if (!auction) return null;
  const now = Date.now();
  let nextStatus = auction.status;

  if (auction.status !== "cancelled") {
    if (new Date(auction.endAt).getTime() <= now) {
      nextStatus = "ended";
    } else if (new Date(auction.startAt).getTime() <= now) {
      nextStatus = "live";
    } else {
      nextStatus = "scheduled";
    }
  }

  if (nextStatus !== auction.status) {
    auction.status = nextStatus;
    if (nextStatus === "ended" && !auction.endedAt) {
      auction.endedAt = new Date();
    }
    if (nextStatus === "ended" && !auction.winner) {
      const topBid = [...(auction.bids || [])].sort((a, b) => {
        if (b.amount !== a.amount) return b.amount - a.amount;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })[0];

      if (topBid?.bidderId) {
        auction.winner = topBid.bidderId;
        auction.currentPrice = topBid.amount;
        auction.highestBid = {
          bidderId: topBid.bidderId,
          bidderName: topBid.bidderName,
          bidderEmail: topBid.bidderEmail,
          amount: topBid.amount,
          at: topBid.createdAt
        };
      } else if (auction.highestBid?.bidderId) {
        auction.winner = auction.highestBid.bidderId;
      }
    }
    await auction.save();
  }

  return auction;
}

async function syncAuctions() {
  const auctions = await Auction.find();
  await Promise.all(auctions.map((auction) => syncAuctionStatus(auction)));
}

function createBidPresentation(auction, currentUserId = "") {
  return [...(auction.bids || [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((bid) => ({
      id: bid.id,
      user: bid.bidderName || "Bidder",
      amount: bid.amount,
      time: new Date(bid.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isUser: currentUserId ? String(bid.bidderId || "") === currentUserId : false
    }));
}

function mapAuctionStatusToPublic(status) {
  if (status === "live") return "LIVE";
  if (status === "ended") return "ENDED";
  return "UPCOMING";
}

function toPublicProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.title,
    category: product.category || product.series || "Cars",
    price: Number(product.price || 0),
    image: Array.isArray(product.images) ? product.images[0] || "" : "",
    images: Array.isArray(product.images) ? product.images : [],
    rating: Number(product.rating || 0),
    badge: product.badge || "",
    description: product.description || "",
    inStock: Number(product.stock || 0) > 0,
    stock: Number(product.stock || 0),
    saleMode: product.saleMode || "fixed"
  };
}

function toPublicAuction(auction, product, currentUserId = "") {
  const publicBids = createBidPresentation(auction, currentUserId);
  return {
    id: auction.id,
    productId: product?.id || "",
    productSlug: product?.slug || "",
    name: product?.title || "Auction Lot",
    year: Number(auction.year || new Date(product?.createdAt || Date.now()).getFullYear()),
    condition: product?.condition || "Collector Grade",
    authenticity: auction.authenticity || "Verified Tier 1",
    image: product?.images?.[0] || "",
    gallery: product?.images?.length ? product.images : [product?.images?.[0] || ""].filter(Boolean),
    startingBid: Number(auction.startingPrice || 0),
    currentBid: Number(auction.currentPrice || 0),
    buyNowPrice: Number(auction.buyNowPrice || 0),
    minIncrement: Number(auction.minIncrement || 1),
    reservePrice: auction.reservePrice ?? null,
    reservePriceReached: Boolean(auction.reservePriceReached),
    totalBids: Number(auction.totalBids || publicBids.length),
    endTime: new Date(auction.endAt).toISOString(),
    viewers: Number(auction.viewerCount || 0),
    status: mapAuctionStatusToPublic(auction.status),
    bids: publicBids
  };
}

async function createAuctionWinnerOrder(auction, user) {
  const product = await Product.findById(auction.productId);
  if (!product || !user) return null;

  const existing = await Order.findOne({
    userId: user._id,
    $or: [{ sourceAuctionId: auction._id }, { "items.auctionId": auction._id }]
  });
  if (existing) return existing;

  try {
    return await Order.create({
      orderNumber: await makeOrderNumber(),
      sourceAuctionId: auction._id,
      userId: user._id,
      customerName: user.name,
      customerEmail: user.email,
      paymentMethod: "auction",
      paymentStatus: "paid",
      fulfillmentStatus: "pending",
      subtotal: auction.currentPrice,
      shippingFee: 0,
      discount: 0,
      total: auction.currentPrice,
      items: [
        {
          productId: product._id,
          auctionId: auction._id,
          titleSnapshot: product.title,
          slugSnapshot: product.slug,
          qty: 1,
          unitPrice: auction.currentPrice,
          type: "auction",
          imageUrl: product.images?.[0] || ""
        }
      ],
      shippingAddress: normalizeShippingAddress(user.shippingAddress || {})
    });
  } catch (error) {
    if (error?.code === 11000) {
      return Order.findOne({
        userId: user._id,
        $or: [{ sourceAuctionId: auction._id }, { "items.auctionId": auction._id }]
      });
    }
    throw error;
  }
}

module.exports = {
  syncAuctionStatus,
  syncAuctions,
  toPublicProduct,
  toPublicAuction,
  createAuctionWinnerOrder
};
