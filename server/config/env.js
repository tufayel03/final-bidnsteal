const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const isProduction = process.env.NODE_ENV === "production";

function splitList(value, fallback = []) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseTrustProxy(value) {
  if (value === undefined || value === null || value === "") return false;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  return value;
}

function resolvePathFromProject(value, fallbackSegments) {
  const raw = String(value || "").trim();
  if (!raw) {
    return path.join(__dirname, "..", ...fallbackSegments);
  }
  return path.isAbsolute(raw) ? raw : path.join(__dirname, "..", raw);
}

const cookieSameSite = ["strict", "lax", "none"].includes(String(process.env.SESSION_COOKIE_SAMESITE || "").toLowerCase())
  ? String(process.env.SESSION_COOKIE_SAMESITE).toLowerCase()
  : "lax";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bidnsteal",
  jwtSecret: process.env.JWT_SECRET || "change-this-secret",
  cookieName: process.env.COOKIE_NAME || "bidnsteal_session",
  cookieDomain: String(process.env.COOKIE_DOMAIN || "").trim() || undefined,
  cookieSecure: parseBoolean(process.env.SESSION_COOKIE_SECURE, isProduction),
  cookieSameSite,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  sessionTtlMs: parseNumber(process.env.SESSION_TTL_MS, 7 * 24 * 60 * 60 * 1000),
  csrfCookieName: process.env.CSRF_COOKIE_NAME || "bidnsteal_csrf",
  clientUrls: splitList(process.env.CLIENT_URLS, ["http://localhost:3000", "http://localhost:5173"]),
  bodySizeLimit: process.env.BODY_SIZE_LIMIT || "1mb",
  urlencodedParameterLimit: parseNumber(process.env.URLENCODED_PARAMETER_LIMIT, 200),
  uploadsDir: resolvePathFromProject(process.env.UPLOADS_DIR, ["uploads"]),
  uploadMaxFileSizeBytes: parseNumber(process.env.UPLOAD_MAX_FILE_SIZE_BYTES, 10 * 1024 * 1024),
  redisUrl: String(process.env.REDIS_URL || "").trim(),
  redisPrefix: process.env.REDIS_PREFIX || "bidnsteal:",
  autoSeed: parseBoolean(process.env.AUTO_SEED, !isProduction),
  publicRateLimitWindowMs: parseNumber(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  publicRateLimitMax: parseNumber(process.env.PUBLIC_RATE_LIMIT_MAX, 900),
  writeRateLimitWindowMs: parseNumber(process.env.WRITE_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  writeRateLimitMax: parseNumber(process.env.WRITE_RATE_LIMIT_MAX, 180),
  authRateLimitWindowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  authRateLimitMax: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 20),
  siteName: process.env.SITE_NAME || "BidnSteal",
  siteUrl: String(process.env.SITE_URL || "").trim(),
  supportEmail: String(process.env.SUPPORT_EMAIL || "").trim(),
  supportPhone: String(process.env.SUPPORT_PHONE || "").trim(),
  supportWhatsappNumber: String(process.env.SUPPORT_WHATSAPP_NUMBER || "").trim(),
  facebookUrl: String(process.env.FACEBOOK_URL || "").trim(),
  adminEmail: (process.env.ADMIN_EMAIL || "admin@bidnsteal.com").toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || "Tufayel@142003"
};

if (env.cookieSameSite === "none" && !env.cookieSecure) {
  throw new Error("SESSION_COOKIE_SAMESITE=none requires SESSION_COOKIE_SECURE=true.");
}

if (isProduction) {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is required in production.");
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "change-this-secret") {
    throw new Error("Set a strong JWT_SECRET before starting in production.");
  }
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === "Tufayel@142003") {
    throw new Error("Set ADMIN_PASSWORD explicitly before starting in production.");
  }
  if (!process.env.CLIENT_URLS) {
    throw new Error("CLIENT_URLS is required in production.");
  }
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is required in production.");
  }
}

module.exports = { env };
