const express = require("express");
const router = express.Router();

const { register, login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  loginIpLimiter,
  loginAccountLimiter,
  registerLimiter,
} = require("../middleware/rateLimit.middleware");

router.post("/register", registerLimiter, register);
router.post("/login", loginIpLimiter, loginAccountLimiter, login);
router.get("/me", protect, getMe);

module.exports = router;
