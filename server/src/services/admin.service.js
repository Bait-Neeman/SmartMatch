const Interest = require("../models/interest.model");
const User = require("../models/user.model");
const Profile = require("../models/profile.model");
const HttpError = require("../utils/httpError");
const { assertObjectId } = require("../utils/validators");
const { toOwnerProfile } = require("./profile.service");

const getPendingMatches = async () => {
  const matches = await Interest.find({
    status: "accepted",
    senderApprovedToManager: true,
    receiverApprovedToManager: true,
  })
    .populate("sender", "name idNumber role")
    .populate("receiver", "name idNumber role")
    .sort({ updatedAt: -1 })
    .lean();

  return matches.map((match) => ({ ...match, stage: "matchmaker" }));
};

const removePendingMatch = async (senderId, receiverId) => {
  assertObjectId(senderId);
  assertObjectId(receiverId);

  const interest = await Interest.findOne({ sender: senderId, receiver: receiverId });
  if (!interest) {
    throw new HttpError(404, "הפנייה לא נמצאה");
  }

  interest.senderApprovedToManager = false;
  interest.receiverApprovedToManager = false;

  return interest.save();
};

// The password is never selected (see the user model)
const getAllUsers = () => User.find({ role: "user" }).sort({ createdAt: -1 }).lean();

const getUserProfileForAdmin = async (userId) => {
  assertObjectId(userId);

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  const profile = await Profile.findOne({ user: userId });

  return {
    user,
    profile: profile ? await toOwnerProfile(profile) : null,
  };
};

module.exports = {
  getPendingMatches,
  removePendingMatch,
  getAllUsers,
  getUserProfileForAdmin,
};
