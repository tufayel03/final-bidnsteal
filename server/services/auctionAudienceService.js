const { getRedisClient, withRedisKey } = require("../config/redis");
const { clientAddress } = require("../middleware/security");

const VIEWER_TTL_SECONDS = 15 * 60;
const memoryAudienceStore = new Map();

function pruneMemoryViewers(entry, now) {
  if (!entry?.viewers) return;

  for (const [viewerKey, expiresAt] of entry.viewers.entries()) {
    if (expiresAt <= now) {
      entry.viewers.delete(viewerKey);
    }
  }
}

async function trackAuctionViewer(req, auction) {
  if (!auction?._id) {
    return Number(auction?.viewerCount || 0);
  }

  const viewerKey = req.user?.id
    ? `user:${req.user.id}`
    : `ip:${clientAddress(req)}`;
  const auctionId = String(auction._id);
  let viewerCount = Number(auction.viewerCount || 0);

  const client = await getRedisClient();
  if (client) {
    const redisKey = withRedisKey(`auction:viewers:${auctionId}`);
    await client.sAdd(redisKey, viewerKey);
    await client.expire(redisKey, VIEWER_TTL_SECONDS);
    viewerCount = await client.sCard(redisKey);
  } else {
    const now = Date.now();
    let entry = memoryAudienceStore.get(auctionId);
    if (!entry) {
      entry = { viewers: new Map() };
      memoryAudienceStore.set(auctionId, entry);
    }

    pruneMemoryViewers(entry, now);
    entry.viewers.set(viewerKey, now + VIEWER_TTL_SECONDS * 1000);
    viewerCount = entry.viewers.size;
  }

  if (viewerCount !== Number(auction.viewerCount || 0)) {
    auction.viewerCount = viewerCount;
    await auction.save();
  }

  return viewerCount;
}

module.exports = {
  trackAuctionViewer
};
