const Campaign = require("../models/Campaign");
const CampaignDelivery = require("../models/CampaignDelivery");
const Subscriber = require("../models/Subscriber");
const { env } = require("../config/env");
const { renderTemplateString, sendEmail } = require("./emailService");
const { getPublicSiteProfile } = require("./siteProfileService");
const { isValidEmail } = require("../utils/validation");

const DISPATCH_TICK_MS = 15 * 1000;
const LOCK_TTL_MS = 5 * 60 * 1000;

let dispatcherTimer = null;
let dispatcherRunning = false;

function clampRate(value) {
  const parsed = Math.max(0, Math.floor(Number(value || 0)));
  return Number.isFinite(parsed) ? parsed : 0;
}

function campaignIntervalMs(campaign) {
  const hourlyRateLimit = clampRate(campaign?.hourlyRateLimit);
  const dailyRateLimit = clampRate(campaign?.dailyRateLimit);
  const windows = [];

  if (hourlyRateLimit > 0) {
    windows.push((60 * 60 * 1000) / hourlyRateLimit);
  }
  if (dailyRateLimit > 0) {
    windows.push((24 * 60 * 60 * 1000) / dailyRateLimit);
  }

  if (!windows.length) {
    return 0;
  }

  return Math.ceil(Math.max(...windows));
}

function buildCampaignStats(campaign) {
  const recipientCount = Number(campaign?.recipientCount || 0);
  const sentCount = Number(campaign?.sentCount || 0);
  const failedCount = Number(campaign?.failedCount || 0);
  const openCount = Number(campaign?.openedCount || 0);

  return {
    totalRecipients: recipientCount,
    recipientCount,
    sentCount,
    failedCount,
    openCount,
    openedCount: openCount
  };
}

function normalizeCampaignForAdmin(campaign) {
  const raw = typeof campaign?.toJSON === "function" ? campaign.toJSON() : { ...(campaign || {}) };
  return {
    ...raw,
    ...buildCampaignStats(raw)
  };
}

async function buildCampaignRenderContext(subscriber) {
  const siteProfile = await getPublicSiteProfile();
  return {
    subscriber: {
      email: subscriber.email,
      name: subscriber.name || ""
    },
    site: {
      name: siteProfile.siteName || "BidnSteal"
    },
    support: {
      email: siteProfile.supportEmail || env.adminEmail
    }
  };
}

async function setCampaignCompletedState(campaign) {
  const remainingQueued = await CampaignDelivery.countDocuments({ campaignId: campaign._id, state: "queued" });
  const remainingProcessing = await CampaignDelivery.countDocuments({ campaignId: campaign._id, state: "processing" });

  if (remainingQueued > 0 || remainingProcessing > 0) {
    return false;
  }

  campaign.status = Number(campaign.sentCount || 0) > 0 ? "sent" : "failed";
  campaign.nextSendAt = null;
  campaign.dispatchLockedAt = null;
  campaign.sentAt = campaign.sentAt || new Date();
  await campaign.save();
  return true;
}

async function queueCampaignDispatch(campaign, options = {}) {
  if (!campaign) {
    throw Object.assign(new Error("Campaign not found."), { status: 404 });
  }

  if (["queued", "sending"].includes(String(campaign.status || "").toLowerCase()) && !options.force) {
    throw Object.assign(new Error("This campaign is already queued for delivery."), { status: 409 });
  }

  const subscribers = await Subscriber.find({ isActive: true }).sort({ createdAt: 1 });
  const deliveries = subscribers
    .filter((subscriber) => isValidEmail(subscriber.email))
    .map((subscriber, index) => ({
      campaignId: campaign._id,
      subscriberId: subscriber._id,
      email: subscriber.email,
      name: subscriber.name || "",
      sequence: index + 1,
      state: "queued"
    }));

  if (!deliveries.length) {
    throw Object.assign(new Error("No active subscribers found."), { status: 400 });
  }

  await CampaignDelivery.deleteMany({ campaignId: campaign._id });
  await CampaignDelivery.insertMany(deliveries, { ordered: true });

  campaign.status = "queued";
  campaign.recipientCount = deliveries.length;
  campaign.sentCount = 0;
  campaign.failedCount = 0;
  campaign.openedCount = 0;
  campaign.sentAt = null;
  campaign.queueStartedAt = new Date();
  campaign.nextSendAt = new Date();
  campaign.dispatchLockedAt = null;
  campaign.lastError = "";
  await campaign.save();

  return {
    queued: deliveries.length,
    intervalMs: campaignIntervalMs(campaign),
    campaign: normalizeCampaignForAdmin(campaign)
  };
}

async function lockNextCampaignForDispatch() {
  const now = new Date();
  const staleLock = new Date(Date.now() - LOCK_TTL_MS);

  return Campaign.findOneAndUpdate(
    {
      status: { $in: ["queued", "sending"] },
      nextSendAt: { $ne: null, $lte: now },
      $or: [{ dispatchLockedAt: null }, { dispatchLockedAt: { $lt: staleLock } }]
    },
    { $set: { dispatchLockedAt: now } },
    { sort: { nextSendAt: 1, createdAt: 1 }, new: true }
  );
}

async function processLockedCampaign(campaign) {
  const delivery = await CampaignDelivery.findOneAndUpdate(
    { campaignId: campaign._id, state: "queued" },
    {
      $set: {
        state: "processing",
        lastAttemptAt: new Date()
      },
      $inc: { attemptCount: 1 }
    },
    { sort: { sequence: 1 }, new: true }
  );

  if (!delivery) {
    await setCampaignCompletedState(campaign);
    return;
  }

  const context = await buildCampaignRenderContext(delivery);

  try {
    await sendEmail({
      to: delivery.email,
      subject: renderTemplateString(campaign.subject || "", context),
      html: renderTemplateString(campaign.html || "", context)
    });

    delivery.state = "sent";
    delivery.errorMessage = "";
    delivery.sentAt = new Date();
    await delivery.save();

    campaign.sentCount = Number(campaign.sentCount || 0) + 1;
    campaign.lastError = "";
  } catch (error) {
    delivery.state = "failed";
    delivery.errorMessage = String(error?.message || "Failed to send campaign email.").slice(0, 1000);
    await delivery.save();

    campaign.failedCount = Number(campaign.failedCount || 0) + 1;
    campaign.lastError = delivery.errorMessage;
  }

  const hasMoreQueued = await CampaignDelivery.exists({ campaignId: campaign._id, state: "queued" });
  if (!hasMoreQueued) {
    await setCampaignCompletedState(campaign);
    return;
  }

  const intervalMs = campaignIntervalMs(campaign);
  campaign.status = "sending";
  campaign.nextSendAt = intervalMs > 0 ? new Date(Date.now() + intervalMs) : new Date();
  campaign.dispatchLockedAt = null;
  await campaign.save();
}

async function processPendingCampaignDispatches(options = {}) {
  if (dispatcherRunning) return 0;
  dispatcherRunning = true;

  const maxCampaignsPerTick = Math.max(1, Number(options.maxCampaignsPerTick || 50));
  let processed = 0;

  try {
    while (processed < maxCampaignsPerTick) {
      const campaign = await lockNextCampaignForDispatch();
      if (!campaign) break;
      await processLockedCampaign(campaign);
      processed += 1;
    }
  } finally {
    dispatcherRunning = false;
  }

  return processed;
}

function startCampaignDispatcher() {
  if (dispatcherTimer) {
    return dispatcherTimer;
  }

  const runTick = async () => {
    try {
      await processPendingCampaignDispatches();
    } catch (error) {
      console.error("[campaign-dispatch]", error);
    }
  };

  dispatcherTimer = setInterval(runTick, DISPATCH_TICK_MS);
  if (typeof dispatcherTimer.unref === "function") {
    dispatcherTimer.unref();
  }

  void runTick();
  return dispatcherTimer;
}

module.exports = {
  buildCampaignStats,
  campaignIntervalMs,
  normalizeCampaignForAdmin,
  processPendingCampaignDispatches,
  queueCampaignDispatch,
  startCampaignDispatcher
};
