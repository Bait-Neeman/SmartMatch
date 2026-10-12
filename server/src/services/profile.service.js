const Profile = require("../models/profile.model");
const Interest = require("../models/interest.model");

const createProfileForUser = async (userId, profileData) => {
  const existingProfile = await Profile.findOne({ user: userId });

  if (existingProfile) {
    throw new Error("Profile already exists");
  }

  return await Profile.create({
    user: userId,
    ...profileData,
  });
};

const getProfileByUserId = async (userId) => {
  return await Profile.findOne({ user: userId });
};

const updateProfileByUserId = async (userId, profileData) => {
  return await Profile.findOneAndUpdate(
    { user: userId },
    profileData,
    { new: true, runValidators: true }
  );
};

const deleteProfileByUserId = async (userId) => {
  const result = await Profile.findOneAndDelete({ user: userId });
  return result;
};

const checkMutualMatch = async (requesterId, targetUserId) => {
  // Check if there's an accepted interest between two users (in either direction)
  const interest = await Interest.findOne({
    $or: [
      { sender: requesterId, receiver: targetUserId },
      { sender: targetUserId, receiver: requesterId }
    ],
    status: 'accepted',
  });

  return !!interest;
};

const getProfileWithAccess = async (requesterId, targetUserId, requesterRole) => {
  const profile = await Profile.findOne({ user: targetUserId });

  if (!profile) {
    const error = new Error('Profile not found');
    error.statusCode = 404;
    throw error;
  }

  // Admin or own profile can see everything
  if (requesterRole === 'admin' || requesterId.toString() === targetUserId.toString()) {
    return profile;
  }

  // Check for mutual match
  const hasMutualMatch = await checkMutualMatch(requesterId, targetUserId);

  if (!hasMutualMatch) {
    // Remove sensitive files for non-matched users
    profile.resumePdf = null;
    profile.image = null;
  }

  return profile;
};

module.exports = {
  createProfileForUser,
  getProfileByUserId,
  updateProfileByUserId,
  deleteProfileByUserId,
  checkMutualMatch,
  getProfileWithAccess,
};
