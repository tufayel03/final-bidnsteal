const crypto = require("crypto");

function makeOrderNumber(prefix = "ORD") {
  const time = Date.now().toString().slice(-8);
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${String(prefix || "ORD").toUpperCase()}-${time}-${random}`;
}

module.exports = { makeOrderNumber };
