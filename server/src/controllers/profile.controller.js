const {
  createProfileForUser,
  getProfileByUserId,
  updateProfileByUserId,
  deleteProfileByUserId,
  getProfileForViewer,
} = require("../services/profile.service");

const createProfile = async (req, res) => {
  const profile = await createProfileForUser(req.user.userId, req.body, req.files);
  res.status(201).json({ message: "הפרופיל נוצר בהצלחה", profile });
};

const getMyProfile = async (req, res) => {
  const profile = await getProfileByUserId(req.user.userId);
  res.status(200).json({ profile });
};

const getProfile = async (req, res) => {
  const profile = await getProfileForViewer(req.user, req.params.userId);
  res.status(200).json({ profile });
};

const updateProfile = async (req, res) => {
  const profile = await updateProfileByUserId(req.user.userId, req.body, req.files);
  res.status(200).json({ message: "הפרופיל עודכן בהצלחה", profile });
};

const deleteProfile = async (req, res) => {
  await deleteProfileByUserId(req.user.userId);
  res.status(200).json({ message: "הפרופיל נמחק" });
};

module.exports = { createProfile, getMyProfile, updateProfile, getProfile, deleteProfile };
