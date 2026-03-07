function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function sanitizeText(value, maxLength = 255) {
  return String(value || "").trim().slice(0, maxLength);
}

function passwordStrengthError(password) {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[a-z]/.test(value)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter.";
  if (!/\d/.test(value)) return "Password must include a number.";
  return "";
}

function normalizeShippingAddress(input = {}, fallback = {}) {
  const source = input && typeof input === "object" ? input : {};
  const defaults = fallback && typeof fallback === "object" ? fallback : {};
  return {
    fullName: sanitizeText(source.fullName || defaults.fullName, 120),
    phone: sanitizeText(source.phone || defaults.phone, 40),
    addressLine1: sanitizeText(source.addressLine1 || defaults.addressLine1, 180),
    addressLine2: sanitizeText(source.addressLine2 || defaults.addressLine2, 180),
    area: sanitizeText(source.area || defaults.area, 120),
    city: sanitizeText(source.city || defaults.city, 120),
    postalCode: sanitizeText(source.postalCode || defaults.postalCode, 40),
    country: sanitizeText(source.country || defaults.country || "BD", 40) || "BD"
  };
}

function hasRequiredShippingAddress(address) {
  return Boolean(
    sanitizeText(address?.fullName) &&
      sanitizeText(address?.phone) &&
      sanitizeText(address?.addressLine1) &&
      sanitizeText(address?.city)
  );
}

module.exports = {
  hasRequiredShippingAddress,
  isValidEmail,
  normalizeEmail,
  normalizeShippingAddress,
  passwordStrengthError,
  sanitizeText
};
