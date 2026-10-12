const {
  createPreferenceForUser,
  getPreferenceByUserId,
  updatePreferenceByUserId,
} = require("../services/preference.service");

const normalizePreferences = (data) => {
  const normalized = {};

  ["ageMin", "ageMax", "heightMin", "heightMax", "financialMin", "financialMax"].forEach((key) => {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      normalized[key] = parseInt(data[key]);
    }
  });

  ["style", "preferredAppearance", "city"].forEach((key) => {
    if (data[key] !== undefined && data[key] !== null && data[key] !== "") {
      normalized[key] = data[key];
    }
  });

  return normalized;
};

const createPreference = async (req, res) => {
  try {
    const userId = req.user.userId;

    const preference = await createPreferenceForUser(userId, normalizePreferences(req.body));

    res.status(201).json(preference);
  } catch (error) {
    if (error.message === "Preference already exists") {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

const getPreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const preferences = await getPreferenceByUserId(userId);

    if (!preferences) {
      return res.status(404).json({ message: "Preferences not found" });
    }

    res.status(200).json({
      message: "Preferences retrieved successfully",
      preferences: {
        _id: preferences._id,
        ageMin: preferences.ageMin,
        ageMax: preferences.ageMax,
        city: preferences.city,
        style: preferences.style,
        preferredAppearance: preferences.preferredAppearance,
        heightMin: preferences.heightMin,
        heightMax: preferences.heightMax,
        financialMin: preferences.financialMin,
        financialMax: preferences.financialMax,
      },
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ message: error.message });
  }
};

const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = normalizePreferences(req.body);

    const preferences = await updatePreferenceByUserId(userId, updateData);

    if (!preferences) {
      return res.status(404).json({ message: "Preferences not found" });
    }

    res.status(200).json({
      message: "Preferences updated successfully",
      preferences: {
        _id: preferences._id,
        ageMin: preferences.ageMin,
        ageMax: preferences.ageMax,
        city: preferences.city,
        style: preferences.style,
        preferredAppearance: preferences.preferredAppearance,
        heightMin: preferences.heightMin,
        heightMax: preferences.heightMax,
        financialMin: preferences.financialMin,
        financialMax: preferences.financialMax,
      },
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createPreference, getPreferences, updatePreferences };
