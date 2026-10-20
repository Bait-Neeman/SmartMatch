const express = require("express");
const router = express.Router();
const { createProfile, getMyProfile, updateProfile, getProfile, deleteProfile } = require("../controllers/profile.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");
const { profileUpload } = require("../middleware/upload.middleware");

// Profiles can be sent as JSON or as multipart/form-data with an image and a resume PDF
router.post("/", protect, requireAccountReady, profileUpload, createProfile);
router.get("/me", protect, requireAccountReady, getMyProfile);
router.get("/:userId", protect, requireAccountReady, getProfile);
router.put("/", protect, requireAccountReady, profileUpload, updateProfile);
router.delete("/", protect, requireAccountReady, deleteProfile);

module.exports = router;
