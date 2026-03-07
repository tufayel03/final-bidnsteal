function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePagination(query = {}, fallbackLimit = 20, maxLimit = 100) {
  const page = parsePositiveInt(query.page, 1);
  const limit = Math.min(maxLimit, parsePositiveInt(query.limit, fallbackLimit));
  return {
    page,
    limit,
    skip: (page - 1) * limit
  };
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsRegex(value) {
  const search = String(value || "").trim();
  if (!search) return null;
  return { $regex: escapeRegex(search), $options: "i" };
}

module.exports = {
  containsRegex,
  escapeRegex,
  parsePagination
};
