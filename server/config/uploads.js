const fs = require("fs");
const path = require("path");
const { env } = require("./env");

const uploadsRoot = env.uploadsDir;
const mediaUploadsDir = path.join(uploadsRoot, "media");

function ensureUploadsStructure() {
  [uploadsRoot, mediaUploadsDir].forEach((dir) => {
    fs.mkdirSync(dir, { recursive: true });
  });
}

module.exports = {
  uploadsRoot,
  mediaUploadsDir,
  ensureUploadsStructure
};
