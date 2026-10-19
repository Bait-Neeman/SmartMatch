const Interest = require("../models/interest.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { stageForViewer } = require("../utils/suggestionStage");
const { toPublicPerson, redactIdentity } = require("./privacy.service");
const { blockedFromSuggestions, caseStagesByInterest } = require("./caseState.service");

const otherUserId = (interest, viewerId) =>
  String(interest.sender) === String(viewerId) ? interest.receiver : interest.sender;

// Matching reads structured fields only: age, height, city, marital status,
// style, appearance, ethnicity, yeshiva, seminar, and the numeric money fields.
// Free-text description and lookingFor are never read. There is no AI score.
const hasValue = (value) => {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  return true;
};

const missingNumber = (value) => value == null || value === "";

// Trim, lowercase, and treat hyphen, dash, and Hebrew maqaf as a space.
// "תל-אביב", "תל אביב", and "  TEL AVIV " compare equal.
const normaliseText = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[-–—־]/g, " ")
    .replace(/\s+/g, " ");

const textsEqual = (left, right) => normaliseText(left) === normaliseText(right);

// Match percent, an integer from 0 to 100, or null when nothing was compared.
//
// The score is the rounded average of every check that has enough data.
// A missing value skips that check. It is not a zero and it is not a match.
// Null is what the screens already treat as "no percent".
//
// - Age, height, and the financialStatus range: 100 at the middle of a stated
//   range and 70 at either edge. A single bound the value already meets scores 100.
//   A known value outside the range scores 0. A missing value skips the check.
// - City, style, appearance, marital status, and ethnicity: 100 when a preference
//   is stated and the compared value is present (a known mismatch is filtered
//   out before scoring). Otherwise 100 when both values are equal and 60 when
//   both are set and differ. City equality uses normaliseText.
// - Yeshiva and seminar contribute only when a preference is stated and the
//   value is present. No preference means no score, so older percents stay put.
// - Finance shape A, each direction: 70 when participation equals the demand,
//   100 at twice the demand or more, linear in between, 0 below the demand.
//   A missing number skips that direction.
const rangeCloseness = (value, min, max) => {
  if (min == null && max == null) return null;
  if (missingNumber(value)) return null;
  if (min != null && value < min) return 0;
  if (max != null && value > max) return 0;
  if (min == null || max == null || min === max) return 100;
  const middle = (min + max) / 2;
  const half = (max - min) / 2;
  const distance = Math.abs(value - middle) / half;
  return 70 + 30 * (1 - distance);
};

const statedOrShared = (left, right, leftPreference, rightPreference, equal = (a, b) => a === b) => {
  const leftWants = hasValue(leftPreference);
  const rightWants = hasValue(rightPreference);
  if (leftWants || rightWants) {
    if (leftWants && !hasValue(right)) return null;
    if (rightWants && !hasValue(left)) return null;
    return 100;
  }
  if (!hasValue(left) || !hasValue(right)) return null;
  return equal(left, right) ? 100 : 60;
};

// A stated institution preference scores 100 when the value is present.
// A missing value is unknown and is skipped. No preference adds no check.
const statedInstitution = (wanted, actual) => {
  if (!hasValue(wanted)) return null;
  if (!hasValue(actual)) return null;
  return 100;
};

const financeCloseness = (participation, demand) => {
  if (participation == null || demand == null) return null;
  if (participation < demand) return 0;
  if (demand <= 0) return 100;
  const ratio = participation / demand;
  if (ratio >= 2) return 100;
  return 70 + 30 * (ratio - 1);
};

// Finance rule — one rule, two stored shapes. Both stay. Neither replaces the other.
//
// Matching never reads free-text financialRequirement or financialCapabilities.
// A stated number excludes or scores only when the number it is compared with
// is present. A missing number is unknown: it does not exclude and it does not
// enter the percent. Profiles that stored only one shape keep working.
//
// Shape A, on the profile. financialDemand is the minimum this side requires.
// financialParticipation is what this side can give. Their participation must
// be at least this demand.
//
// Shape B, preference range vs profile index. financialStatus must lie inside
// [financialMin, financialMax] when a bound is set and the status is present.
// The score uses the same closeness as age and height.
const financeShapeA = (participation, demand) => {
  if (participation == null || demand == null) return { ok: true, score: null };
  return { ok: participation >= demand, score: financeCloseness(participation, demand) };
};

const financeShapeB = (status, min, max) => {
  if (min == null && max == null) return { ok: true, score: null };
  if (missingNumber(status)) return { ok: true, score: null };
  const outside = (min != null && status < min) || (max != null && status > max);
  return { ok: !outside, score: rangeCloseness(status, min, max) };
};

const averagePercent = (scores) => {
  const used = scores.filter((score) => score != null && Number.isFinite(score));
  if (used.length === 0) return null;
  const mean = used.reduce((sum, score) => sum + score, 0) / used.length;
  return Math.max(0, Math.min(100, Math.round(mean)));
};

const computeMatchPercent = (profileA, preferenceA, profileB, preferenceB) => {
  const a = profileA || {};
  const b = profileB || {};
  const prefA = preferenceA || {};
  const prefB = preferenceB || {};
  return averagePercent([
    rangeCloseness(b.age, prefA.ageMin, prefA.ageMax),
    rangeCloseness(a.age, prefB.ageMin, prefB.ageMax),
    rangeCloseness(b.height, prefA.heightMin, prefA.heightMax),
    rangeCloseness(a.height, prefB.heightMin, prefB.heightMax),
    statedOrShared(a.city, b.city, prefA.city, prefB.city, textsEqual),
    statedOrShared(a.style, b.style, prefA.style, prefB.style),
    statedOrShared(a.appearance, b.appearance, prefA.preferredAppearance, prefB.preferredAppearance),
    statedOrShared(a.maritalStatus, b.maritalStatus, prefA.preferredMaritalStatus, prefB.preferredMaritalStatus),
    statedOrShared(a.ethnicity, b.ethnicity, prefA.preferredEthnicity, prefB.preferredEthnicity),
    statedInstitution(prefA.preferredYeshiva, b.yeshiva),
    statedInstitution(prefB.preferredYeshiva, a.yeshiva),
    statedInstitution(prefA.preferredSeminar, b.seminar),
    statedInstitution(prefB.preferredSeminar, a.seminar),
    financeShapeA(b.financialParticipation, a.financialDemand).score,
    financeShapeA(a.financialParticipation, b.financialDemand).score,
    financeShapeB(b.financialStatus, prefA.financialMin, prefA.financialMax).score,
    financeShapeB(a.financialStatus, prefB.financialMin, prefB.financialMax).score,
  ]);
};

const loadPairContext = async (viewerId, otherIds) => {
  const ids = [...new Set([String(viewerId), ...otherIds.map(String)])];
  const [profiles, preferences] = await Promise.all([
    Profile.find({ user: { $in: ids } }).lean(),
    Preference.find({ user: { $in: ids } }).lean(),
  ]);
  return {
    profileByUser: new Map(profiles.map((profile) => [String(profile.user), profile])),
    preferenceByUser: new Map(preferences.map((preference) => [String(preference.user), preference])),
  };
};

const percentBetween = (context, viewerId, otherId) =>
  computeMatchPercent(
    context.profileByUser.get(String(viewerId)),
    context.preferenceByUser.get(String(viewerId)),
    context.profileByUser.get(String(otherId)),
    context.preferenceByUser.get(String(otherId))
  );

const byPercentDesc = (left, right) => {
  const a = left?.matchPercent;
  const b = right?.matchPercent;
  const aKnown = typeof a === "number" && Number.isFinite(a);
  const bKnown = typeof b === "number" && Number.isFinite(b);
  if (aKnown && bKnown && a !== b) return b - a;
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  return 0;
};

// Mutual (accepted) matches. Identity is included because both sides already approved.
// The national ID number is never selected.
const getMatchesForUser = async (userId) => {
  const accepted = await Interest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "accepted",
  }).lean();

  const otherIds = accepted.map((item) => otherUserId(item, userId));
  const matchmakerIds = accepted
    .filter((item) => item.senderApprovedToManager && item.receiverApprovedToManager)
    .map((item) => item._id);
  const [users, context, stages] = await Promise.all([
    User.find({ _id: { $in: otherIds } }).select("name email phone role").lean(),
    loadPairContext(userId, otherIds),
    caseStagesByInterest(matchmakerIds),
  ]);
  const userById = new Map(users.map((user) => [String(user._id), user]));

  return accepted
    .map((item) => {
      const otherId = otherUserId(item, userId);
      const otherUser = userById.get(String(otherId));
      if (!otherUser) return null;
      const person = toPublicPerson(otherUser, context.profileByUser.get(String(otherId)), {
        revealIdentity: true,
      });
      const stage = stageForViewer(item, userId);
      const caseStage = stage.stage === "matchmaker" ? stages.get(String(item._id)) : null;
      return redactIdentity(
        {
          ...person,
          role: otherUser.role,
          matchedAt: item.updatedAt || item.createdAt,
          matchPercent: percentBetween(context, userId, otherId),
          ...stage,
          ...(caseStage || {}),
        },
        { revealIdentity: true }
      );
    })
    .filter(Boolean)
    .sort(byPercentDesc);
};

// True only when a known value falls outside a stated range.
// A missing value is unknown and is not outside.
const rangeExcludes = (value, min, max) => {
  if (min == null && max == null) return false;
  if (missingNumber(value)) return false;
  return (min != null && value < min) || (max != null && value > max);
};

const choiceExcludes = (wanted, actual) => hasValue(wanted) && hasValue(actual) && wanted !== actual;

const textExcludes = (wanted, actual) => hasValue(wanted) && hasValue(actual) && !textsEqual(wanted, actual);

const HIDDEN_KEYS = [
  "age",
  "height",
  "city",
  "style",
  "appearance",
  "maritalStatus",
  "ethnicity",
  "institution",
  "financialStatus",
  "financialDemand",
];

const emptyHidden = () => {
  const hidden = { total: 0 };
  for (const key of HIDDEN_KEYS) hidden[key] = 0;
  return hidden;
};

// Filters the preference owner stated, against this candidate.
// Counts are only numbers. The candidate's identity is not copied in.
const filterFailures = (candidate, ownerPreference, ownerProfile) => {
  const failed = [];
  const pref = ownerPreference || {};
  const person = candidate || {};

  if (rangeExcludes(person.age, pref.ageMin, pref.ageMax)) failed.push("age");
  if (rangeExcludes(person.height, pref.heightMin, pref.heightMax)) failed.push("height");
  if (textExcludes(pref.city, person.city)) failed.push("city");
  if (choiceExcludes(pref.style, person.style)) failed.push("style");
  if (choiceExcludes(pref.preferredAppearance, person.appearance)) failed.push("appearance");
  if (choiceExcludes(pref.preferredMaritalStatus, person.maritalStatus)) failed.push("maritalStatus");
  if (choiceExcludes(pref.preferredEthnicity, person.ethnicity)) failed.push("ethnicity");
  if (textExcludes(pref.preferredYeshiva, person.yeshiva) || textExcludes(pref.preferredSeminar, person.seminar)) {
    failed.push("institution");
  }
  if (!financeShapeA(person.financialParticipation, ownerProfile?.financialDemand).ok) failed.push("financialDemand");
  if (!financeShapeB(person.financialStatus, pref.financialMin, pref.financialMax).ok) failed.push("financialStatus");

  return failed;
};

const addHidden = (hidden, failures) => {
  hidden.total += 1;
  for (const key of failures) hidden[key] += 1;
};

const getCandidatesForUser = async (userId, { minPercent } = {}) => {
  const [userProfile, userPreference, viewer] = await Promise.all([
    Profile.findOne({ user: userId }).lean(),
    Preference.findOne({ user: userId }).lean(),
    User.findById(userId).select("pauseSuggestions minMatchPercent").lean(),
  ]);

  if (!userProfile) {
    throw new HttpError(404, "יש ליצור פרופיל לפני צפייה בהצעות");
  }

  // A paused user is not offered new suggestions.
  if (viewer?.pauseSuggestions) {
    return { candidates: [], hiddenByPreference: emptyHidden() };
  }

  // An open matchmaker case, or an engagement, takes this person out of new
  // suggestions for everyone. An ended case does not.
  const blocked = await blockedFromSuggestions();
  if (blocked.has(String(userId))) {
    return { candidates: [], hiddenByPreference: emptyHidden() };
  }

  // Users who already have an interest with this user, in either direction, are not suggested again.
  // That includes a pair whose shidduch ended: they are not offered to each other again.
  const interests = await Interest.find({ $or: [{ sender: userId }, { receiver: userId }] })
    .select("sender receiver")
    .lean();

  const excludedUserIds = new Set([userId, ...blocked]);
  for (const interest of interests) {
    excludedUserIds.add(String(interest.sender));
    excludedUserIds.add(String(interest.receiver));
  }

  const profiles = await Profile.find({
    user: { $nin: [...excludedUserIds] },
    gender: { $ne: userProfile.gender },
  }).lean();

  // Role only — name, email, phone, and ID number are not loaded for a suggestion.
  // A paused account is left out of everyone else's new suggestions.
  const candidateUsers = await User.find({
    _id: { $in: profiles.map((profile) => profile.user) },
    role: "user",
    pauseSuggestions: { $ne: true },
  })
    .select("_id")
    .lean();
  const candidateUserIds = new Set(candidateUsers.map((user) => String(user._id)));
  const candidateProfiles = profiles.filter((profile) => candidateUserIds.has(String(profile.user)));

  // Load all candidates' preferences in one query
  const preferences = await Preference.find({
    user: { $in: candidateProfiles.map((profile) => profile.user) },
  }).lean();
  const preferenceByUser = new Map(preferences.map((preference) => [String(preference.user), preference]));

  const floors = [];
  if (viewer?.minMatchPercent != null) floors.push(viewer.minMatchPercent);
  if (minPercent != null) floors.push(minPercent);
  const floor = floors.length ? Math.max(...floors) : null;
  const meetsFloor = (percent) =>
    floor == null || (typeof percent === "number" && Number.isFinite(percent) && percent >= floor);

  const hiddenByPreference = emptyHidden();
  const candidates = [];

  for (const profile of candidateProfiles) {
    const otherPreference = preferenceByUser.get(String(profile.user));
    const mine = filterFailures(profile, userPreference, userProfile);
    const theirs = filterFailures(userProfile, otherPreference, profile);
    // Count someone the other side would accept, so the number is people the
    // viewer's own filters are keeping out. No name, id, or city is stored.
    if (theirs.length === 0 && mine.length > 0) addHidden(hiddenByPreference, mine);
    if (mine.length > 0 || theirs.length > 0) continue;

    const person = redactIdentity(toPublicPerson({ _id: profile.user }, profile, { revealIdentity: false }), {
      revealIdentity: false,
    });
    person.matchPercent = computeMatchPercent(userProfile, userPreference, profile, otherPreference);
    if (!meetsFloor(person.matchPercent)) continue;
    candidates.push(person);
  }

  candidates.sort(byPercentDesc);
  return { candidates, hiddenByPreference };
};

module.exports = {
  getMatchesForUser,
  getCandidatesForUser,
  computeMatchPercent,
};
