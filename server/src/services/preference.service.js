const Preference = require("../models/preference.model");

const createPreferenceForUser = async (userId, preferenceData) => {
  const existingPreference = await Preference.findOne({ user: userId });

  if (existingPreference) {
    throw new Error("Preference already exists");
  }

  return await Preference.create({
    user: userId,
    ...preferenceData,
  });
};

const getPreferenceByUserId = async (userId) => {
  return await Preference.findOne({ user: userId });
};

const updatePreferenceByUserId = async (userId, preferenceData) => {
  return await Preference.findOneAndUpdate(
    { user: userId },
    preferenceData,
    { new: true, runValidators: true }
  );
};

module.exports = {
  createPreferenceForUser,
  getPreferenceByUserId,
  updatePreferenceByUserId,
};
