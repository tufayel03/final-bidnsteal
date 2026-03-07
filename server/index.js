const fs = require("fs");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const morgan = require("morgan");
const Auction = require("./models/Auction");
const Product = require("./models/Product");
const Order = require("./models/Order");
const Subscriber = require("./models/Subscriber");
const { env } = require("./config/env");
const { connectToDatabase } = require("./config/db");
const { connectRedis, getCachedJson, setCachedJson } = require("./config/redis");
const { ensureUploadsStructure, uploadsRoot } = require("./config/uploads");
const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/store");
const adminProductsRoutes = require("./routes/adminProducts");
const adminAuctionsRoutes = require("./routes/adminAuctions");
const adminOrdersRoutes = require("./routes/adminOrders");
const adminMediaRoutes = require("./routes/adminMedia");
const adminPeopleRoutes = require("./routes/adminPeople");
const adminCmsRoutes = require("./routes/adminCms");
const { attachUser } = require("./middleware/auth");
const { createRateLimiter, csrfTokenRoute, requireCsrf } = require("./middleware/security");
const { bootstrapData } = require("./services/seedService");
const { syncAuctions } = require("./services/auctionService");
const { ensureRuntimeIndexes } = require("./services/databaseMaintenance");

const app = express();
const frontDistDir = path.resolve(__dirname, "..", "client", "front", "dist");
const adminDistDir = path.resolve(__dirname, "..", "client", "admin", "dist");
const frontIndexFile = path.join(frontDistDir, "index.html");
const adminIndexFile = path.join(adminDistDir, "index.html");
const hasFrontBuild = fs.existsSync(frontIndexFile);
const hasAdminBuild = fs.existsSync(adminIndexFile);

function setSpaAssetHeaders(res, filePath) {
  if (String(filePath).endsWith(".html")) {
    res.setHeader("Cache-Control", "no-store");
    return;
  }

  if (/[.-][A-Za-z0-9_-]{8,}\.(css|js)$/.test(String(filePath))) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return;
  }

  res.setHeader("Cache-Control", env.nodeEnv === "production" ? "public, max-age=3600" : "public, max-age=0");
}

function loopbackOriginAliases(origin) {
  try {
    const url = new URL(origin);
    const aliases = new Set([origin]);
    const port = url.port ? `:${url.port}` : "";

    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      aliases.add(`${url.protocol}//localhost${port}`);
      aliases.add(`${url.protocol}//127.0.0.1${port}`);
    }

    if (url.hostname === "[::1]" || url.hostname === "::1") {
      aliases.add(`${url.protocol}//[::1]${port}`);
      aliases.add(`${url.protocol}//localhost${port}`);
      aliases.add(`${url.protocol}//127.0.0.1${port}`);
    }

    return aliases;
  } catch {
    return new Set([origin]);
  }
}

function isAllowedOrigin(origin) {
  if (!origin || env.clientUrls.length === 0) {
    return true;
  }

  return env.clientUrls.some((allowedOrigin) => loopbackOriginAliases(allowedOrigin).has(origin));
}

const publicLimiter = createRateLimiter({
  keyPrefix: "api",
  max: env.publicRateLimitMax,
  windowMs: env.publicRateLimitWindowMs
});
const writeLimiter = createRateLimiter({
  keyPrefix: "write",
  max: env.writeRateLimitMax,
  windowMs: env.writeRateLimitWindowMs,
  message: "Too many write requests. Please slow down."
});
const authLimiter = createRateLimiter({
  keyPrefix: "auth",
  max: env.authRateLimitMax,
  windowMs: env.authRateLimitWindowMs,
  message: "Too many authentication attempts. Please try again later."
});

app.disable("x-powered-by");
if (env.trustProxy !== false) {
  app.set("trust proxy", env.trustProxy);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin blocked."));
    }
  })
);
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(express.json({ limit: env.bodySizeLimit }));
app.use(express.urlencoded({ extended: true, limit: env.bodySizeLimit, parameterLimit: env.urlencodedParameterLimit }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsRoot, {
  dotfiles: "deny",
  etag: true,
  fallthrough: false,
  immutable: env.nodeEnv === "production",
  maxAge: env.nodeEnv === "production" ? "7d" : 0,
  setHeaders(res, filePath) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (String(filePath).toLowerCase().endsWith(".svg")) {
      res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    }
  }
}));
app.use("/api", publicLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);
app.use("/api/auth/reset-password", authLimiter);
app.use("/api", (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  return writeLimiter(req, res, next);
});
app.use(attachUser);

app.get("/api/csrf-token", csrfTokenRoute);
app.use("/api", requireCsrf);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "healthy" });
});

app.get("/api/ready", async (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const redisClient = await connectRedis();
  const redisReady = env.redisUrl ? Boolean(redisClient?.isOpen) : true;
  const ok = dbReady && redisReady;
  res.status(ok ? 200 : 503).json({ ok, dbReady, redisReady });
});

app.get("/api/metrics", async (_req, res) => {
  const cached = await getCachedJson("metrics:overview");
  if (cached) {
    return res.json(cached);
  }

  await syncAuctions();
  const now = new Date();
  const [liveAuctions, scheduledAuctions, totalProducts, totalOrders, totalSubscribers] = await Promise.all([
    Auction.countDocuments({ status: "live", endAt: { $gt: now } }),
    Auction.countDocuments({ status: "scheduled" }),
    Product.countDocuments({ $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] }),
    Order.countDocuments(),
    Subscriber.countDocuments({ isActive: true })
  ]);
  const payload = { ok: true, liveAuctions, scheduledAuctions, totalProducts, totalOrders, totalSubscribers };
  await setCachedJson("metrics:overview", payload, 20);
  res.json(payload);
});

app.use("/api/auth", authRoutes);
app.use("/api", storeRoutes);
app.use("/api/admin/products", adminProductsRoutes);
app.use("/api/admin/auctions", adminAuctionsRoutes);
app.use("/api/admin/orders", adminOrdersRoutes);
app.use("/api/admin/media", adminMediaRoutes);
app.use("/api/admin", adminPeopleRoutes);
app.use("/api/admin", adminCmsRoutes);

if (hasAdminBuild) {
  app.use("/tufayel", express.static(adminDistDir, { index: false, redirect: false, setHeaders: setSpaAssetHeaders }));
  app.get(/^\/tufayel(?:\/.*)?$/, (_req, res) => {
    res.sendFile(adminIndexFile);
  });
}

if (hasFrontBuild) {
  app.use(express.static(frontDistDir, { index: false, redirect: false, setHeaders: setSpaAssetHeaders }));
  app.get(/^(?!\/api(?:\/|$))(?!\/uploads(?:\/|$))(?!\/tufayel(?:\/|$)).*/, (_req, res) => {
    res.sendFile(frontIndexFile);
  });
}

app.use((err, req, res, _next) => {
  if (err?.message === "CORS origin blocked.") {
    return res.status(403).json({ message: err.message });
  }
  const status = Number(err?.status || err?.statusCode || 500);
  console.error("[server-error]", req.method, req.originalUrl, err);
  const message =
    status >= 500 && env.nodeEnv === "production"
      ? "Internal server error."
      : err?.message || "Internal server error.";
  return res.status(status).json({ message });
});

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

async function start() {
  ensureUploadsStructure();
  await connectRedis();
  await connectToDatabase(env.mongoUri);
  await ensureRuntimeIndexes();
  await bootstrapData();
  await syncAuctions();
  app.listen(env.port, () => {
    console.log(`BidnSteal API running on http://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
