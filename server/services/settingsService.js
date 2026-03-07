const Setting = require("../models/Setting");

async function getSetting(key, fallback) {
  const setting = await Setting.findOne({ key });
  if (!setting) return fallback;
  return setting.value;
}

async function setSetting(key, value) {
  const setting = await Setting.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return setting.value;
}

module.exports = { getSetting, setSetting };
