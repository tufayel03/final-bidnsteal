const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const User = require("../models/User");
const { cookieOptions } = require("./security");

function signSessionToken(user) {
  return jwt.sign(
    {
      sub: user.id || user._id.toString(),
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    { expiresIn: Math.max(60, Math.floor(env.sessionTtlMs / 1000)) }
  );
}

function setSessionCookie(res, token) {
  res.cookie(env.cookieName, token, cookieOptions(true));
}

function clearSessionCookie(res) {
  res.clearCookie(env.cookieName, {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSecure,
    domain: env.cookieDomain,
    path: "/"
  });
}

async function attachUser(req, _res, next) {
  req.user = null;
  const token = req.cookies?.[env.cookieName];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub);
    if (user && !user.isSuspended) {
      req.user = user;
    }
  } catch {
    req.user = null;
  }

  return next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required." });
  }
  return next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
  signSessionToken,
  setSessionCookie,
  clearSessionCookie
};
