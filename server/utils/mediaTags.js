const crypto = require("crypto");
const MEDIA_TAG_LENGTH = 4;
const MEDIA_TAG_PATTERN = /^[A-Z0-9]{4}$/;
const MEDIA_TAG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function isDuplicateKeyError(error) {
  return error && Number(error.code) === 11000;
}

function isValidMediaTagId(value) {
  return MEDIA_TAG_PATTERN.test(String(value || "").trim().toUpperCase());
}

function randomMediaTag(length = MEDIA_TAG_LENGTH) {
  const safeLength = Math.max(4, Number(length) || MEDIA_TAG_LENGTH);
  let output = "";
  while (output.length < safeLength) {
    output += MEDIA_TAG_ALPHABET[crypto.randomInt(0, MEDIA_TAG_ALPHABET.length)];
  }
  return output.slice(0, safeLength);
}

async function generateUniqueMediaTagId(exists, length = MEDIA_TAG_LENGTH) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = randomMediaTag(length);
    const alreadyExists = await exists(candidate);
    if (!alreadyExists) {
      return candidate;
    }
  }

  throw new Error("Unable to allocate a unique media tag id.");
}

async function ensureMediaAssetTagIds(assets, MediaAssetModel) {
  const list = Array.isArray(assets) ? assets : [];

  for (const asset of list) {
    const current = String(asset?.templateTagId || "").trim();
    if (isValidMediaTagId(current)) {
      asset.templateTagId = current.toUpperCase();
      continue;
    }

    for (let attempt = 0; attempt < 25; attempt += 1) {
      asset.templateTagId = await generateUniqueMediaTagId(
        (candidate) =>
          MediaAssetModel.exists({
            templateTagId: candidate,
            _id: { $ne: asset._id }
          }),
        MEDIA_TAG_LENGTH
      );

      try {
        await asset.save({ validateBeforeSave: false });
        break;
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          continue;
        }
        throw error;
      }
    }
  }

  return list;
}

module.exports = {
  ensureMediaAssetTagIds,
  generateUniqueMediaTagId,
  isDuplicateKeyError,
  isValidMediaTagId,
  MEDIA_TAG_LENGTH
};
