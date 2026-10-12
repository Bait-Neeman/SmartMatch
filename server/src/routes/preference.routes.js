const express = require("express");
const router = express.Router();
const { createPreference, getPreferences, updatePreferences } = require("../controllers/preference.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/", protect, createPreference);
router.get("/me", protect, getPreferences);
router.put("/", protect, updatePreferences);

module.exports = router;