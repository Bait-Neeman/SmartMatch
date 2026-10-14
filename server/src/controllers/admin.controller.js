const {
  getPendingMatches,
  removePendingMatch,
  getAllUsers,
  getUserProfileForAdmin,
} = require("../services/admin.service");

// Admin access is checked by the requireAdmin middleware on every admin route.

const getPending = async (req, res) => {
  const matches = await getPendingMatches();
  res.status(200).json({ matches });
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

module.exports = {
  getPending,
  removePending,
  getUsers,
  getUserProfile,
};
