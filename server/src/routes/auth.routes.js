const express = require("express");
const router = express.Router();

const { register, login, getMe, saveMyIdentity, loginWithCode, saveAccountSetup } = require("../controllers/auth.controller");
const { forgotPassword, resetPassword } = require("../controllers/passwordReset.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");
const {
  loginIpLimiter,
  loginAccountLimiter,
  registerLimiter,
  passwordResetLimiter,
  codeLoginIpLimiter,
  codeLoginKeyLimiter,
} = require("../middleware/rateLimit.middleware");

router.post("/register", registerLimiter, register);
router.post("/login", loginIpLimiter, loginAccountLimiter, login);
router.post("/code-login", codeLoginIpLimiter, codeLoginKeyLimiter, loginWithCode);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);
router.post("/identity", protect, requireAccountReady, saveMyIdentity);
router.post("/account-setup", protect, saveAccountSetup);

module.exports = router;
