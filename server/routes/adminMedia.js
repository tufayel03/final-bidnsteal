const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const express = require("express");
const multer = require("multer");
const { env } = require("../config/env");
const { ensureUploadsStructure, mediaUploadsDir } = require("../config/uploads");
const MediaAsset = require("../models/MediaAsset");
const { requireAdmin } = require("../middleware/auth");
const { containsRegex, parsePagination } = require("../utils/http");

const router = express.Router();
const uploadDir = mediaUploadsDir;
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml"
]);
const mimeExtensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg"
};

ensureUploadsStructure();

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const ext = mimeExtensions[file.mimetype] || path.extname(file.originalname || "").toLowerCase();
    callback(null, `${crypto.randomBytes(18).toString("hex")}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: env.uploadMaxFileSizeBytes
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      const error = new Error("Only image uploads are allowed.");
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  }
});

router.use(requireAdmin);

router.get("/", async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 30, 100);
  const search = String(req.query.search || "").trim();
  const trash = req.query.trash === "true";

  const query = trash
    ? { deletedAt: { $ne: null } }
    : { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };

  if (search) {
    query.fileName = containsRegex(search);
  }

  const [items, total] = await Promise.all([
    MediaAsset.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    MediaAsset.countDocuments(query)
  ]);

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File is required." });
  }

  const asset = await MediaAsset.create({
    fileName: req.file.filename,
    originalName: path.basename(String(req.file.originalname || "").trim()),
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/media/${req.file.filename}`
  });

  return res.status(201).json(asset);
});

router.delete("/:fileName", async (req, res) => {
  const asset = await MediaAsset.findOne({ fileName: req.params.fileName });
  if (!asset) {
    return res.status(404).json({ message: "Media not found." });
  }
  asset.deletedAt = new Date();
  await asset.save();
  return res.json({ ok: true });
});

router.post("/:fileName/restore", async (req, res) => {
  const asset = await MediaAsset.findOne({ fileName: req.params.fileName });
  if (!asset) {
    return res.status(404).json({ message: "Media not found." });
  }
  asset.deletedAt = null;
  await asset.save();
  return res.json({ ok: true });
});

router.delete("/:fileName/hard", async (req, res) => {
  const asset = await MediaAsset.findOneAndDelete({ fileName: req.params.fileName });
  if (!asset) {
    return res.status(404).json({ message: "Media not found." });
  }

  const filePath = path.join(uploadDir, asset.fileName);
  await fs.promises.rm(filePath, { force: true });

  return res.json({ ok: true });
});

router.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `File size exceeds ${env.uploadMaxFileSizeBytes} bytes.` });
    }
    return res.status(400).json({ message: error.message || "Upload failed." });
  }

  if (error?.status) {
    return res.status(error.status).json({ message: error.message });
  }

  return next(error);
});

module.exports = router;
