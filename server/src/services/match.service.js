const Interest = require("../models/interest.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { stageForViewer } = require("../utils/suggestionStage");
const { toPublicPerson, redactIdentity } = require("./privacy.service");
const { institutionKey } = require("./institution.service");

const otherUserId = (interest, viewerId) =>
  String(interest.sender) === String(viewerId) ? interest.receiver : interest.sender;

// Matching reads structured fields only: age, height, city, marital status,
// style, appearance, ethnicity, yeshiva, seminar, occupation, the work flags,
// and the numeric money fields.
// Free-text description, lookingFor, and workplace are never read. There is no AI score.
// Institution, profession, and the choice lists treat a blank candidate value as
// unknown and keep it. excludeIncomplete is off unless the person checked it.
// When it is on, a blank in a field this person filtered is removed. onlyWorking
// and onlyWorkingInProfession always require an explicit yes.
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
// - Yeshiva, seminar, and profession: no list means no score. A blank value is
//   unknown and is skipped. A filled value scores 100 when it is one of the
//   selected names and 0 when it is not. One stored name still counts as a list.
// - onlyWorking and onlyWorkingInProfession: no score unless the filter is on.
//   A true answer scores 100. Anything else, including an unanswered flag, scores 0.
//   The studied-profession filter also requires working to be true.
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

const choiceNames = (value) => {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value) ? value : [value];
  const names = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed === "לא משנה" || trimmed === "אין העדפת עיר") continue;
    names.push(trimmed);
  }
  return names;
};

const sameKey = (keyOf, left, right) => keyOf(left) === keyOf(right);

// A list scores 100 when the other value is one of the names and 0 when it is
// a different known value. No list falls back to comparing the two profiles:
// 100 when they match, 60 when both are set and differ. A blank skips the check.
const statedChoices = (left, right, leftPreference, rightPreference, keyOf = (value) => String(value).trim()) => {
  const leftNames = choiceNames(leftPreference);
  const rightNames = choiceNames(rightPreference);
  if (leftNames.length || rightNames.length) {
    if (leftNames.length && !hasValue(right)) return null;
    if (rightNames.length && !hasValue(left)) return null;
    const scores = [];
    if (leftNames.length) scores.push(leftNames.some((name) => sameKey(keyOf, name, right)) ? 100 : 0);
    if (rightNames.length) scores.push(rightNames.some((name) => sameKey(keyOf, name, left)) ? 100 : 0);
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }
  if (!hasValue(left) || !hasValue(right)) return null;
  return sameKey(keyOf, left, right) ? 100 : 60;
};

const listExcludes = (wanted, actual, keyOf = (value) => String(value).trim()) => {
  const names = choiceNames(wanted);
  if (names.length === 0) return false;
  if (!hasValue(actual)) return false;
  return !names.some((name) => sameKey(keyOf, name, actual));
};

const listIsSet = (wanted) => choiceNames(wanted).length > 0;

// "אין העדפה" is the checklist row for an empty list. It is not an institution.
const NO_INSTITUTION_PREFERENCE = new Set([
  "אין העדפה",
  "אין העדפת ישיבה",
  "אין העדפת סמינר",
  "אין העדפת מקצוע",
]);

// A legacy preference is one string. The form stores a list of names.
const institutionNames = (value) => {
  if (value == null || value === "") return [];
  const raw = Array.isArray(value) ? value : [value];
  const names = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || NO_INSTITUTION_PREFERENCE.has(trimmed)) continue;
    names.push(trimmed);
  }
  return names;
};

// No names means no filter. A blank institution is unknown and is not excluded.
// Otherwise the candidate's institution must be one of the selected names.
// ישיבת/סמינר on the front of a name does not make it a different place.
const institutionExcludes = (wanted, actual, keyOf = institutionKey) => {
  const names = institutionNames(wanted);
  if (names.length === 0) return false;
  if (!hasValue(actual)) return false;
  return !names.some((name) => keyOf(name) === keyOf(actual));
};

// Scores only when a list is set and the institution is filled in.
// 100 when it is one of the names, 0 when it is a different known name.
const statedInstitution = (wanted, actual, keyOf = institutionKey) => {
  const names = institutionNames(wanted);
  if (names.length === 0) return null;
  if (!hasValue(actual)) return null;
  return names.some((name) => keyOf(name) === keyOf(actual)) ? 100 : 0;
};

// Hard opt-in. Unset means the check is not used. A value that is not exactly
// true scores 0, including a missing answer.
const statedRequiredFlag = (wanted, actual) => {
  if (wanted !== true) return null;
  return actual === true ? 100 : 0;
};

const wantsOnlyWorking = (preference) =>
  preference?.onlyWorking === true || preference?.onlyWorkingInProfession === true;

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
    statedChoices(a.city, b.city, prefA.city, prefB.city, normaliseText),
    statedChoices(a.style, b.style, prefA.style, prefB.style),
    statedChoices(a.appearance, b.appearance, prefA.preferredAppearance, prefB.preferredAppearance),
    statedChoices(a.maritalStatus, b.maritalStatus, prefA.preferredMaritalStatus, prefB.preferredMaritalStatus),
    statedChoices(a.ethnicity, b.ethnicity, prefA.preferredEthnicity, prefB.preferredEthnicity),
    statedInstitution(prefA.preferredYeshiva, b.yeshiva),
    statedInstitution(prefB.preferredYeshiva, a.yeshiva),
    statedInstitution(prefA.preferredSeminar, b.seminar),
    statedInstitution(prefB.preferredSeminar, a.seminar),
    statedInstitution(prefA.preferredOccupation, b.occupation, normaliseText),
    statedInstitution(prefB.preferredOccupation, a.occupation, normaliseText),
    statedRequiredFlag(wantsOnlyWorking(prefA), b.working),
    statedRequiredFlag(wantsOnlyWorking(prefB), a.working),
    statedRequiredFlag(prefA.onlyWorkingInProfession === true, b.workingInProfession),
    statedRequiredFlag(prefB.onlyWorkingInProfession === true, a.workingInProfession),
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

// Mutual (accepted) matches. Name, email, photo, and resume are included because
// both sides already approved. The national ID and the contact phone are never selected.
const getMatchesForUser = async (userId) => {
  const accepted = await Interest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "accepted",
  }).lean();

  const otherIds = accepted.map((item) => otherUserId(item, userId));
  const [users, context] = await Promise.all([
    User.find({ _id: { $in: otherIds } }).select("name email role").lean(),
    loadPairContext(userId, otherIds),
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
      return redactIdentity(
        {
          ...person,
          role: otherUser.role,
          matchedAt: item.updatedAt || item.createdAt,
          matchPercent: percentBetween(context, userId, otherId),
          ...stageForViewer(item, userId),
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

const HIDDEN_KEYS = [
  "age",
  "height",
  "city",
  "style",
  "appearance",
  "maritalStatus",
  "ethnicity",
  "institution",
  "profession",
  "working",
  "workingInProfession",
  "financialStatus",
  "financialDemand",
  "missing",
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
  // Off unless this preference explicitly asked to hide incomplete suggestions.
  // A document saved before the field existed stays on the old rule: a blank is unknown.
  const dropBlanks = pref.excludeIncomplete === true;
  let missingDetail = false;
  const blankFiltered = (filtered, value) => {
    if (!filtered || hasValue(value)) return;
    if (dropBlanks) missingDetail = true;
  };

  if (rangeExcludes(person.age, pref.ageMin, pref.ageMax)) failed.push("age");
  blankFiltered(pref.ageMin != null || pref.ageMax != null, missingNumber(person.age) ? "" : person.age);
  if (rangeExcludes(person.height, pref.heightMin, pref.heightMax)) failed.push("height");
  blankFiltered(pref.heightMin != null || pref.heightMax != null, missingNumber(person.height) ? "" : person.height);
  if (listExcludes(pref.city, person.city, normaliseText)) failed.push("city");
  blankFiltered(listIsSet(pref.city), person.city);
  if (listExcludes(pref.style, person.style)) failed.push("style");
  blankFiltered(listIsSet(pref.style), person.style);
  if (listExcludes(pref.preferredAppearance, person.appearance)) failed.push("appearance");
  blankFiltered(listIsSet(pref.preferredAppearance), person.appearance);
  if (listExcludes(pref.preferredMaritalStatus, person.maritalStatus)) failed.push("maritalStatus");
  blankFiltered(listIsSet(pref.preferredMaritalStatus), person.maritalStatus);
  if (listExcludes(pref.preferredEthnicity, person.ethnicity)) failed.push("ethnicity");
  blankFiltered(listIsSet(pref.preferredEthnicity), person.ethnicity);
  if (institutionExcludes(pref.preferredYeshiva, person.yeshiva) || institutionExcludes(pref.preferredSeminar, person.seminar)) {
    failed.push("institution");
  }
  blankFiltered(institutionNames(pref.preferredYeshiva).length > 0, person.yeshiva);
  blankFiltered(institutionNames(pref.preferredSeminar).length > 0, person.seminar);
  if (institutionExcludes(pref.preferredOccupation, person.occupation, normaliseText)) failed.push("profession");
  blankFiltered(institutionNames(pref.preferredOccupation).length > 0, person.occupation);
  // Explicit opt-in. A missing or false answer is excluded. A blank profession
  // above is still unknown and is kept; these two flags are not.
  if (wantsOnlyWorking(pref) && person.working !== true) failed.push("working");
  if (pref.onlyWorkingInProfession === true && person.workingInProfession !== true) {
    failed.push("workingInProfession");
  }
  if (!financeShapeA(person.financialParticipation, ownerProfile?.financialDemand).ok) failed.push("financialDemand");
  blankFiltered(ownerProfile?.financialDemand != null, missingNumber(person.financialParticipation) ? "" : person.financialParticipation);
  if (!financeShapeB(person.financialStatus, pref.financialMin, pref.financialMax).ok) failed.push("financialStatus");
  blankFiltered(pref.financialMin != null || pref.financialMax != null, missingNumber(person.financialStatus) ? "" : person.financialStatus);
  if (missingDetail) failed.push("missing");

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

  // Users who already have an interest with this user, in either direction, are not suggested again
  const interests = await Interest.find({ $or: [{ sender: userId }, { receiver: userId }] })
    .select("sender receiver")
    .lean();

  const excludedUserIds = new Set([userId]);
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
