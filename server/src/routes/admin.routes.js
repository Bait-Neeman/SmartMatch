const express = require("express");
const router = express.Router();

const {
  getPending,
  removePending,
  getUsers,
  getUserProfile,
} = require("../controllers/admin.controller");

const { protect, requireAdmin } = require("../middleware/auth.middleware");

router.use(protect, requireAdmin);

router.get("/pending-matches", getPending);
router.delete("/pending-match", removePending);

router.get("/users", getUsers);
router.get("/users/:userId/profile", getUserProfile);

module.exports = router;
