const crypto = require("crypto");

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hashedToken: hashPasswordResetToken(token)
  };
}

module.exports = {
  createPasswordResetToken,
  hashPasswordResetToken
};
