const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const { requireAdmin } = require("../middleware/auth");
const { containsRegex } = require("../utils/http");
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

async function uniqueSlug(base, excludeId = "") {
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

async function syncCategoriesFromProducts() {
  await ensureDefaultCategory();
  const categoryNames = await Product.distinct("category", {
    category: { $exists: true, $nin: ["", null] }
  });

  for (const categoryName of categoryNames) {
    const safeName = sanitizeText(categoryName, 120);
    if (!safeName) continue;
    const slug = slugify(safeName);
    const existing = await ProductCategory.findOne({
      $or: [{ slug }, { name: safeName }]
    }).select("_id");
    if (!existing) {
      await ProductCategory.create({
        name: safeName,
        slug: await uniqueSlug(safeName),
        description: ""
      });
    }
  }
}

async function getCategoryCounts() {
  const rows = await Product.aggregate([
    {
      $match: {
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
      }
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    }
  ]);

  return rows.reduce((accumulator, row) => {
    const key = String(row?._id || "").trim();
    if (key) {
      accumulator[key] = Number(row?.count || 0);
    }
    return accumulator;
  }, {});
}

async function findCategory(identifier) {
  const lookup = String(identifier || "").trim();
  if (!lookup) return null;

  if (mongoose.Types.ObjectId.isValid(lookup)) {
    const byId = await ProductCategory.findById(lookup);
    if (byId) return byId;
  }

  return ProductCategory.findOne({ slug: lookup });
}

router.use(requireAdmin);

router.get("/", async (req, res) => {
  await syncCategoriesFromProducts();

  const search = String(req.query.search || "").trim();
  const query = {};
  if (search) {
    const searchRegex = containsRegex(search);
    query.$or = [{ name: searchRegex }, { slug: searchRegex }, { description: searchRegex }];
  }

  const [items, counts, defaultCategory] = await Promise.all([
    ProductCategory.find(query).sort({ name: 1 }),
    getCategoryCounts(),
    ensureDefaultCategory()
  ]);

  return res.json(
    items.map((item) => {
      const normalized = item.toJSON();
      return {
        ...normalized,
        productCount: Number(counts[normalized.name] || 0),
        isDefault: normalized.id === defaultCategory.id
      };
    })
  );
});

router.post("/", async (req, res) => {
  const name = sanitizeText(req.body?.name, 120);
  if (!name) {
    return res.status(400).json({ message: "Category name is required." });
  }

  const slug = await uniqueSlug(req.body?.slug || name);
  const nameConflict = await ProductCategory.findOne({
    name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
  }).select("_id");
  if (nameConflict) {
    return res.status(409).json({ message: "A category with that name already exists." });
  }

  const category = await ProductCategory.create({
    name,
    slug,
    description: sanitizeText(req.body?.description, 300)
  });

  return res.status(201).json({
    ...category.toJSON(),
    productCount: 0,
    isDefault: slug === slugify(DEFAULT_CATEGORY_NAME)
  });
});

router.patch("/:identifier", async (req, res) => {
  const category = await findCategory(req.params.identifier);
  if (!category) {
    return res.status(404).json({ message: "Category not found." });
  }

  const previousName = category.name;
  const nextName = sanitizeText(req.body?.name, 120) || category.name;
  const nextDescription = req.body?.description !== undefined
    ? sanitizeText(req.body.description, 300)
    : category.description;

  const nameConflict = await ProductCategory.findOne({
    _id: { $ne: category._id },
    name: { $regex: `^${nextName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
  }).select("_id");
  if (nameConflict) {
    return res.status(409).json({ message: "A category with that name already exists." });
  }

  category.name = nextName;
  category.slug = await uniqueSlug(req.body?.slug || nextName, category.id);
  category.description = nextDescription || "";
  await category.save();

  if (previousName !== category.name) {
    await Product.updateMany(
      {
        $or: [{ categoryId: category._id }, { category: previousName }]
      },
      {
        $set: {
          category: category.name,
          categoryId: category._id
        }
      }
    );
  }

  const counts = await getCategoryCounts();
  return res.json({
    ...category.toJSON(),
    productCount: Number(counts[category.name] || 0),
    isDefault: category.slug === slugify(DEFAULT_CATEGORY_NAME)
  });
});

router.delete("/:identifier", async (req, res) => {
  const category = await findCategory(req.params.identifier);
  if (!category) {
    return res.status(404).json({ message: "Category not found." });
  }

  const defaultCategory = await ensureDefaultCategory();
  if (String(category._id) === String(defaultCategory._id)) {
    return res.status(400).json({ message: "The default category cannot be deleted." });
  }

  const reassignment = await Product.updateMany(
    {
      $or: [{ categoryId: category._id }, { category: category.name }]
    },
    {
      $set: {
        category: defaultCategory.name,
        categoryId: defaultCategory._id
      }
    }
  );

  await ProductCategory.findByIdAndDelete(category._id);
  return res.json({
    ok: true,
    reassignedProducts: Number(reassignment.modifiedCount || 0),
    fallbackCategory: defaultCategory.name
  });
});

module.exports = router;
