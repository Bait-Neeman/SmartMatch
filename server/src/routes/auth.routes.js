const express = require("express");
const router = express.Router();

const { register, login, getMe, saveMyIdentity } = require("../controllers/auth.controller");
const { forgotPassword, resetPassword } = require("../controllers/passwordReset.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  loginIpLimiter,
  loginAccountLimiter,
  registerLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimit.middleware");

router.post("/register", registerLimiter, register);
router.post("/login", loginIpLimiter, loginAccountLimiter, login);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);
router.post("/identity", protect, saveMyIdentity);

module.exports = router;
