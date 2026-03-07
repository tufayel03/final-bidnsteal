function resolveDefaultApiBase() {
  if (import.meta.env.DEV && typeof window !== "undefined") {
    const host = window.location.hostname || "127.0.0.1";
    return `http://${host}:4000/api`;
  }
  return "/api";
}

export const API_BASE = import.meta.env.VITE_API_BASE
  ? String(import.meta.env.VITE_API_BASE).replace(/\/$/, "")
  : resolveDefaultApiBase();

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
let csrfCache: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

function resolveApiOrigin() {
  if (typeof window === "undefined") return "";
  try {
    return new URL(API_BASE, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

export function assetUrl(value: string) {
  if (!value) return "";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }
  const normalized = value.startsWith("/") ? value : `/${value}`;
  if (normalized.startsWith("/uploads/")) {
    return `${resolveApiOrigin()}${normalized}`;
  }
  return normalized;
}

async function readPayload(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function fetchCsrfToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && csrfCache) return csrfCache;
  if (!forceRefresh && csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/csrf-token`, {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });
      const payload = await readPayload(response);
      if (response.ok && payload && typeof payload === "object" && "csrfToken" in payload && typeof payload.csrfToken === "string") {
        csrfCache = payload.csrfToken;
        return csrfCache;
      }
    } catch {
      return null;
    } finally {
      csrfPromise = null;
    }

    return null;
  })();

  return csrfPromise;
}

export async function apiRequest<T>(path: string, options: Omit<RequestInit, "body"> & { body?: unknown } = {}): Promise<T> {
  const method = String(options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  let body = options.body as BodyInit | undefined;

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  if (!SAFE_METHODS.has(method) && !headers.has("x-csrf-token")) {
    const csrfToken = await fetchCsrfToken();
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  const response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
    ...options,
    method,
    headers,
    body,
    credentials: "include"
  });

  if (response.status === 403 && !SAFE_METHODS.has(method) && !headers.has("x-csrf-retry")) {
    const refreshed = await fetchCsrfToken(true);
    if (refreshed) {
      headers.set("x-csrf-token", refreshed);
      headers.set("x-csrf-retry", "1");
      const retryResponse = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
        ...options,
        method,
        headers,
        body,
        credentials: "include"
      });
      const retryPayload = await readPayload(retryResponse);
      if (!retryResponse.ok) {
        const retryMessage =
          retryPayload && typeof retryPayload === "object" && "message" in retryPayload && typeof retryPayload.message === "string"
            ? retryPayload.message
            : `Request failed (${retryResponse.status})`;
        throw new Error(retryMessage);
      }
      return retryPayload as T;
    }
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}
