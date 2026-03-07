const { createClient } = require("redis");
const { env } = require("./env");

let redisClient = null;
let redisConnectPromise = null;

function withRedisKey(key) {
  return `${env.redisPrefix}${key}`;
}

async function connectRedis() {
  if (!env.redisUrl) {
    return null;
  }

  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  redisClient = createClient({
    url: env.redisUrl,
    socket: {
      reconnectStrategy(retries) {
        return Math.min(500 + retries * 250, 5_000);
      }
    }
  });

  redisClient.on("error", (error) => {
    console.error("[redis] connection error", error.message);
  });

  redisConnectPromise = redisClient
    .connect()
    .then(() => redisClient)
    .catch((error) => {
      redisConnectPromise = null;
      redisClient = null;
      if (env.nodeEnv === "production") {
        throw error;
      }
      console.warn("[redis] unavailable, falling back to in-memory mode:", error.message);
      return null;
    });

  return redisConnectPromise;
}

async function getRedisClient() {
  return connectRedis();
}

async function getCachedJson(key) {
  const client = await getRedisClient();
  if (!client) return null;
  const raw = await client.get(withRedisKey(`cache:${key}`));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setCachedJson(key, value, ttlSeconds = 30) {
  const client = await getRedisClient();
  if (!client) return false;
  await client.set(withRedisKey(`cache:${key}`), JSON.stringify(value), { EX: ttlSeconds });
  return true;
}

module.exports = {
  connectRedis,
  getRedisClient,
  getCachedJson,
  setCachedJson,
  withRedisKey
};
