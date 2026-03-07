const nodemailer = require("nodemailer");
const { getSetting } = require("./settingsService");
const { decryptSecret } = require("../utils/secrets");

function defaultSmtpSettings() {
  return {
    enabled: false,
    host: "",
    port: 465,
    secure: true,
    username: "",
    passwordEncrypted: "",
    hasPassword: false,
    passwordMasked: "",
    fromEmail: "",
    fromName: "",
    replyTo: "",
    ignoreTLS: false
  };
}

async function getSmtpSettings() {
  const current = await getSetting("smtp", defaultSmtpSettings());
  return {
    ...defaultSmtpSettings(),
    ...(current || {})
  };
}

function resolveContextValue(context, path) {
  return String(path || "")
    .split(".")
    .reduce((value, key) => (value && value[key] !== undefined ? value[key] : ""), context);
}

function renderTemplateString(template, context) {
  return String(template || "").replace(/\{\{\s*([^}]+)\s*\}\}/g, (_match, key) => {
    const value = resolveContextValue(context, String(key || "").trim());
    return value === undefined || value === null ? "" : String(value);
  });
}

async function createTransport() {
  const smtp = await getSmtpSettings();
  const password = decryptSecret(smtp.passwordEncrypted);

  if (!smtp.enabled) {
    throw new Error("SMTP is disabled. Configure SMTP in admin settings first.");
  }
  if (!smtp.host || !smtp.port || !smtp.username || !password || !smtp.fromEmail) {
    throw new Error("SMTP settings are incomplete.");
  }

  return nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port || 465),
    secure: smtp.secure !== false,
    auth: {
      user: smtp.username,
      pass: password
    },
    ignoreTLS: Boolean(smtp.ignoreTLS)
  });
}

async function sendEmail({ to, subject, html, text, replyTo }) {
  const smtp = await getSmtpSettings();
  const transport = await createTransport();

  return transport.sendMail({
    from: smtp.fromName ? `${smtp.fromName} <${smtp.fromEmail}>` : smtp.fromEmail,
    to,
    replyTo: replyTo || smtp.replyTo || undefined,
    subject,
    html,
    text: text || undefined
  });
}

async function loadTemplate(key, fallback) {
  const templates = await getSetting("emailTemplates", []);
  const found = Array.isArray(templates) ? templates.find((item) => item.key === key && item.isActive !== false) : null;
  return found || fallback;
}

async function sendTemplateEmail({ templateKey, to, context, fallbackSubject, fallbackHtml, replyTo }) {
  const template = await loadTemplate(templateKey, {
    key: templateKey,
    subjectTemplate: fallbackSubject,
    htmlTemplate: fallbackHtml,
    isActive: true
  });

  const subject = renderTemplateString(template.subjectTemplate || fallbackSubject, context);
  const html = renderTemplateString(template.htmlTemplate || fallbackHtml, context);

  return sendEmail({
    to,
    subject,
    html,
    replyTo
  });
}

module.exports = {
  createTransport,
  getSmtpSettings,
  renderTemplateString,
  sendEmail,
  sendTemplateEmail
};
