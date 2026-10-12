const Interest = require("../models/interest.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");

const getIdString = (value) => {
  if (!value) return null;
  if (value._id) return value._id.toString();
  return value.toString();
};

const getMatchesForUser = async (userId) => {
  const allAccepted = await Interest.find({
    $or: [
      { sender: userId, status: "accepted" },
      { receiver: userId, status: "accepted" },
    ],
  })
    .populate("sender", "name idNumber role")
    .populate("receiver", "name idNumber role")
    .lean();

  return allAccepted
    .map((item) => {
      if (!item.sender || !item.receiver) return null;

      const senderId = getIdString(item.sender);
      const otherUser = senderId === userId.toString() ? item.receiver : item.sender;

      if (!otherUser) return null;

      return {
        _id: otherUser._id,
        name: otherUser.name,
        idNumber: otherUser.idNumber,
        role: otherUser.role,
        matchedAt: item.updatedAt || item.createdAt,
      };
    })
    .filter(Boolean);
};

const checkProfileMatch = (
  userProfile,
  candidateProfile,
  userPreference,
  candidatePreference
) => {
  if (!userProfile || !candidateProfile) return false;

  if (userProfile.gender === candidateProfile.gender) {
    return false;
  }

  if (userPreference) {
    if (userPreference.ageMin && candidateProfile.age < userPreference.ageMin) return false;
    if (userPreference.ageMax && candidateProfile.age > userPreference.ageMax) return false;
    if (userPreference.heightMin && candidateProfile.height < userPreference.heightMin) return false;
    if (userPreference.heightMax && candidateProfile.height > userPreference.heightMax) return false;
    if (userPreference.style && candidateProfile.style !== userPreference.style) return false;
    if (
      userPreference.preferredAppearance &&
      candidateProfile.appearance !== userPreference.preferredAppearance
    ) {
      return false;
    }
    if (userPreference.city && candidateProfile.city !== userPreference.city) return false;
    if (
      userPreference.financialMin &&
      candidateProfile.financialStatus &&
      candidateProfile.financialStatus < userPreference.financialMin
    ) {
      return false;
    }
    if (
      userPreference.financialMax &&
      candidateProfile.financialStatus &&
      candidateProfile.financialStatus > userPreference.financialMax
    ) {
      return false;
    }
  }

  if (candidatePreference) {
    if (candidatePreference.ageMin && userProfile.age < candidatePreference.ageMin) return false;
    if (candidatePreference.ageMax && userProfile.age > candidatePreference.ageMax) return false;
    if (candidatePreference.heightMin && userProfile.height < candidatePreference.heightMin) return false;
    if (candidatePreference.heightMax && userProfile.height > candidatePreference.heightMax) return false;
    if (candidatePreference.style && userProfile.style !== candidatePreference.style) return false;
    if (
      candidatePreference.preferredAppearance &&
      userProfile.appearance !== candidatePreference.preferredAppearance
    ) {
      return false;
    }
    if (candidatePreference.city && userProfile.city !== candidatePreference.city) return false;
    if (
      candidatePreference.financialMin &&
      userProfile.financialStatus &&
      userProfile.financialStatus < candidatePreference.financialMin
    ) {
      return false;
    }
    if (
      candidatePreference.financialMax &&
      userProfile.financialStatus &&
      userProfile.financialStatus > candidatePreference.financialMax
    ) {
      return false;
    }
  }

  return true;
};
const getCandidatesForUser = async (userId) => {
  const userProfile = await Profile.findOne({ user: userId }).lean();
  const userPreference = await Preference.findOne({ user: userId }).lean();

  if (!userProfile) {
    const error = new Error("User profile not found");
    error.statusCode = 404;
    throw error;
  }

  const existingInterests = await Interest.find({ sender: userId })
    .select("receiver")
    .lean();

  const excludedUserIds = new Set();

  existingInterests.forEach((interest) => {
    const receiverId = getIdString(interest.receiver);
    if (receiverId) {
      excludedUserIds.add(receiverId);
    }
  });

  excludedUserIds.add(userId.toString());

  const allProfiles = await Profile.find({
    user: { $nin: Array.from(excludedUserIds) },
  })
    .populate("user", "name idNumber role")
    .lean();

  const candidates = [];

  for (const profile of allProfiles) {
    if (!profile || !profile.user || !profile.user._id) {
      continue;
    }

    const candidatePreferenceDoc = await Preference.findOne({
      user: profile.user._id,
    });

    const candidatePreference = candidatePreferenceDoc
      ? candidatePreferenceDoc.toObject()
      : null;

    const isMatch = checkProfileMatch(
      userProfile,
      profile,
      userPreference,
      candidatePreference
    );

    if (isMatch) {
      candidates.push({
        _id: profile.user._id,
        name: profile.user.name,
        idNumber: profile.user.idNumber,
        age: profile.age,
        city: profile.city,
        height: profile.height,
        style: profile.style,
        appearance: profile.appearance,
        gender: profile.gender,
        description: profile.description,
      });
    }
  }

  return candidates;
};
module.exports = {
  getMatchesForUser,
  getCandidatesForUser
};
