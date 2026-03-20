const bcrypt = require("bcryptjs");
const { env } = require("../config/env");
const User = require("../models/User");
const Subscriber = require("../models/Subscriber");
const Coupon = require("../models/Coupon");
const CampaignTemplate = require("../models/CampaignTemplate");
const Campaign = require("../models/Campaign");
const Setting = require("../models/Setting");
const { couponSeeds, campaignTemplateSeeds } = require("../data/seedData");
const { mergeEmailTemplates } = require("./emailTemplateService");

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
      value: mergeEmailTemplates([])
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
