const express = require("express");
const mongoose = require("mongoose");
const Auction = require("../models/Auction");
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const { requireAdmin } = require("../middleware/auth");
const { containsRegex, parsePagination } = require("../utils/http");
const { sanitizeText } = require("../utils/validation");

const router = express.Router();
const DEFAULT_CATEGORY_NAME = "Uncategorized";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function uniqueCategorySlug(base, excludeId = "") {
  const seed = slugify(base) || `category-${Date.now()}`;
  let candidate = seed;
  let suffix = 2;

  while (true) {
    const conflict = await ProductCategory.findOne({
      slug: candidate,
      ...(excludeId && mongoose.Types.ObjectId.isValid(excludeId) ? { _id: { $ne: excludeId } } : {})
    }).select("_id");
    if (!conflict) {
      return candidate;
    }
    candidate = `${seed}-${suffix}`;
    suffix += 1;
  }
}

async function ensureDefaultCategory() {
  let category = await ProductCategory.findOne({ slug: slugify(DEFAULT_CATEGORY_NAME) });
  if (!category) {
    category = await ProductCategory.create({
      name: DEFAULT_CATEGORY_NAME,
      slug: slugify(DEFAULT_CATEGORY_NAME),
      description: "Fallback category for uncategorized catalog items."
    });
  }
  return category;
}

async function ensureCategoryByName(name) {
  const safeName = sanitizeText(name, 120) || DEFAULT_CATEGORY_NAME;
  const normalizedSlug = slugify(safeName);
  let category = await ProductCategory.findOne({
    $or: [{ slug: normalizedSlug }, { name: { $regex: `^${escapeRegex(safeName)}$`, $options: "i" } }]
  });
  if (!category) {
    category = await ProductCategory.create({
      name: safeName,
      slug: await uniqueCategorySlug(safeName),
      description: ""
    });
  }
  return category;
}

async function resolveCategory(body, existing) {
  const incomingCategoryId = String(body?.categoryId || "").trim();
  if (incomingCategoryId && mongoose.Types.ObjectId.isValid(incomingCategoryId)) {
    const category = await ProductCategory.findById(incomingCategoryId);
    if (category) {
      return { category: category.name, categoryId: category._id };
    }
  }

  const incomingCategoryName = sanitizeText(body?.category, 120);
  if (incomingCategoryName) {
    const category = await ensureCategoryByName(incomingCategoryName);
    return { category: category.name, categoryId: category._id };
  }

  const existingCategoryName = sanitizeText(existing?.category, 120);
  if (existingCategoryName) {
    const category = await ensureCategoryByName(existingCategoryName);
    return { category: category.name, categoryId: category._id };
  }

  const seriesFallback = sanitizeText(body?.series || existing?.series, 120);
  if (seriesFallback) {
    const category = await ensureCategoryByName(seriesFallback);
    return { category: category.name, categoryId: category._id };
  }

  const defaultCategory = await ensureDefaultCategory();
  return { category: defaultCategory.name, categoryId: defaultCategory._id };
}

function normalizeSaleMode(value, fallback = "fixed") {
  const normalized = String(value || "").trim().toLowerCase();
  return ["fixed", "auction", "hybrid"].includes(normalized) ? normalized : fallback;
}

function normalizeImages(value) {
  return Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, 2048))
        .filter(Boolean)
        .slice(0, 12)
    : [];
}

function normalizeTags(value) {
  return Array.isArray(value)
    ? value
        .map((item) => sanitizeText(item, 60))
        .filter(Boolean)
        .slice(0, 24)
    : [];
}

async function findProduct(identifier) {
  const lookup = String(identifier || "").trim();
  if (!lookup) return null;
  if (mongoose.Types.ObjectId.isValid(lookup)) {
    const byId = await Product.findById(lookup);
    if (byId) return byId;
  }
  return Product.findOne({ slug: lookup });
}

router.use(requireAdmin);

router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20, 100);
  const search = String(req.query.search || "").trim();
  const saleMode = normalizeSaleMode(req.query.saleMode, "");
  const trash = req.query.trash === "true";

  const query = trash
    ? { deletedAt: { $ne: null } }
    : { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

  if (search) {
    const searchRegex = containsRegex(search);
    query.$and = [
      {
        $or: [
          { title: searchRegex },
          { sku: searchRegex },
          { slug: searchRegex }
        ]
      }
    ];
  }
  if (saleMode) {
    query.saleMode = saleMode;
  }

  const [items, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(query)
  ]);

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

router.post("/", async (req, res) => {
  const title = sanitizeText(req.body?.title, 180);
  if (!title) {
    return res.status(400).json({ message: "Product title is required." });
  }

  const slugBase = slugify(req.body?.slug || title);
  const slug = slugBase || `product-${Date.now()}`;
  const exists = await Product.findOne({ slug });
  const nextSlug = exists ? `${slug}-${Date.now().toString().slice(-4)}` : slug;
  const categoryState = await resolveCategory(req.body);

  const product = await Product.create({
    title,
    slug: nextSlug,
    categoryId: categoryState.categoryId,
    category: categoryState.category,
    price: Math.max(0, Number(req.body?.price || 0)),
    sku: sanitizeText(req.body?.sku, 80),
    stock: Math.max(0, Number(req.body?.stock || 0)),
    condition: sanitizeText(req.body?.condition || "carded", 80) || "carded",
    saleMode: normalizeSaleMode(req.body?.saleMode, "fixed"),
    series: sanitizeText(req.body?.series, 120),
    images: normalizeImages(req.body?.images),
    tags: normalizeTags(req.body?.tags),
    description: sanitizeText(req.body?.description, 5000),
    badge: sanitizeText(req.body?.badge, 60),
    rating: Number(req.body?.rating || 4.8),
    isFeatured: Boolean(req.body?.isFeatured),
    isNewDrop: Boolean(req.body?.isNewDrop)
  });

  return res.status(201).json(product);
});

router.patch("/:identifier", async (req, res) => {
  const product = await findProduct(req.params.identifier);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  const previousSaleMode = product.saleMode || "fixed";
  const categoryState = await resolveCategory(req.body, product);

  if (req.body?.title !== undefined) product.title = sanitizeText(req.body.title, 180);
  if (req.body?.slug !== undefined) product.slug = slugify(req.body.slug || product.title);
  if (req.body?.price !== undefined) product.price = Math.max(0, Number(req.body.price || 0));
  if (req.body?.sku !== undefined) product.sku = sanitizeText(req.body.sku, 80);
  if (req.body?.stock !== undefined) product.stock = Math.max(0, Number(req.body.stock || 0));
  if (req.body?.condition !== undefined) product.condition = sanitizeText(req.body.condition || "carded", 80) || "carded";
  if (req.body?.saleMode !== undefined) product.saleMode = normalizeSaleMode(req.body.saleMode, product.saleMode || "fixed");
  if (req.body?.series !== undefined) product.series = sanitizeText(req.body.series, 120);
  if (req.body?.images !== undefined) product.images = normalizeImages(req.body.images);
  if (req.body?.tags !== undefined) product.tags = normalizeTags(req.body.tags);
  if (req.body?.description !== undefined) product.description = sanitizeText(req.body.description, 5000);
  if (req.body?.badge !== undefined) product.badge = sanitizeText(req.body.badge, 60);
  if (req.body?.rating !== undefined) product.rating = Number(req.body.rating || 0);
  if (req.body?.isFeatured !== undefined) product.isFeatured = Boolean(req.body.isFeatured);
  if (req.body?.isNewDrop !== undefined) product.isNewDrop = Boolean(req.body.isNewDrop);
  product.categoryId = categoryState.categoryId;
  product.category = categoryState.category;

  await product.save();
  if (previousSaleMode !== "fixed" && product.saleMode === "fixed") {
    await Auction.deleteMany({ productId: product._id });
  }
  return res.json(product);
});

router.delete("/:identifier", async (req, res) => {
  const product = await findProduct(req.params.identifier);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  product.deletedAt = new Date();
  await product.save();
  await Auction.deleteMany({ productId: product._id });
  return res.json({ ok: true });
});

router.post("/:identifier/restore", async (req, res) => {
  const product = await findProduct(req.params.identifier);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  product.deletedAt = null;
  await product.save();
  return res.json({ ok: true });
});

router.delete("/:identifier/hard", async (req, res) => {
  const product = await findProduct(req.params.identifier);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  await Auction.deleteMany({ productId: product._id });
  await Product.findByIdAndDelete(product._id);
  return res.json({ ok: true });
});

module.exports = router;
