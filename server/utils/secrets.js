const crypto = require("crypto");
const { env } = require("../config/env");

const algorithm = "aes-256-gcm";
const encryptionKey = crypto.createHash("sha256").update(String(env.jwtSecret || "")).digest();

function encryptSecret(value) {
  const plain = String(value || "");
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${encrypted.toString("hex")}`;
}

function decryptSecret(value) {
  const payload = String(value || "").trim();
  if (!payload) return "";

  try {
    const [ivHex, tagHex, encryptedHex] = payload.split(".");
    if (!ivHex || !tagHex || !encryptedHex) return "";
    const decipher = crypto.createDecipheriv(
      algorithm,
      encryptionKey,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, "hex")),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

module.exports = {
  decryptSecret,
  encryptSecret
};
