const Preference = require("../models/preference.model");
const { ETHNICITIES, MARITAL_STATUSES } = require("../models/options");
const HttpError = require("../utils/httpError");

// The fields a user may set, with their Hebrew names for error messages
const NUMBER_FIELDS = {
  ageMin: "גיל מינימלי",
  ageMax: "גיל מקסימלי",
  heightMin: "גובה מינימלי",
  heightMax: "גובה מקסימלי",
  financialMin: "מצב כלכלי מינימלי",
  financialMax: "מצב כלכלי מקסימלי",
};
const TEXT_FIELDS = {
  city: "עיר",
  style: "סגנון",
  preferredAppearance: "מראה חיצוני",
  preferredMaritalStatus: "סטטוס משפחתי",
  preferredEthnicity: "עדה",
  preferredYeshiva: "ישיבה",
  preferredSeminar: "סמינר",
};
const RANGES = [
  ["ageMin", "ageMax", "הגיל"],
  ["heightMin", "heightMax", "הגובה"],
  ["financialMin", "financialMax", "המצב הכלכלי"],
];

// Splits the request into values to store and fields the user cleared (sent empty).
// Only known fields are read, so nothing else in the request can be stored.
const parsePreferences = (body = {}) => {
  const values = {};
  const cleared = [];

  for (const [field, label] of Object.entries({ ...NUMBER_FIELDS, ...TEXT_FIELDS })) {
    let value = body[field];
    if (value === undefined) {
      continue;
    }
    if (typeof value === "string") {
      value = value.trim();
    }
    if (value === null || value === "") {
      cleared.push(field);
      continue;
    }

    if (field in NUMBER_FIELDS) {
      value = typeof value === "string" ? Number(value) : value;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new HttpError(400, `ערך לא תקין בשדה ${label}`);
      }
      if ((field === "ageMin" || field === "ageMax") && (value < 18 || value > 99)) {
        throw new HttpError(400, `ערך לא תקין בשדה ${label}`);
      }
    } else if (typeof value !== "string") {
      throw new HttpError(400, `ערך לא תקין בשדה ${label}`);
    }

    if (field === "preferredMaritalStatus" && !MARITAL_STATUSES.includes(value)) {
      throw new HttpError(400, "ערך לא תקין בשדה סטטוס משפחתי");
    }
    if (field === "preferredEthnicity" && !ETHNICITIES.includes(value)) {
      throw new HttpError(400, "ערך לא תקין בשדה עדה");
    }

    values[field] = value;
  }

  return { values, cleared };
};

const assertValidRanges = (preference) => {
  for (const [minField, maxField, label] of RANGES) {
    const min = preference[minField];
    const max = preference[maxField];
    if (min != null && max != null && min > max) {
      throw new HttpError(400, `הערך המינימלי של ${label} גדול מהערך המקסימלי`);
    }
  }
};

const toPreferenceResponse = (preference) => ({
  _id: preference._id,
  ageMin: preference.ageMin,
  ageMax: preference.ageMax,
  city: preference.city,
  style: preference.style,
  preferredAppearance: preference.preferredAppearance,
  heightMin: preference.heightMin,
  heightMax: preference.heightMax,
  financialMin: preference.financialMin,
  financialMax: preference.financialMax,
  preferredMaritalStatus: preference.preferredMaritalStatus ?? null,
  preferredEthnicity: preference.preferredEthnicity ?? null,
  preferredYeshiva: preference.preferredYeshiva ?? null,
  preferredSeminar: preference.preferredSeminar ?? null,
});

const createPreferenceForUser = async (userId, body) => {
  if (await Preference.exists({ user: userId })) {
    throw new HttpError(409, "כבר קיימות העדפות למשתמש זה");
  }

  const preference = new Preference({ ...parsePreferences(body).values, user: userId });
  assertValidRanges(preference);
  await preference.save();

  return toPreferenceResponse(preference);
};

const getPreferenceByUserId = async (userId) => {
  const preference = await Preference.findOne({ user: userId });
  if (!preference) {
    throw new HttpError(404, "לא נמצאו העדפות");
  }
  return toPreferenceResponse(preference);
};

const updatePreferenceByUserId = async (userId, body) => {
  const preference = await Preference.findOne({ user: userId });
  if (!preference) {
    throw new HttpError(404, "לא נמצאו העדפות");
  }

  const { values, cleared } = parsePreferences(body);
  preference.set(values);
  for (const field of cleared) {
    preference.set(field, undefined);
  }

  assertValidRanges(preference);
  await preference.save({ validateModifiedOnly: true });

  return toPreferenceResponse(preference);
};

// Profile create/update can carry the age range (and marital preference) so get-me
// can return them. Only those keys are written here; an empty value clears the field.
const PROFILE_PREFERENCE_FIELDS = ["ageMin", "ageMax", "preferredMaritalStatus"];

const applyProfilePreference = async (userId, body = {}) => {
  if (!PROFILE_PREFERENCE_FIELDS.some((field) => body[field] !== undefined)) {
    return null;
  }

  const subset = {};
  for (const field of PROFILE_PREFERENCE_FIELDS) {
    if (body[field] !== undefined) subset[field] = body[field];
  }

  if (await Preference.exists({ user: userId })) {
    return updatePreferenceByUserId(userId, subset);
  }
  return createPreferenceForUser(userId, subset);
};

module.exports = {
  createPreferenceForUser,
  getPreferenceByUserId,
  updatePreferenceByUserId,
  applyProfilePreference,
};
