import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { adminAuth, apiRequest } from "../lib/api";

const LOCAL_ADMIN_EMAIL = "admin@bidnsteal.com";

function safeNext(value) {
  if (!value) return "/tufayel/panel";
  try {
    const next = new URL(value, window.location.origin);
    if (next.origin !== window.location.origin) return "/tufayel/panel";
    if (!next.pathname.startsWith("/tufayel")) return "/tufayel/panel";
    return `${next.pathname}${next.search}${next.hash}`;
  } catch {
    return "/tufayel/panel";
  }
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = useMemo(() => safeNext(params.get("next")), [params]);

  const [email, setEmail] = useState(LOCAL_ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      try {
        const me = await apiRequest("/auth/me");
        if (!cancelled && me?.role === "admin") {
          navigate(nextPath, { replace: true });
          return;
        }
      } catch {
        // stale client-side admin gate; clear it and stay on the login page
      }

      adminAuth.clear();
      if (!cancelled) {
        setCheckingSession(false);
      }
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [navigate, nextPath]);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest("/auth/login", {
        method: "POST",
        body: { email, password }
      });

      if (payload?.user?.role !== "admin") {
        adminAuth.clear();
        setError("Invalid admin email or password.");
        return;
      }

      adminAuth.write(String(payload.user.email || email).trim().toLowerCase());
      navigate(nextPath, { replace: true });
    } catch {
      adminAuth.clear();
      setError("Invalid admin email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell center admin-auth-shell">
      <section className="card auth-card admin-auth-card">
        <div className="admin-auth-kicker">Admin Workspace</div>

        <div className="brand-row admin-auth-brand">
          <div className="badge admin-auth-badge">B</div>
          <div className="admin-auth-brand-copy">
            <h1>BIDNSTEAL</h1>
            <p>Admin access portal</p>
          </div>
        </div>

        {checkingSession ? (
          <p className="muted admin-auth-muted">Checking admin session...</p>
        ) : (
          <form onSubmit={onSubmit} className="auth-form admin-auth-form">
            <label>Admin Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />

            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

            {error ? <p className="error-text admin-auth-error">{error}</p> : null}

            <button type="submit" disabled={loading} className="admin-auth-submit">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        <p className="muted admin-auth-muted">Session stays signed in for 7 days on this browser.</p>
      </section>
    </main>
  );
}
