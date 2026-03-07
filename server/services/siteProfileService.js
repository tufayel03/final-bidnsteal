const { env } = require("../config/env");
const { getSetting } = require("./settingsService");

function sanitizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    return "";
  }

  return "";
}

function sanitizeText(value, maxLength = 255) {
  return String(value || "").trim().slice(0, maxLength);
}

function sanitizePhone(value) {
  return String(value || "").replace(/[^\d+]/g, "").slice(0, 32);
}

function sanitizeWhatsappNumber(value) {
  return String(value || "").replace(/\D+/g, "").slice(0, 20);
}

function defaultSiteProfile() {
  return {
    siteName: sanitizeText(env.siteName || "BidnSteal", 120) || "BidnSteal",
    siteUrl: sanitizeUrl(env.siteUrl || env.clientUrls[0] || ""),
    supportEmail: sanitizeText(env.supportEmail || env.adminEmail || "", 255).toLowerCase(),
    supportPhone: sanitizePhone(env.supportPhone || ""),
    supportWhatsappNumber: sanitizeWhatsappNumber(env.supportWhatsappNumber || env.supportPhone || ""),
    facebookUrl: sanitizeUrl(env.facebookUrl || "")
  };
}

function normalizeSiteProfile(value = {}) {
  const fallback = defaultSiteProfile();
  return {
    siteName: sanitizeText(value.siteName || fallback.siteName, 120) || fallback.siteName,
    siteUrl: sanitizeUrl(value.siteUrl || fallback.siteUrl),
    supportEmail: sanitizeText(value.supportEmail || fallback.supportEmail, 255).toLowerCase(),
    supportPhone: sanitizePhone(value.supportPhone || fallback.supportPhone),
    supportWhatsappNumber: sanitizeWhatsappNumber(value.supportWhatsappNumber || fallback.supportWhatsappNumber),
    facebookUrl: sanitizeUrl(value.facebookUrl || fallback.facebookUrl)
  };
}

function buildSupportLinks(profile) {
  const supportPhoneDigits = sanitizeWhatsappNumber(profile.supportPhone);
  return {
    whatsappUrl: profile.supportWhatsappNumber ? `https://wa.me/${profile.supportWhatsappNumber}` : "",
    supportPhoneUrl: supportPhoneDigits ? `tel:${supportPhoneDigits}` : "",
    supportEmailUrl: profile.supportEmail ? `mailto:${profile.supportEmail}` : ""
  };
}

async function getPublicSiteProfile() {
  const saved = await getSetting("siteProfile", {});
  const profile = normalizeSiteProfile(saved);
  return {
    ...profile,
    ...buildSupportLinks(profile)
  };
}

module.exports = {
  buildSupportLinks,
  defaultSiteProfile,
  getPublicSiteProfile,
  normalizeSiteProfile
};
