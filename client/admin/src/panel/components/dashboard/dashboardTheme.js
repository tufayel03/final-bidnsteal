export const dashboardTheme = {
  kpiTones: ["olive", "sage", "sand", "clay"],
  miniTones: ["stone", "olive", "sage", "sand"],
  inventoryTones: {
    netAssetValue: "olive",
    outOfStock: "clay",
    reservedUnits: "sand",
    totalUnits: "sage"
  },
  statusTones: {
    paid: "olive",
    unpaid: "stone",
    pending: "sand",
    processing: "stone",
    shipped: "sage",
    delivered: "olive",
    cancelled: "clay",
    refunded: "clay"
  }
};

export function dashboardKpiTone(index) {
  return dashboardTheme.kpiTones[index] || dashboardTheme.kpiTones[dashboardTheme.kpiTones.length - 1];
}

export function dashboardMiniTone(index) {
  return dashboardTheme.miniTones[index] || dashboardTheme.miniTones[dashboardTheme.miniTones.length - 1];
}

export function dashboardInventoryTone(key) {
  return dashboardTheme.inventoryTones[key] || "stone";
}

export function dashboardStatusTone(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
  return dashboardTheme.statusTones[normalized] || "stone";
}

export function dashboardStatusLabel(value) {
  const normalized = String(value || "").trim().replace(/_/g, " ");
  if (!normalized) return "-";
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
