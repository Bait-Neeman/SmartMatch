const {
  createPreferenceForUser,
  getPreferenceByUserId,
  updatePreferenceByUserId,
} = require("../services/preference.service");

const createPreference = async (req, res) => {
  const preferences = await createPreferenceForUser(req.user.userId, req.body);
  res.status(201).json({ message: "ההעדפות נשמרו בהצלחה", preferences });
};

const getPreferences = async (req, res) => {
  const preferences = await getPreferenceByUserId(req.user.userId);
  res.status(200).json({ preferences });
};

const updatePreferences = async (req, res) => {
  const preferences = await updatePreferenceByUserId(req.user.userId, req.body);
  res.status(200).json({ message: "ההעדפות עודכנו בהצלחה", preferences });
};

module.exports = { createPreference, getPreferences, updatePreferences };
