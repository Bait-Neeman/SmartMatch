const Interest = require("../models/interest.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { toPublicPerson, redactIdentity } = require("./privacy.service");

const otherUserId = (interest, viewerId) =>
  String(interest.sender) === String(viewerId) ? interest.receiver : interest.sender;

// Mutual (accepted) matches. Identity is included because both sides already approved.
// The national ID number is never selected.
const getMatchesForUser = async (userId) => {
  const accepted = await Interest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "accepted",
  }).lean();

  const otherIds = accepted.map((item) => otherUserId(item, userId));
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: otherIds } }).select("name email role").lean(),
    Profile.find({ user: { $in: otherIds } }).lean(),
  ]);
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));

  return accepted
    .map((item) => {
      const otherId = otherUserId(item, userId);
      const otherUser = userById.get(String(otherId));
      if (!otherUser) return null;
      const person = toPublicPerson(otherUser, profileByUser.get(String(otherId)), { revealIdentity: true });
      return redactIdentity(
        {
          ...person,
          role: otherUser.role,
          matchedAt: item.updatedAt || item.createdAt,
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

  // Financial status is optional and older profiles never collected it,
  // so a profile without it is not excluded by a financial range
  if (
    profile.financialStatus != null &&
    isOutOfRange(profile.financialStatus, preference.financialMin, preference.financialMax)
  ) {
    return false;
  }

  return true;
};

const getCandidatesForUser = async (userId) => {
  const [userProfile, userPreference] = await Promise.all([
    Profile.findOne({ user: userId }).lean(),
    Preference.findOne({ user: userId }).lean(),
  ]);

  if (!userProfile) {
    throw new HttpError(404, "יש ליצור פרופיל לפני צפייה בהצעות");
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

  // Role only — name, email, and ID number are not loaded for a suggestion.
  const candidateUsers = await User.find({
    _id: { $in: profiles.map((profile) => profile.user) },
    role: "user",
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

  return candidateProfiles
    .filter(
      (profile) =>
        meetsPreference(profile, userPreference) &&
        meetsPreference(userProfile, preferenceByUser.get(String(profile.user)))
    )
    .map((profile) =>
      redactIdentity(toPublicPerson({ _id: profile.user }, profile, { revealIdentity: false }), {
        revealIdentity: false,
      })
    );
};

module.exports = {
  getMatchesForUser,
  getCandidatesForUser,
};
