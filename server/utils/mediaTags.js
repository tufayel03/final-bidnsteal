const crypto = require("crypto");

function isDuplicateKeyError(error) {
  return error && Number(error.code) === 11000;
}

function randomDigitString(length = 12) {
  const safeLength = Math.max(8, Number(length) || 12);
  let output = "";
  while (output.length < safeLength) {
    output += crypto.randomInt(0, 10).toString();
  }
  return output.slice(0, safeLength);
}

async function generateUniqueMediaTagId(exists, length = 12) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = randomDigitString(length);
    const alreadyExists = await exists(candidate);
    if (!alreadyExists) {
      return candidate;
    }
  }

  const timestampSeed = `${Date.now()}${randomDigitString(4)}`;
  const alreadyExists = await exists(timestampSeed);
  if (!alreadyExists) {
    return timestampSeed;
  }

  throw new Error("Unable to allocate a unique media tag id.");
}

async function ensureMediaAssetTagIds(assets, MediaAssetModel) {
  const list = Array.isArray(assets) ? assets : [];

  for (const asset of list) {
    const current = String(asset?.templateTagId || "").trim();
    if (/^\d+$/.test(current)) {
      continue;
    }

    for (let attempt = 0; attempt < 25; attempt += 1) {
      asset.templateTagId = await generateUniqueMediaTagId(
        (candidate) =>
          MediaAssetModel.exists({
            templateTagId: candidate,
            _id: { $ne: asset._id }
          }),
        12
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
  isDuplicateKeyError
};
