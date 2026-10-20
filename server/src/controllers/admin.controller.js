const {
  getPendingMatches,
  getAdminSuggestions,
  removePendingMatch,
  getAllUsers,
  getUserProfileForAdmin,
  getAdminCases,
  getAdminSummary,
  searchAdmin,
  updateAdminCase,
  getAdminSettings,
  updateAdminSettings,
  updateAdminAccount,
  createAdminCandidate,
  createAdminMatchmaker,
  resetUserPassword,
} = require("../services/admin.service");
const { updateProfilePhotoForUser } = require("../services/profile.service");

// Admin access is checked by the requireAdmin middleware on every admin route.

const getPending = async (req, res) => {
  const matches = await getPendingMatches();
  res.status(200).json({ matches });
};

const getSuggestions = async (req, res) => {
  const suggestions = await getAdminSuggestions();
  res.status(200).json({ suggestions });
};

const removePending = async (req, res) => {
  const { senderId, receiverId } = req.body || {};
  const result = await removePendingMatch(senderId, receiverId);
  res.status(200).json({ message: "ההתאמה הוסרה מהרשימה", result });
};

const getUsers = async (req, res) => {
  const users = await getAllUsers();
  res.status(200).json({ users });
};

const getUserProfile = async (req, res) => {
  const data = await getUserProfileForAdmin(req.params.userId);
  res.status(200).json(data);
};

const getSummary = async (req, res) => {
  const summary = await getAdminSummary(req.user.userId);
  res.status(200).json(summary);
};

const getCases = async (req, res) => {
  const data = await getAdminCases(req.user.userId);
  res.status(200).json(data);
};

const search = async (req, res) => {
  const data = await searchAdmin(req.user.userId, req.query.q);
  res.status(200).json(data);
};

const patchCase = async (req, res) => {
  const item = await updateAdminCase(req.params.id, req.body || {}, req.user.userId);
  res.status(200).json({ case: item });
};

const getSettings = async (req, res) => {
  const data = await getAdminSettings(req.user.userId);
  res.status(200).json(data);
};

const patchSettings = async (req, res) => {
  const data = await updateAdminSettings(req.user.userId, req.body || {});
  res.status(200).json(data);
};

const putAccount = async (req, res) => {
  const data = await updateAdminAccount(req.user.userId, req.body || {});
  res.status(200).json(data);
};

const postCandidate = async (req, res) => {
  const user = await createAdminCandidate(req.body || {});
  res.status(201).json({ user });
};

const postMatchmaker = async (req, res) => {
  const member = await createAdminMatchmaker(req.body || {});
  res.status(201).json({ member });
};

const putUserPassword = async (req, res) => {
  const result = await resetUserPassword(req.user.userId, req.params.userId, req.body || {});
  res.status(200).json(result);
};

const putUserPhoto = async (req, res) => {
  const profile = await updateProfilePhotoForUser(req.params.userId, req.body || {}, req.files);
  res.status(200).json({ message: "הפרופיל עודכן בהצלחה", profile });
};

module.exports = {
  getPending,
  getSuggestions,
  removePending,
  getUsers,
  getUserProfile,
  getSummary,
  getCases,
  search,
  patchCase,
  getSettings,
  patchSettings,
  putAccount,
  postCandidate,
  postMatchmaker,
  putUserPassword,
  putUserPhoto,
};
