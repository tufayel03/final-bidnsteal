const { getSetting, setSetting } = require("./settingsService");
const { decryptSecret, encryptSecret } = require("../utils/secrets");

const merchantSessionCache = {
  cookies: null,
  expiresAt: 0
};

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
  merchantSessionCache.cookies = null;
  merchantSessionCache.expiresAt = 0;
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

function mergeCookieJar(jar, headers) {
  const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
  for (const line of setCookies) {
    const segment = String(line || "").split(";")[0];
    const separatorIndex = segment.indexOf("=");
    if (separatorIndex <= 0) continue;
    jar.set(segment.slice(0, separatorIndex), segment.slice(separatorIndex + 1));
  }
}

function buildCookieHeader(jar) {
  return Array.from(jar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function buildBrowserHeaders(jar, overrides = {}) {
  const headers = new Headers({
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "accept-language": "en-US,en;q=0.9",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    ...overrides
  });
  if (jar && jar.size) {
    headers.set("Cookie", buildCookieHeader(jar));
  }
  return headers;
}

async function requestMerchantPage(url, jar, options = {}) {
  const response = await fetch(url, {
    method: options.method || "GET",
    redirect: "manual",
    headers: buildBrowserHeaders(jar, options.headers),
    body: options.body
  });

  mergeCookieJar(jar, response.headers);

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();
  let json = null;
  if (contentType.includes("application/json")) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return {
    url,
    status: response.status,
    location: response.headers.get("location"),
    contentType,
    text,
    json
  };
}

async function followMerchantRedirects(url, jar, referer = "https://steadfast.com.bd/login") {
  let currentUrl = url;
  let currentReferer = referer;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const result = await requestMerchantPage(currentUrl, jar, {
      headers: currentReferer ? { Referer: currentReferer } : undefined
    });

    if (result.status >= 300 && result.status < 400 && result.location) {
      currentReferer = currentUrl;
      currentUrl = result.location;
      continue;
    }

    return {
      ...result,
      url: currentUrl
    };
  }

  throw new Error("Steadfast merchant flow redirected too many times.");
}

function extractLoginToken(html) {
  const match = String(html || "").match(/name=["']_token["'][^>]*value=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

async function loginSteadfastMerchant(forceRefresh = false) {
  const settings = await getCourierSettings();
  const email = String(settings.fraudCheckerEmail || "").trim();
  const password = decryptSecret(settings.fraudCheckerPasswordEncrypted);

  if (!settings.fraudCheckerEnabled) {
    throw new Error("Enable Customer Success Check in Settings > Courier Integration.");
  }
  if (!email || !password) {
    throw new Error("SteadFast merchant login credentials are incomplete.");
  }

  if (!forceRefresh && merchantSessionCache.cookies && merchantSessionCache.expiresAt > Date.now()) {
    return new Map(merchantSessionCache.cookies);
  }

  const jar = new Map();
  const loginPage = await requestMerchantPage("https://steadfast.com.bd/login", jar);
  const token = extractLoginToken(loginPage.text);

  if (!token) {
    throw new Error("Unable to prepare SteadFast merchant login session.");
  }

  const response = await requestMerchantPage("https://steadfast.com.bd/login", jar, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://steadfast.com.bd",
      Referer: "https://steadfast.com.bd/login"
    },
    body: new URLSearchParams({
      _token: token,
      email,
      password
    })
  });

  const nextUrl = response.location || "https://steadfast.com.bd/home";
  const settled = await followMerchantRedirects(nextUrl, jar, "https://steadfast.com.bd/login");
  const loggedIn =
    settled.status === 200 &&
    (settled.url.includes("/dashboard") || settled.text.includes("Fraud Check") || settled.text.includes("Logout"));

  if (!loggedIn) {
    throw new Error("SteadFast merchant login failed. Check the fraud-checker email and password.");
  }

  merchantSessionCache.cookies = Array.from(jar.entries());
  merchantSessionCache.expiresAt = Date.now() + 10 * 60 * 1000;
  return new Map(merchantSessionCache.cookies);
}

async function fetchSteadfastCustomerHistory(phoneNumber) {
  const normalizedPhone = String(phoneNumber || "").replace(/\D+/g, "");
  if (!normalizedPhone) {
    return {
      phoneNumber: "",
      totalOrders: 0,
      totalDelivered: 0,
      totalCancelled: 0,
      successRatio: 0,
      hasFraudHistory: false,
      fraudCount: 0,
      raw: null
    };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const jar = await loginSteadfastMerchant(attempt > 0);
    const response = await requestMerchantPage(`https://steadfast.com.bd/user/frauds/check/${encodeURIComponent(normalizedPhone)}`, jar, {
      headers: {
        Accept: "application/json,text/plain,*/*",
        Referer: "https://steadfast.com.bd/user/frauds/check"
      }
    });

    if (response.status === 401 || response.status === 419 || response.status === 302 || response.url?.includes("/login")) {
      merchantSessionCache.cookies = null;
      merchantSessionCache.expiresAt = 0;
      if (attempt === 0) {
        continue;
      }
      throw new Error("SteadFast merchant session expired. Please save the courier login again.");
    }

    const payload = response.json;
    if (!payload || typeof payload !== "object") {
      throw new Error("SteadFast returned an invalid customer history response.");
    }

    const totalDelivered = Number(payload.total_delivered || payload.totalDelivered || 0);
    const totalCancelled = Number(payload.total_cancelled || payload.totalCancelled || 0);
    const totalOrders = Number(payload.total_orders || payload.totalOrders || totalDelivered + totalCancelled);
    const successRatio =
      totalOrders > 0 ? Number(((totalDelivered / totalOrders) * 100).toFixed(2)) : 0;
    const frauds = Array.isArray(payload.frauds) ? payload.frauds : [];

    merchantSessionCache.cookies = Array.from(jar.entries());
    merchantSessionCache.expiresAt = Date.now() + 10 * 60 * 1000;

    return {
      phoneNumber: normalizedPhone,
      totalOrders,
      totalDelivered,
      totalCancelled,
      successRatio,
      hasFraudHistory: frauds.length > 0,
      fraudCount: frauds.length,
      raw: payload
    };
  }

  throw new Error("Unable to load SteadFast customer history.");
}

module.exports = {
  createSteadfastOrder,
  defaultCourierSettings,
  fetchSteadfastCustomerHistory,
  getCourierSettings,
  getSteadfastBalance,
  getSteadfastStatusByConsignmentId,
  normalizeDeliveryStatus,
  sanitizeCourierSettingsForClient,
  saveCourierSettings
};
