const Interest = require("../models/interest.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const HttpError = require("../utils/httpError");

// Mutual (accepted) matches of the user. Other users are shown by name - never by ID number.
const getMatchesForUser = async (userId) => {
  const accepted = await Interest.find({
    $or: [{ sender: userId }, { receiver: userId }],
    status: "accepted",
  })
    .populate("sender", "name role")
    .populate("receiver", "name role")
    .lean();

  return accepted
    .filter((item) => item.sender && item.receiver)
    .map((item) => {
      const otherUser = String(item.sender._id) === userId ? item.receiver : item.sender;
      return {
        _id: otherUser._id,
        name: otherUser.name,
        role: otherUser.role,
        matchedAt: item.updatedAt || item.createdAt,
      };
    });
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
  })
    .populate("user", "name role")
    .lean();

  const candidateProfiles = profiles.filter((profile) => profile.user?.role === "user");

  // Load all candidates' preferences in one query
  const preferences = await Preference.find({
    user: { $in: candidateProfiles.map((profile) => profile.user._id) },
  }).lean();
  const preferenceByUser = new Map(preferences.map((preference) => [String(preference.user), preference]));

  return candidateProfiles
    .filter(
      (profile) =>
        meetsPreference(profile, userPreference) &&
        meetsPreference(userProfile, preferenceByUser.get(String(profile.user._id)))
    )
    .map((profile) => ({
      _id: profile.user._id,
      name: profile.user.name,
      age: profile.age,
      city: profile.city,
      height: profile.height,
      style: profile.style,
      appearance: profile.appearance,
      gender: profile.gender,
      description: profile.description,
    }));
};

module.exports = {
  getMatchesForUser,
  getCandidatesForUser,
};
