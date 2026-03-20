const { getSetting, setSetting } = require("./settingsService");

const SYSTEM_EMAIL_TEMPLATE_DEFINITIONS = Object.freeze([
  {
    key: "welcome-email",
    label: "Welcome Email",
    description: "Sent after a customer account is created.",
    subjectTemplate: "Welcome to {{site.name}}, {{customer.name}}",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Welcome to {{site.name}}. Your account is ready.</p><p>You can sign in here: <a href=\"{{auth.login_link}}\">{{auth.login_link}}</a></p><p>If you need help, contact {{support.email}}.</p>"
  },
  {
    key: "order-confirmation",
    label: "Order Confirmation",
    description: "Sent immediately after a store order is placed.",
    subjectTemplate: "Your order {{order.number}} is confirmed",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>We have confirmed your order <strong>{{order.number}}</strong>.</p><p>Total: <strong>{{order.total}}</strong></p><table cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\">{{order.items_table}}</table><p>Shipping to: {{shipping.address}}</p><p>You can sign in here: <a href=\"{{auth.login_link}}\">{{auth.login_link}}</a></p>"
  },
  {
    key: "password-reset",
    label: "Password Reset",
    description: "Sent when a customer requests a password reset.",
    subjectTemplate: "Reset your {{site.name}} password",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Use the secure link below to reset your password.</p><p><a href=\"{{auth.reset_link}}\">Reset Password</a></p><p>If the button does not work, copy this link: {{auth.reset_link}}</p>"
  },
  {
    key: "order-processing",
    label: "Order Processing",
    description: "Sent when an order moves into processing.",
    subjectTemplate: "We are preparing order {{order.number}}",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Your order <strong>{{order.number}}</strong> is now being prepared.</p><p>Status: <strong>{{order.fulfillment_label}}</strong></p><p>Total: {{order.total}}</p>"
  },
  {
    key: "order-shipped",
    label: "Order Shipped",
    description: "Sent when an order is marked as shipped.",
    subjectTemplate: "Order {{order.number}} has shipped",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Your order <strong>{{order.number}}</strong> is on the way.</p><p>Status: <strong>{{order.fulfillment_label}}</strong></p><p>Tracking: <strong>{{order.tracking_code}}</strong></p><p>Shipping to: {{shipping.address}}</p>"
  },
  {
    key: "order-cancelled",
    label: "Order Cancelled",
    description: "Sent when an order is cancelled.",
    subjectTemplate: "Order {{order.number}} has been cancelled",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Your order <strong>{{order.number}}</strong> has been cancelled.</p><p>If you need help, contact {{support.email}}.</p>"
  },
  {
    key: "order-on-hold",
    label: "Order On Hold",
    description: "Sent when an order is placed on hold.",
    subjectTemplate: "Order {{order.number}} is on hold",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Your order <strong>{{order.number}}</strong> is currently on hold.</p><p>We will send another update as soon as it moves forward.</p><p>If you have questions, contact {{support.email}}.</p>"
  },
  {
    key: "auction-outbid",
    label: "Auction Outbid",
    description: "Sent when a bidder loses the top spot on a live auction.",
    subjectTemplate: "You were outbid on {{auction.title}}",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Another bidder has placed a higher offer on <strong>{{auction.title}}</strong>.</p><p>Current bid: <strong>{{auction.amount}}</strong></p><p>View the lot here: <a href=\"{{auction.url}}\">{{auction.url}}</a></p>"
  },
  {
    key: "auction-win",
    label: "Auction Win",
    description: "Sent when a bidder wins an auction.",
    subjectTemplate: "You won {{auction.title}}",
    htmlTemplate:
      "<p>Hello {{customer.name}},</p><p>Congratulations. You won <strong>{{auction.title}}</strong>.</p><p>Winning bid: <strong>{{auction.amount}}</strong></p><p>Review the auction here: <a href=\"{{auction.url}}\">{{auction.url}}</a></p>"
  }
]);

const SYSTEM_TEMPLATE_ORDER = new Map(
  SYSTEM_EMAIL_TEMPLATE_DEFINITIONS.map((item, index) => [item.key, index])
);
const SYSTEM_EMAIL_TEMPLATE_BY_KEY = new Map(
  SYSTEM_EMAIL_TEMPLATE_DEFINITIONS.map((item) => [item.key, item])
);

function normalizeEmailTemplateRecord(item = {}) {
  const key = String(item.key || "").trim();
  if (!key) return null;

  const isSystem = Boolean(item.isSystem || SYSTEM_EMAIL_TEMPLATE_BY_KEY.has(key));
  const label = String(item.label || item.name || key)
    .trim()
    .replace(/\s+/g, " ");
  const description = String(item.description || "").trim();

  return {
    key,
    label: label || key,
    description,
    subjectTemplate: String(item.subjectTemplate || item.subject || ""),
    htmlTemplate: String(item.htmlTemplate || item.html || ""),
    isActive: isSystem ? true : item.isActive !== false,
    isSystem,
    isDeletable: isSystem ? false : item.isDeletable !== false
  };
}

function sortEmailTemplates(items = []) {
  return [...items].sort((left, right) => {
    const leftKey = String(left?.key || "").trim();
    const rightKey = String(right?.key || "").trim();
    const leftSystem = SYSTEM_TEMPLATE_ORDER.has(leftKey);
    const rightSystem = SYSTEM_TEMPLATE_ORDER.has(rightKey);

    if (leftSystem && rightSystem) {
      return SYSTEM_TEMPLATE_ORDER.get(leftKey) - SYSTEM_TEMPLATE_ORDER.get(rightKey);
    }
    if (leftSystem) return -1;
    if (rightSystem) return 1;

    return String(left?.label || leftKey).localeCompare(String(right?.label || rightKey));
  });
}

function mergeEmailTemplates(items = []) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => normalizeEmailTemplateRecord(item))
    .filter(Boolean);
  const incomingByKey = new Map(normalized.map((item) => [item.key, item]));
  const merged = [];

  for (const definition of SYSTEM_EMAIL_TEMPLATE_DEFINITIONS) {
    const saved = incomingByKey.get(definition.key) || {};
    merged.push(
      normalizeEmailTemplateRecord({
        ...definition,
        ...saved,
        key: definition.key,
        label: definition.label,
        description: definition.description,
        subjectTemplate: String(saved.subjectTemplate || definition.subjectTemplate || ""),
        htmlTemplate: String(saved.htmlTemplate || definition.htmlTemplate || ""),
        isSystem: true,
        isDeletable: false,
        isActive: true
      })
    );
    incomingByKey.delete(definition.key);
  }

  for (const item of incomingByKey.values()) {
    merged.push(
      normalizeEmailTemplateRecord({
        ...item,
        isSystem: false,
        isDeletable: item.isDeletable !== false
      })
    );
  }

  return sortEmailTemplates(merged.filter(Boolean));
}

async function loadEmailTemplates() {
  return mergeEmailTemplates(await getSetting("emailTemplates", []));
}

async function ensureEmailTemplates() {
  const current = await getSetting("emailTemplates", []);
  const merged = mergeEmailTemplates(current);

  if (JSON.stringify(Array.isArray(current) ? current : []) !== JSON.stringify(merged)) {
    await setSetting("emailTemplates", merged);
  }

  return merged;
}

function getSystemEmailTemplateDefinition(key) {
  return SYSTEM_EMAIL_TEMPLATE_BY_KEY.get(String(key || "").trim()) || null;
}

function isSystemEmailTemplateKey(key) {
  return Boolean(getSystemEmailTemplateDefinition(key));
}

module.exports = {
  SYSTEM_EMAIL_TEMPLATE_DEFINITIONS,
  normalizeEmailTemplateRecord,
  mergeEmailTemplates,
  loadEmailTemplates,
  ensureEmailTemplates,
  getSystemEmailTemplateDefinition,
  isSystemEmailTemplateKey
};
