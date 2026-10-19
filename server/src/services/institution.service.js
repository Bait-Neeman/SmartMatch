const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const { YESHIVAS, SEMINARS, PROFESSIONS, CITIES } = require("../data/institutions");

// Same comparison as match.service: trim, case, and hyphen/maqaf insensitive.
const normaliseInstitution = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-–—־]/g, " ")
    .replace(/\s+/g, " ");

const cleanDisplay = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

// "ישיבת חברון" and "חברון" are the same place, and so are "סמינר אור החיים" and "אור החיים".
const institutionKey = (value) => normaliseInstitution(value).replace(/^(?:ישיבת|סמינר)\s+/, "");

const hasInstitutionPrefix = (value) => /^(?:ישיבת|סמינר)\s+/.test(normaliseInstitution(value));

// Seed names keep their order. Names typed by users are added after them,
// once each. A name that matches after dropping ישיבת/סמינר is the same row.
// The label without that prefix is the one shown.
const mergeInstitutions = (seeds, entered, keyOf = normaliseInstitution) => {
  const chosen = new Map();

  const consider = (name) => {
    const display = cleanDisplay(name);
    const key = keyOf(display);
    if (!key) return;
    const current = chosen.get(key);
    if (!current) {
      chosen.set(key, display);
      return;
    }
    if (hasInstitutionPrefix(current) && !hasInstitutionPrefix(display)) chosen.set(key, display);
  };

  for (const name of seeds) consider(name);
  for (const name of entered) consider(name);

  const seedKeys = [];
  const seenSeeds = new Set();
  for (const name of seeds) {
    const key = keyOf(cleanDisplay(name));
    if (!key || seenSeeds.has(key)) continue;
    seenSeeds.add(key);
    seedKeys.push(key);
  }

  const extras = [...chosen.keys()]
    .filter((key) => !seenSeeds.has(key))
    .sort((left, right) => chosen.get(left).localeCompare(chosen.get(right), "he"));

  return [...seedKeys, ...extras].map((key) => chosen.get(key));
};

const distinctNames = async (field, gender) => {
  const names = await Profile.distinct(field, {
    gender,
    [field]: { $nin: [null, ""] },
  });
  return names.filter((name) => typeof name === "string");
};

const CITY_PLACEHOLDERS = new Set(["לא משנה", "אין העדפת עיר"]);

const cityNamesOf = (value) => {
  const raw = Array.isArray(value) ? value : value == null || value === "" ? [] : [value];
  return raw.filter((name) => typeof name === "string" && name.trim() && !CITY_PLACEHOLDERS.has(name.trim()));
};

const distinctCities = async () => {
  const [profileCities, preferences] = await Promise.all([
    Profile.distinct("city", { city: { $nin: [null, ""] } }),
    Preference.find().select("city").lean(),
  ]);
  return [...profileCities, ...preferences.flatMap((preference) => cityNamesOf(preference.city))].filter(
    (name) => typeof name === "string"
  );
};

// Yeshivas: the seed list, plus every yeshiva a male profile stored.
// Seminars: the seed list, plus every seminar a female profile stored.
// Professions: the seed list, plus every profession a female profile stored.
// Cities: the seed list, plus every city stored on a profile or a preference.
const getInstitutionLists = async () => {
  const [yeshivas, seminars, professions, cities] = await Promise.all([
    distinctNames("yeshiva", "male"),
    distinctNames("seminar", "female"),
    distinctNames("occupation", "female"),
    distinctCities(),
  ]);

  return {
    yeshivas: mergeInstitutions(YESHIVAS, yeshivas, institutionKey),
    seminars: mergeInstitutions(SEMINARS, seminars, institutionKey),
    professions: mergeInstitutions(PROFESSIONS, professions),
    cities: mergeInstitutions(CITIES, cities),
  };
};

module.exports = {
  getInstitutionLists,
  mergeInstitutions,
  normaliseInstitution,
  institutionKey,
};
