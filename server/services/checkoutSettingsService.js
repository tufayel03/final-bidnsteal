const { getSetting, setSetting } = require("./settingsService");

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function normalizeCharge(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return roundMoney(fallback);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return roundMoney(fallback);
  }

  return roundMoney(parsed);
}

function defaultCheckoutSettings() {
  return {
    allowGuestOrder: false,
    deliveryChargeDhaka: 0,
    deliveryChargeOutsideDhaka: 0
  };
}

async function getCheckoutSettings() {
  const current = await getSetting("checkout", defaultCheckoutSettings());
  return {
    ...defaultCheckoutSettings(),
    ...(current || {}),
    allowGuestOrder: Boolean(current?.allowGuestOrder),
    deliveryChargeDhaka: normalizeCharge(current?.deliveryChargeDhaka, 0),
    deliveryChargeOutsideDhaka: normalizeCharge(current?.deliveryChargeOutsideDhaka, 0)
  };
}

function sanitizeCheckoutSettingsForClient(value = {}) {
  return {
    allowGuestOrder: Boolean(value.allowGuestOrder),
    deliveryChargeDhaka: normalizeCharge(value.deliveryChargeDhaka, 0),
    deliveryChargeOutsideDhaka: normalizeCharge(value.deliveryChargeOutsideDhaka, 0)
  };
}

async function saveCheckoutSettings(input = {}) {
  const current = await getCheckoutSettings();
  const next = {
    allowGuestOrder: Boolean(input.allowGuestOrder),
    deliveryChargeDhaka: normalizeCharge(input.deliveryChargeDhaka, current.deliveryChargeDhaka),
    deliveryChargeOutsideDhaka: normalizeCharge(
      input.deliveryChargeOutsideDhaka,
      current.deliveryChargeOutsideDhaka
    )
  };

  await setSetting("checkout", next);
  return next;
}

function isDhakaAddress(shippingAddress = {}) {
  const candidates = [shippingAddress.city, shippingAddress.area];
  return candidates.some((value) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z]+/g, " ");
    return normalized.includes("dhaka") || normalized.includes("dacca");
  });
}

function resolveDeliveryCharge(shippingAddress = {}, settings = defaultCheckoutSettings()) {
  const charges = sanitizeCheckoutSettingsForClient(settings);
  return isDhakaAddress(shippingAddress)
    ? charges.deliveryChargeDhaka
    : charges.deliveryChargeOutsideDhaka;
}

module.exports = {
  defaultCheckoutSettings,
  getCheckoutSettings,
  resolveDeliveryCharge,
  sanitizeCheckoutSettingsForClient,
  saveCheckoutSettings
};
