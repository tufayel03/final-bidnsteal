const { getSetting, setSetting } = require("./settingsService");
const { decryptSecret, encryptSecret } = require("../utils/secrets");

function defaultCourierSettings() {
  return {
    provider: "steadfast",
    enabled: false,
    baseUrl: "https://portal.packzy.com/api/v1",
    apiKey: "",
    secretKeyEncrypted: "",
    hasSecret: false,
    secretKeyMasked: "",
    fraudCheckerEnabled: false,
    fraudCheckerEmail: "",
    fraudCheckerPasswordEncrypted: "",
    fraudCheckerHasPassword: false,
    fraudCheckerPasswordMasked: "",
    defaultDeliveryType: 0,
    defaultItemDescription: "BidnSteal order"
  };
}

async function getCourierSettings() {
  const current = await getSetting("courier", defaultCourierSettings());
  return {
    ...defaultCourierSettings(),
    ...(current || {})
  };
}

function sanitizeCourierSettingsForClient(value = {}) {
  return {
    provider: "steadfast",
    enabled: Boolean(value.enabled),
    baseUrl: String(value.baseUrl || "https://portal.packzy.com/api/v1"),
    apiKey: String(value.apiKey || ""),
    hasSecret: Boolean(value.secretKeyEncrypted || value.hasSecret),
    secretKeyMasked: value.secretKeyEncrypted || value.hasSecret ? "********" : "",
    fraudCheckerEnabled: Boolean(value.fraudCheckerEnabled),
    fraudCheckerEmail: String(value.fraudCheckerEmail || ""),
    fraudCheckerHasPassword: Boolean(value.fraudCheckerPasswordEncrypted || value.fraudCheckerHasPassword),
    fraudCheckerPasswordMasked: value.fraudCheckerPasswordEncrypted || value.fraudCheckerHasPassword ? "********" : "",
    defaultDeliveryType: Number(value.defaultDeliveryType || 0) === 1 ? 1 : 0,
    defaultItemDescription: String(value.defaultItemDescription || "BidnSteal order")
  };
}

async function saveCourierSettings(input = {}) {
  const current = await getCourierSettings();
  const next = {
    provider: "steadfast",
    enabled: Boolean(input.enabled),
    baseUrl: String(input.baseUrl || current.baseUrl || "https://portal.packzy.com/api/v1").trim(),
    apiKey: String(input.apiKey || current.apiKey || "").trim(),
    secretKeyEncrypted: input.secretKey ? encryptSecret(input.secretKey) : current.secretKeyEncrypted || "",
    hasSecret: Boolean(input.secretKey || current.secretKeyEncrypted || current.hasSecret),
    secretKeyMasked: input.secretKey || current.secretKeyEncrypted || current.hasSecret ? "********" : "",
    fraudCheckerEnabled: Boolean(input.fraudCheckerEnabled),
    fraudCheckerEmail: String(input.fraudCheckerEmail || current.fraudCheckerEmail || "").trim(),
    fraudCheckerPasswordEncrypted: input.fraudCheckerPassword ? encryptSecret(input.fraudCheckerPassword) : current.fraudCheckerPasswordEncrypted || "",
    fraudCheckerHasPassword: Boolean(input.fraudCheckerPassword || current.fraudCheckerPasswordEncrypted || current.fraudCheckerHasPassword),
    fraudCheckerPasswordMasked: input.fraudCheckerPassword || current.fraudCheckerPasswordEncrypted || current.fraudCheckerHasPassword ? "********" : "",
    defaultDeliveryType: Number(input.defaultDeliveryType || 0) === 1 ? 1 : 0,
    defaultItemDescription: String(input.defaultItemDescription || current.defaultItemDescription || "BidnSteal order").trim() || "BidnSteal order"
  };
  await setSetting("courier", next);
  return next;
}

async function parseCourierResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function steadfastRequest(endpoint, options = {}) {
  const settings = await getCourierSettings();
  const apiKey = String(settings.apiKey || "").trim();
  const secretKey = decryptSecret(settings.secretKeyEncrypted);

  if (!settings.enabled) {
    throw new Error("Steadfast courier integration is disabled.");
  }
  if (!apiKey || !secretKey) {
    throw new Error("Steadfast API credentials are incomplete.");
  }

  const headers = new Headers({
    Accept: "application/json",
    "X-Steadfast-Api-Key": apiKey,
    "X-Steadfast-Secret-Key": secretKey,
    "Api-Key": apiKey,
    "Secret-Key": secretKey
  });
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${String(settings.baseUrl || "").replace(/\/$/, "")}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  const payload = await parseCourierResponse(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && typeof payload.message === "string"
        ? payload.message
        : `Steadfast request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function normalizeDeliveryStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

async function getSteadfastBalance() {
  const payload = await steadfastRequest("/get_balance");
  return {
    currentBalance: Number(payload.current_balance ?? payload.currentBalance ?? 0),
    currency: "BDT",
    raw: payload
  };
}

async function createSteadfastOrder(order) {
  const settings = await getCourierSettings();
  const address = [
    order.shippingAddress?.addressLine1,
    order.shippingAddress?.addressLine2,
    order.shippingAddress?.area,
    order.shippingAddress?.city,
    order.shippingAddress?.postalCode,
    order.shippingAddress?.country
  ]
    .filter(Boolean)
    .join(", ");

  const payload = await steadfastRequest("/create_order", {
    method: "POST",
    body: {
      invoice: order.orderNumber,
      recipient_name: order.shippingAddress?.fullName || order.customerName,
      recipient_phone: order.shippingAddress?.phone || "",
      recipient_address: address,
      cod_amount: order.paymentStatus === "paid" ? 0 : Number(order.total || 0),
      note: order.customerNote || "",
      item_description: settings.defaultItemDescription || "BidnSteal order",
      delivery_type: Number(settings.defaultDeliveryType || 0) === 1 ? 1 : 0
    }
  });

  const consignment = payload.consignment || payload.data || payload.ResponseMessage || payload;
  return {
    consignmentId: String(consignment.consignment_id || consignment.consignmentId || "").trim(),
    trackingCode: String(consignment.tracking_code || consignment.trackingCode || "").trim(),
    deliveryStatus: normalizeDeliveryStatus(consignment.status || payload.delivery_status || payload.status || "pending"),
    raw: payload
  };
}

async function getSteadfastStatusByConsignmentId(consignmentId) {
  const payload = await steadfastRequest(`/status_by_cid/${encodeURIComponent(String(consignmentId || "").trim())}`);
  return {
    deliveryStatus: normalizeDeliveryStatus(payload.delivery_status || payload.status || payload.current_status || payload.currentStatus || "unknown"),
    raw: payload
  };
}

module.exports = {
  createSteadfastOrder,
  defaultCourierSettings,
  getCourierSettings,
  getSteadfastBalance,
  getSteadfastStatusByConsignmentId,
  normalizeDeliveryStatus,
  sanitizeCourierSettingsForClient,
  saveCourierSettings
};
