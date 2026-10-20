const express = require("express");
const router = express.Router();
const { createPreference, getPreferences, updatePreferences } = require("../controllers/preference.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");

router.post("/", protect, requireAccountReady, createPreference);
router.get("/me", protect, requireAccountReady, getPreferences);
router.put("/", protect, requireAccountReady, updatePreferences);

module.exports = router;