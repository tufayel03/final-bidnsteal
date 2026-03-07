const bcrypt = require("bcryptjs");
const express = require("express");
const { env } = require("../config/env");
const User = require("../models/User");
const { clearSessionCookie, requireAuth, setSessionCookie, signSessionToken } = require("../middleware/auth");
const { sendTemplateEmail } = require("../services/emailService");
const { getPublicSiteProfile } = require("../services/siteProfileService");
const { createPasswordResetToken, hashPasswordResetToken } = require("../utils/passwordReset");
const { isValidEmail, normalizeEmail, passwordStrengthError, sanitizeText } = require("../utils/validation");

const router = express.Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    avatarUrl: user.avatarUrl || "",
    shippingAddress: user.shippingAddress || {}
  };
}

router.post("/register", async (req, res) => {
  const name = sanitizeText(req.body?.name, 120);
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  const phone = sanitizeText(req.body?.phone, 40);
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  const passwordError = passwordStrengthError(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "An account with this email already exists." });
  }

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    phone
  });

  const token = signSessionToken(user);
  setSessionCookie(res, token);

  return res.status(201).json({ user: sanitizeUser(user) });
});

router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  if (user.isSuspended) {
    return res.status(403).json({ message: "This account has been suspended." });
  }

  const isValid = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  user.lastLoginAt = new Date();
  await user.save();

  const token = signSessionToken(user);
  setSessionCookie(res, token);

  return res.json({ user: sanitizeUser(user) });
});

router.post("/logout", async (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  return res.json(sanitizeUser(req.user));
});

router.post("/forgot-password", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }

  const user = await User.findOne({ email }).select("+passwordResetToken +passwordResetExpiresAt");
  if (user) {
    const resetToken = createPasswordResetToken();
    user.passwordResetToken = resetToken.hashedToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const siteProfile = await getPublicSiteProfile();
    const storefrontBase = String(siteProfile.siteUrl || env.clientUrls[0] || "").replace(/\/$/, "");
    const resetLink = storefrontBase
      ? `${storefrontBase}/reset-password?token=${encodeURIComponent(resetToken.token)}`
      : `/reset-password?token=${encodeURIComponent(resetToken.token)}`;

    try {
      await sendTemplateEmail({
        templateKey: "password-reset",
        to: user.email,
        context: {
          customer: {
            name: user.name,
            email: user.email
          },
          site: {
            name: siteProfile.siteName || "BidnSteal",
            url: storefrontBase
          },
          support: {
            email: siteProfile.supportEmail || env.adminEmail
          },
          auth: {
            login_link: storefrontBase ? `${storefrontBase}/login` : "/login",
            reset_link: resetLink
          }
        },
        fallbackSubject: `Reset your ${siteProfile.siteName || "BidnSteal"} password`,
        fallbackHtml: `<p>Hello ${user.name || "there"},</p><p>Use the secure link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 60 minutes.</p>`
      });
    } catch (error) {
      console.error("[auth] failed to send password reset email", error);
    }
  }

  return res.json({
    ok: true,
    message: "If an account exists for that email, a reset instruction has been generated."
  });
});

router.post("/reset-password", async (req, res) => {
  const token = sanitizeText(req.body?.token, 256);
  const password = String(req.body?.password || "");
  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required." });
  }
  const passwordError = passwordStrengthError(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  const hashedToken = hashPasswordResetToken(token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() }
  }).select("+passwordHash +passwordResetToken +passwordResetExpiresAt");
  if (!user) {
    return res.status(400).json({ message: "Reset token is invalid or expired." });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.passwordResetToken = "";
  user.passwordResetExpiresAt = null;
  await user.save();

  return res.json({ ok: true });
});

module.exports = router;
