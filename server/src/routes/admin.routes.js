const express = require("express");
const router = express.Router();

const {
  getPending,
  removePending,
  getUsers,
  getUserProfile,
} = require("../controllers/admin.controller");

const { protect } = require("../middleware/auth.middleware");

router.get("/pending-matches", protect, getPending);
router.delete("/pending-match", protect, removePending);

router.get("/users", protect, getUsers);
router.get("/users/:userId/profile", protect, getUserProfile);

module.exports = router;