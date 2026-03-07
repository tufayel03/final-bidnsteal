const bcrypt = require("bcryptjs");
const { env } = require("../config/env");
const User = require("../models/User");
const Product = require("../models/Product");
const Auction = require("../models/Auction");
const Order = require("../models/Order");
const Subscriber = require("../models/Subscriber");
const Coupon = require("../models/Coupon");
const CampaignTemplate = require("../models/CampaignTemplate");
const Campaign = require("../models/Campaign");
const Setting = require("../models/Setting");
const { productSeeds, couponSeeds, campaignTemplateSeeds, auctionSeeds } = require("../data/seedData");
const { makeOrderNumber } = require("../utils/orderNumbers");

async function upsertAdminUser() {
  const passwordHash = await bcrypt.hash(env.adminPassword, 10);
  return User.findOneAndUpdate(
    { email: env.adminEmail },
    {
      name: "Admin User",
      email: env.adminEmail,
      passwordHash,
      role: "admin",
      phone: "01700000000",
      isSuspended: false
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensureCustomerUser() {
  const email = "racer@example.com";
  let user = await User.findOne({ email });
  if (user) return user;

  user = await User.create({
    name: "Racer_X",
    email,
    passwordHash: await bcrypt.hash("Racer123!", 10),
    role: "customer",
    phone: "01711111111",
    shippingAddress: {
      fullName: "Racer X",
      phone: "01711111111",
      addressLine1: "123 Trackside Blvd",
      addressLine2: "Sector 7G",
      area: "Mirpur",
      city: "Dhaka",
      postalCode: "1216",
      country: "BD"
    }
  });

  return user;
}

async function ensureProducts() {
  const productMap = new Map();
  for (const seed of productSeeds) {
    const product = await Product.findOneAndUpdate(
      { slug: seed.slug },
      { $setOnInsert: seed, $set: { deletedAt: null } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    productMap.set(seed.slug, product);
  }
  return productMap;
}

function buildAuctionStatus(startAt, endAt) {
  const now = Date.now();
  if (endAt.getTime() <= now) return "ended";
  if (startAt.getTime() <= now) return "live";
  return "scheduled";
}

async function ensureAuctions(productMap) {
  for (const seed of auctionSeeds) {
    const product = productMap.get(seed.slug);
    if (!product) continue;

    const startAt = new Date(Date.now() + seed.startOffsetHours * 60 * 60 * 1000);
    const endAt = new Date(Date.now() + seed.endOffsetHours * 60 * 60 * 1000);
    const status = buildAuctionStatus(startAt, endAt);
    const bids = seed.bids.map((bid) => ({
      bidderName: bid.bidderName,
      bidderEmail: bid.bidderEmail,
      amount: bid.amount,
      createdAt: new Date(Date.now() - bid.hoursAgo * 60 * 60 * 1000)
    }));
    const lastBid = bids[bids.length - 1] || null;

    await Auction.findOneAndUpdate(
      { productId: product._id },
      {
        productId: product._id,
        status,
        startAt,
        endAt,
        endedAt: status === "ended" ? endAt : null,
        startingPrice: seed.startingPrice,
        currentPrice: seed.currentPrice,
        reservePrice: seed.reservePrice,
        reservePriceReached: seed.reservePrice ? seed.currentPrice >= seed.reservePrice : false,
        minIncrement: seed.minIncrement,
        totalBids: bids.length,
        lastBidAt: lastBid ? lastBid.createdAt : null,
        highestBid: lastBid
          ? {
              bidderName: lastBid.bidderName,
              bidderEmail: lastBid.bidderEmail,
              amount: lastBid.amount,
              at: lastBid.createdAt
            }
          : {},
        buyNowPrice: seed.buyNowPrice,
        viewerCount: seed.viewerCount,
        year: seed.year,
        authenticity: seed.authenticity,
        description: seed.description,
        bids
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function ensureOrders(customer, productMap) {
  if (await Order.countDocuments()) return;

  const deliveredProduct = productMap.get("twin-mill-classic");
  const pendingProduct = productMap.get("mega-garage-tower");
  const endedAuction = await Auction.findOne({ status: "ended" });

  await Order.insertMany([
    {
      orderNumber: makeOrderNumber(),
      sourceAuctionId: endedAuction?._id || null,
      userId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      paymentMethod: "cod",
      paymentStatus: "paid",
      fulfillmentStatus: "delivered",
      subtotal: 19.99,
      shippingFee: 0,
      discount: 0,
      total: 19.99,
      items: [
        {
          productId: deliveredProduct?._id || null,
          titleSnapshot: deliveredProduct?.title || "Twin Mill Classic",
          slugSnapshot: deliveredProduct?.slug || "",
          qty: 1,
          unitPrice: 19.99,
          type: "fixed",
          imageUrl: deliveredProduct?.images?.[0] || ""
        }
      ],
      shippingAddress: customer.shippingAddress
    },
    {
      orderNumber: makeOrderNumber(),
      userId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      fulfillmentStatus: "processing",
      subtotal: 89.99,
      shippingFee: 0,
      discount: 0,
      total: 89.99,
      items: [
        {
          productId: pendingProduct?._id || null,
          titleSnapshot: pendingProduct?.title || "Mega Garage Tower",
          slugSnapshot: pendingProduct?.slug || "",
          qty: 1,
          unitPrice: 89.99,
          type: "fixed",
          imageUrl: pendingProduct?.images?.[0] || ""
        }
      ],
      shippingAddress: customer.shippingAddress
    },
    {
      orderNumber: makeOrderNumber(),
      userId: customer._id,
      customerName: customer.name,
      customerEmail: customer.email,
      paymentMethod: "auction",
      paymentStatus: "paid",
      fulfillmentStatus: "pending",
      subtotal: endedAuction?.currentPrice || 5900,
      shippingFee: 0,
      discount: 0,
      total: endedAuction?.currentPrice || 5900,
      items: [
        {
          productId: endedAuction?.productId || null,
          auctionId: endedAuction?._id || null,
          titleSnapshot: "Stunt Arena Playset",
          slugSnapshot: "stunt-arena-playset",
          qty: 1,
          unitPrice: endedAuction?.currentPrice || 5900,
          type: "auction",
          imageUrl: productMap.get("stunt-arena-playset")?.images?.[0] || ""
        }
      ],
      shippingAddress: customer.shippingAddress
    }
  ]);
}

async function ensureSubscribers(customer) {
  await Subscriber.findOneAndUpdate(
    { email: customer.email },
    { name: customer.name, source: "seed", isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensureCoupons() {
  for (const seed of couponSeeds) {
    await Coupon.findOneAndUpdate(
      { code: seed.code },
      seed,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function ensureCampaignTemplates() {
  for (const seed of campaignTemplateSeeds) {
    await CampaignTemplate.findOneAndUpdate(
      { key: seed.key },
      seed,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function ensureSettings() {
  const defaults = [
    {
      key: "smtp",
      value: {
        enabled: false,
        host: "",
        port: 465,
        secure: true,
        username: "",
        hasPassword: false,
        passwordMasked: "",
        fromEmail: "",
        fromName: "",
        replyTo: "",
        ignoreTLS: false
      }
    },
    {
      key: "courier",
      value: {
        provider: "steadfast",
        enabled: false,
        baseUrl: "https://portal.packzy.com/api/v1",
        apiKey: "",
        hasSecret: false,
        secretKeyMasked: "",
        fraudCheckerEnabled: false,
        fraudCheckerEmail: "",
        fraudCheckerHasPassword: false,
        fraudCheckerPasswordMasked: "",
        defaultDeliveryType: 0,
        defaultItemDescription: "BidnSteal order"
      }
    },
    {
      key: "emailTemplates",
      value: [
        {
          key: "order-confirmation",
          subjectTemplate: "Your order {{order.number}} is confirmed",
          htmlTemplate: "<p>Thanks for ordering from BidnSteal.</p>",
          isActive: true
        }
      ]
    },
    {
      key: "disputes",
      value: []
    },
    {
      key: "reservations",
      value: { active: [], expired: [], consumed: [] }
    }
  ];

  for (const item of defaults) {
    await Setting.findOneAndUpdate(
      { key: item.key },
      { $setOnInsert: item },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

async function ensureCampaigns() {
  if (await Campaign.countDocuments()) return;
  await Campaign.create({
    subject: "Collectors update",
    html: "<p>Fresh inventory just landed.</p>",
    status: "draft"
  });
}

async function seedDatabase() {
  await upsertAdminUser();
  const customer = await ensureCustomerUser();
  const productMap = await ensureProducts();
  await ensureAuctions(productMap);
  await ensureOrders(customer, productMap);
  await ensureSubscribers(customer);
  await ensureCoupons();
  await ensureCampaignTemplates();
  await ensureSettings();
  await ensureCampaigns();

  return {
    adminEmail: env.adminEmail,
    customerEmail: customer.email
  };
}

async function bootstrapData() {
  await upsertAdminUser();
  if (!env.autoSeed) {
    return {
      adminEmail: env.adminEmail,
      customerEmail: null,
      seeded: false
    };
  }

  const seeded = await seedDatabase();
  return {
    ...seeded,
    seeded: true
  };
}

module.exports = { seedDatabase, bootstrapData };
