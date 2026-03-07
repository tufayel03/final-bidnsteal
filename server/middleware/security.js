const crypto = require("crypto");
const { env } = require("../config/env");
const { getRedisClient, withRedisKey } = require("../config/redis");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const memoryRateStore = new Map();

function cookieOptions(httpOnly = false) {
  return {
    httpOnly,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    domain: env.cookieDomain,
    maxAge: env.sessionTtlMs,
    path: "/"
  };
}

function ensureCsrfCookie(req, res) {
  const existing = String(req.cookies?.[env.csrfCookieName] || "").trim();
  if (existing) return existing;
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie(env.csrfCookieName, token, cookieOptions(false));
  return token;
}

function csrfTokenRoute(_req, res) {
  const token = ensureCsrfCookie(_req, res);
  res.json({ csrfToken: token });
}

function requireCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) {
    ensureCsrfCookie(req, res);
    return next();
  }

  const cookieToken = String(req.cookies?.[env.csrfCookieName] || "").trim();
  const headerToken = String(req.get("x-csrf-token") || "").trim();
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid CSRF token." });
  }
  return next();
}

function clientAddress(req) {
  return (
    String(req.ip || "").trim() ||
    String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    "unknown"
  );
}

async function incrementRateCounter(key, windowMs) {
  const client = await getRedisClient();
  if (client) {
    const redisKey = withRedisKey(`rate:${key}`);
    const count = await client.incr(redisKey);
    let ttl = await client.pTTL(redisKey);
    if (count === 1 || ttl < 0) {
      await client.pExpire(redisKey, windowMs);
      ttl = windowMs;
    }
    return { count, resetMs: Math.max(ttl, 0) };
  }

  const now = Date.now();
  const current = memoryRateStore.get(key);
  if (!current || current.expiresAt <= now) {
    const next = { count: 1, expiresAt: now + windowMs };
    memoryRateStore.set(key, next);
    return { count: next.count, resetMs: windowMs };
  }

  current.count += 1;
  return { count: current.count, resetMs: Math.max(current.expiresAt - now, 0) };
}

function createRateLimiter({ keyPrefix, max, windowMs, message, keyGenerator }) {
  return async function rateLimitMiddleware(req, res, next) {
    try {
      const identifier = keyGenerator ? keyGenerator(req) : clientAddress(req);
      const key = `${keyPrefix}:${identifier}`;
      const { count, resetMs } = await incrementRateCounter(key, windowMs);
      const remaining = Math.max(0, max - count);

      res.setHeader("X-RateLimit-Limit", String(max));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((Date.now() + resetMs) / 1000)));

      if (count > max) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil(resetMs / 1000))));
        return res.status(429).json({ message: message || "Too many requests. Please try again later." });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  clientAddress,
  cookieOptions,
  createRateLimiter,
  csrfTokenRoute,
  ensureCsrfCookie,
  requireCsrf
};
