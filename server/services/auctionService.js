const Auction = require("../models/Auction");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { buildTransactionalEmailContext, sendTemplateEmail } = require("./emailService");
const { makeOrderNumber } = require("../utils/orderNumbers");
const { isValidEmail, normalizeShippingAddress } = require("../utils/validation");

async function archiveAuctionProductFromInventory(auction) {
  if (!auction?.productId) return;

  const productId =
    auction.productId && typeof auction.productId === "object" && auction.productId._id
      ? auction.productId._id
      : auction.productId;

  if (!productId) return;

  await Product.updateOne(
    {
      _id: productId,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    },
    {
      $set: {
        deletedAt: new Date()
      }
    }
  );
}

function formatAuctionAmount(auction) {
  const amount = Number(
    auction?.highestBid?.amount ||
      auction?.currentPrice ||
      auction?.startingPrice ||
      0
  );
  return `BDT ${amount}`;
}

async function notifyAuctionWinnerIfNeeded(auction) {
  if (!auction || auction.status !== "ended" || auction.winnerEmailSentAt) {
    return;
  }

  const product =
    auction.productId && typeof auction.productId === "object" && auction.productId._id
      ? auction.productId
      : await Product.findById(auction.productId).select("title slug");
  const winnerUser = auction.winner
    ? await User.findById(auction.winner).select("name email")
    : null;
  const recipientEmail = String(winnerUser?.email || auction.highestBid?.bidderEmail || "").trim();

  if (!isValidEmail(recipientEmail)) {
    return;
  }

  const recipientName = String(winnerUser?.name || auction.highestBid?.bidderName || "Bidder").trim() || "Bidder";

  try {
    const context = await buildTransactionalEmailContext({
      customer: {
        name: recipientName,
        email: recipientEmail
      },
      auction: {
        title: product?.title || "Auction lot",
        amount: formatAuctionAmount(auction)
      },
      product: {
        title: product?.title || "Auction lot"
      }
    });
    const linkId = encodeURIComponent(String(product?.slug || auction.id || auction._id || "").trim());
    const auctionUrl = context.site.url ? `${context.site.url}/auction/${linkId}` : `/auction/${linkId}`;

    await sendTemplateEmail({
      templateKey: "auction-win",
      to: recipientEmail,
      context: {
        ...context,
        auction: {
          ...context.auction,
          url: auctionUrl
        }
      },
      fallbackSubject: `You won ${product?.title || "an auction lot"}`,
      fallbackHtml: `<p>Hello ${recipientName},</p><p>Congratulations. You won <strong>${product?.title || "this auction"}</strong>.</p><p>Winning bid: <strong>${formatAuctionAmount(auction)}</strong></p><p><a href="${auctionUrl}">Review the auction</a></p>`
    });

    auction.winnerEmailSentAt = new Date();
    await auction.save();
  } catch (error) {
    console.error("[auction-service] failed to send auction win email", error);
  }
}

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

  if (auction.status === "ended") {
    await archiveAuctionProductFromInventory(auction);
    await notifyAuctionWinnerIfNeeded(auction);
  }

  return auction;
}

function recalculateAuctionBidState(auction) {
  if (!auction) return null;

  const bids = Array.isArray(auction.bids) ? auction.bids.filter(Boolean) : [];
  const topBid = [...bids].sort((a, b) => {
    const amountDiff = Number(b.amount || 0) - Number(a.amount || 0);
    if (amountDiff !== 0) return amountDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })[0] || null;

  const latestBid = [...bids].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0] || null;

  auction.totalBids = bids.length;
  auction.lastBidAt = latestBid?.createdAt || null;
  auction.currentPrice = topBid
    ? Number(topBid.amount || 0)
    : Math.max(0, Number(auction.startingPrice || 0));
  auction.highestBid = topBid
    ? {
        bidderId: topBid.bidderId || null,
        bidderName: topBid.bidderName || "",
        bidderEmail: topBid.bidderEmail || "",
        amount: Number(topBid.amount || 0),
        at: topBid.createdAt || null
      }
    : {
        bidderId: null,
        bidderName: "",
        bidderEmail: "",
        amount: null,
        at: null
      };

  const reservePrice = Number(auction.reservePrice);
  auction.reservePriceReached =
    Number.isFinite(reservePrice) && reservePrice >= 0
      ? auction.currentPrice >= reservePrice
      : false;

  if (auction.status === "ended") {
    auction.winner = topBid?.bidderId || null;
  } else {
    auction.winner = null;
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
    categoryId: product.categoryId ? String(product.categoryId) : "",
    category: product.category || "Cars",
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
  archiveAuctionProductFromInventory,
  recalculateAuctionBidState,
  syncAuctionStatus,
  syncAuctions,
  toPublicProduct,
  toPublicAuction,
  createAuctionWinnerOrder
};
