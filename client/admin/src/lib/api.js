const apiBaseEnv = import.meta.env.VITE_API_BASE;

function resolveDefaultApiBase() {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:4000/api`;
  }
  return "/api";
}

export const API_BASE = apiBaseEnv
  ? apiBaseEnv.replace(/\/$/, "")
  : resolveDefaultApiBase();

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
let csrfCache = null;

async function readPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function isCsrfFailure(payload) {
  return payload && typeof payload === "object" && /csrf/i.test(String(payload.message || ""));
}

async function fetchCsrfToken(forceRefresh = false) {
  if (!forceRefresh && csrfCache) return csrfCache;
  try {
    const res = await fetch(`${API_BASE}/csrf-token`, {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
    const payload = await readPayload(res);
    if (res.ok && payload && typeof payload.csrfToken === "string") {
      csrfCache = payload.csrfToken;
      return csrfCache;
    }
  } catch {
    // ignore
  }
  return null;
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const isFormData = options.body instanceof FormData;

  if (options.body !== undefined && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!SAFE_METHODS.has(method) && !headers.has("x-csrf-token")) {
    const csrf = await fetchCsrfToken();
    if (csrf) headers.set("x-csrf-token", csrf);
  }

  const sendRequest = async () => {
    const body =
      options.body === undefined
        ? undefined
        : isFormData
          ? options.body
          : JSON.stringify(options.body);

    const response = await fetch(`${API_BASE}${normalizedPath}`, {
      method,
      credentials: "include",
      headers,
      body,
      cache: method === "GET" ? "default" : "no-store"
    });
    const payload = await readPayload(response);
    return { response, payload };
  };

  let result = await sendRequest();

  if (!SAFE_METHODS.has(method) && result.response.status === 403 && isCsrfFailure(result.payload)) {
    const refreshed = await fetchCsrfToken(true);
    if (refreshed) {
      headers.set("x-csrf-token", refreshed);
      result = await sendRequest();
    }
  }

  if (!result.response.ok) {
    const message =
      result.payload && typeof result.payload === "object" && typeof result.payload.message === "string"
        ? result.payload.message
        : `Request failed (${result.response.status})`;
    const error = new Error(message);
    error.status = result.response.status;
    error.payload = result.payload;
    throw error;
  }

  return result.payload;
}

export const adminAuth = {
  key: "bidnsteal_admin_gate",
  read() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  },
  write(email) {
    const now = Date.now();
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      this.key,
      JSON.stringify({
        role: "admin",
        email,
        createdAt: now,
        expiresAt
      })
    );
  },
  clear() {
    localStorage.removeItem(this.key);
  },
  valid() {
    const gate = this.read();
    return Boolean(gate && Number(gate.expiresAt || 0) > Date.now());
  }
};
