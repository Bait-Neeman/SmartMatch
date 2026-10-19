const Profile = require("../models/profile.model");
const { YESHIVAS, SEMINARS, PROFESSIONS } = require("../data/institutions");

// Same comparison as match.service: trim, case, and hyphen/maqaf insensitive.
const normaliseInstitution = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-–—־]/g, " ")
    .replace(/\s+/g, " ");

const cleanDisplay = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

// Seed names keep their order. Names typed by users are added after them,
// once each, skipping a spelling that already matches a seed.
const mergeInstitutions = (seeds, entered) => {
  const seen = new Set();
  const result = [];

  const take = (name, bucket) => {
    const display = cleanDisplay(name);
    const key = normaliseInstitution(display);
    if (!key || seen.has(key)) return;
    seen.add(key);
    bucket.push(display);
  };

  for (const name of seeds) take(name, result);

  const extras = [];
  for (const name of entered) take(name, extras);
  extras.sort((left, right) => left.localeCompare(right, "he"));
  return result.concat(extras);
};

const distinctNames = async (field, gender) => {
  const names = await Profile.distinct(field, {
    gender,
    [field]: { $nin: [null, ""] },
  });
  return names.filter((name) => typeof name === "string");
};

// Yeshivas: the seed list, plus every yeshiva a male profile stored.
// Seminars: the seed list, plus every seminar a female profile stored.
// Professions: the seed list, plus every profession a female profile stored.
const getInstitutionLists = async () => {
  const [yeshivas, seminars, professions] = await Promise.all([
    distinctNames("yeshiva", "male"),
    distinctNames("seminar", "female"),
    distinctNames("occupation", "female"),
  ]);

  return {
    yeshivas: mergeInstitutions(YESHIVAS, yeshivas),
    seminars: mergeInstitutions(SEMINARS, seminars),
    professions: mergeInstitutions(PROFESSIONS, professions),
  };
};

module.exports = {
  getInstitutionLists,
  mergeInstitutions,
  normaliseInstitution,
};
