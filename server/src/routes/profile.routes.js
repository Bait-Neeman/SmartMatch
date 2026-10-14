const express = require("express");
const router = express.Router();
const { createProfile, getMyProfile, updateProfile, getProfile, deleteProfile } = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");
const { profileUpload } = require("../middleware/upload.middleware");

// Profiles can be sent as JSON or as multipart/form-data with an image and a resume PDF
router.post("/", protect, profileUpload, createProfile);
router.get("/me", protect, getMyProfile);
router.get("/:userId", protect, getProfile);
router.put("/", protect, profileUpload, updateProfile);
router.delete("/", protect, deleteProfile);

module.exports = router;
