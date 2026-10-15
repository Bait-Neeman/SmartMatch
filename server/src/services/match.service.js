const Interest = require("../models/interest.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { stageForViewer } = require("../utils/suggestionStage");
const { toPublicPerson, redactIdentity } = require("./privacy.service");

const otherUserId = (interest, viewerId) =>
  String(interest.sender) === String(viewerId) ? interest.receiver : interest.sender;

const hasValue = (value) => value != null && value !== "";

// Match percent, an integer from 0 to 100.
//
// The score is the rounded average of every check that has enough data.
// A missing value skips that check. When nothing can be compared, the score is 100.
//
// - Age and height, each direction that has a preferred range: 100 at the middle
//   of the range and 70 at either edge. A single bound the value already meets scores 100.
// - City, style, appearance, and marital status: 100 when either side stated a
//   preference (a mismatch never reaches scoring). Otherwise 100 when both values
//   are equal and 60 when both are set and differ.
// - Ethnicity: 100 when equal, 60 when both are set and differ.
// - Finance, each direction: 70 when participation equals the demand, 100 when it
//   is at least twice the demand, linear in between. A missing number skips that direction.
const rangeCloseness = (value, min, max) => {
  if (min == null && max == null) return null;
  if (value == null) return 0;
  if (min != null && value < min) return 0;
  if (max != null && value > max) return 0;
  if (min == null || max == null || min === max) return 100;
  const middle = (min + max) / 2;
  const half = (max - min) / 2;
  const distance = Math.abs(value - middle) / half;
  return 70 + 30 * (1 - distance);
};

const statedOrShared = (left, right, leftPreference, rightPreference) => {
  if (hasValue(leftPreference) || hasValue(rightPreference)) return 100;
  if (!hasValue(left) || !hasValue(right)) return null;
  return left === right ? 100 : 60;
};

const financeCloseness = (participation, demand) => {
  if (participation == null || demand == null) return null;
  if (participation < demand) return 0;
  if (demand <= 0) return 100;
  const ratio = participation / demand;
  if (ratio >= 2) return 100;
  return 70 + 30 * (ratio - 1);
};

const averagePercent = (scores) => {
  const used = scores.filter((score) => score != null && Number.isFinite(score));
  if (used.length === 0) return 100;
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
    statedOrShared(a.city, b.city, prefA.city, prefB.city),
    statedOrShared(a.style, b.style, prefA.style, prefB.style),
    statedOrShared(a.appearance, b.appearance, prefA.preferredAppearance, prefB.preferredAppearance),
    statedOrShared(a.maritalStatus, b.maritalStatus, prefA.preferredMaritalStatus, prefB.preferredMaritalStatus),
    statedOrShared(a.ethnicity, b.ethnicity, null, null),
    financeCloseness(b.financialParticipation, a.financialDemand),
    financeCloseness(a.financialParticipation, b.financialDemand),
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

// Mutual (accepted) matches. Identity is included because both sides already approved.
// The national ID number is never selected.
const getMatchesForUser = async (userId) => {
  const accepted = await Interest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "accepted",
  }).lean();

  const otherIds = accepted.map((item) => otherUserId(item, userId));
  const [users, context] = await Promise.all([
    User.find({ _id: { $in: otherIds } }).select("name email phone role").lean(),
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
    .filter(Boolean);
};

// True when the value is outside [min, max]. A value the profile doesn't have
// can't satisfy a stated requirement, so it counts as outside.
const isOutOfRange = (value, min, max) => {
  if (min == null && max == null) return false;
  if (value == null) return true;
  return (min != null && value < min) || (max != null && value > max);
};

// Does the profile satisfy what the preference asks for?
const meetsPreference = (profile, preference) => {
  if (!preference) return true;

  if (isOutOfRange(profile.age, preference.ageMin, preference.ageMax)) return false;
  if (isOutOfRange(profile.height, preference.heightMin, preference.heightMax)) return false;
  if (preference.style && profile.style !== preference.style) return false;
  if (preference.preferredAppearance && profile.appearance !== preference.preferredAppearance) return false;
  if (preference.city && profile.city !== preference.city) return false;
  if (preference.preferredMaritalStatus && profile.maritalStatus !== preference.preferredMaritalStatus) {
    return false;
  }

  // Existing filter only. financialStatus must fall inside the other side's
  // [financialMin, financialMax]: a range, not an exact match. It does not compare
  // דרישה כספית (financialRequirement, a minimum) with participation. A profile
  // that never stored financialStatus is not excluded by this range.
  if (
    profile.financialStatus != null &&
    isOutOfRange(profile.financialStatus, preference.financialMin, preference.financialMax)
  ) {
    return false;
  }

  return true;
};

// Both numbers are minimums. A missing demand or participation adds no restriction.
const meetsFinance = (mine, theirs) => {
  if (mine?.financialDemand == null || theirs?.financialParticipation == null) return true;
  return theirs.financialParticipation >= mine.financialDemand;
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
  if (viewer?.pauseSuggestions) return [];

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

  return candidateProfiles
    .filter((profile) => {
      const otherPreference = preferenceByUser.get(String(profile.user));
      return (
        meetsPreference(profile, userPreference) &&
        meetsPreference(userProfile, otherPreference) &&
        meetsFinance(userProfile, profile) &&
        meetsFinance(profile, userProfile)
      );
    })
    .map((profile) => {
      const person = redactIdentity(toPublicPerson({ _id: profile.user }, profile, { revealIdentity: false }), {
        revealIdentity: false,
      });
      person.matchPercent = computeMatchPercent(
        userProfile,
        userPreference,
        profile,
        preferenceByUser.get(String(profile.user))
      );
      return person;
    })
    .filter((person) => floor == null || person.matchPercent >= floor);
};

module.exports = {
  getMatchesForUser,
  getCandidatesForUser,
  computeMatchPercent,
};
