const Interest = require("../models/interest.model");
const User = require("../models/user.model");
const Profile = require("../models/profile.model");

const getPendingMatches = async () => {
  return await Interest.find({
    status: "accepted",
    senderApprovedToManager: true,
    receiverApprovedToManager: true,
  })
    .populate("sender", "name idNumber role")
    .populate("receiver", "name idNumber role")
    .sort({ updatedAt: -1 })
    .lean();
};

const removePendingMatch = async (senderId, receiverId) => {
  const interest = await Interest.findOne({ sender: senderId, receiver: receiverId });

  if (!interest) {
    const error = new Error("Interest not found");
    error.statusCode = 404;
    throw error;
  }

  interest.senderApprovedToManager = false;
  interest.receiverApprovedToManager = false;

  return await interest.save();
};

const getAllUsers = async () => {
  return await User.find({ role: "user" })
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();
};

const getUserProfileForAdmin = async (userId) => {
  const user = await User.findById(userId).select("-password").lean();

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const profile = await Profile.findOne({ user: userId }).lean();

  return {
    user,
    profile,
  };
};

module.exports = {
  getPendingMatches,
  removePendingMatch,
  getAllUsers,
  getUserProfileForAdmin,
};