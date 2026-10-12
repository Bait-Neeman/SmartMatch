const {
  getPendingMatches,
  removePendingMatch,
  getAllUsers,
  getUserProfileForAdmin,
} = require("../services/admin.service");

const checkAdminRole = (user) => {
  if (user.role !== "admin") {
    const error = new Error("Admin access required");
    error.statusCode = 403;
    throw error;
  }
};

const getPending = async (req, res) => {
  try {
    checkAdminRole(req.user);

    const matches = await getPendingMatches();

    res.status(200).json({ matches });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const removePending = async (req, res) => {
  try {
    checkAdminRole(req.user);

    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ message: "senderId and receiverId are required" });
    }

    const result = await removePendingMatch(senderId, receiverId);

    res.status(200).json({
      message: "Match removed from pending",
      result,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    checkAdminRole(req.user);

    const users = await getAllUsers();

    res.status(200).json({ users });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    checkAdminRole(req.user);

    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    const data = await getUserProfileForAdmin(userId);

    res.status(200).json(data);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

module.exports = {
  getPending,
  removePending,
  getUsers,
  getUserProfile,
};