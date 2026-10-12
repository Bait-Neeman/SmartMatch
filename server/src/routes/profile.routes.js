const express = require("express");
const router = express.Router();
const { createProfile, getMyProfile, updateProfile, getProfile, deleteProfile } = require("../controllers/profile.controller");
const { protect } = require("../middleware/auth.middleware");
const upload = require("../middleware/upload.middleware");

// Middleware to handle both JSON and multipart/form-data
const handleUpload = upload.fields([
  { name: 'resumePdf', maxCount: 1 },
  { name: 'resumePDF', maxCount: 1 },
  { name: 'image', maxCount: 1 },
  { name: 'profileImage', maxCount: 1 }
]);

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err) {
    console.error('Multer error:', err.message);
    return res.status(400).json({ message: err.message || 'File upload error' });
  }
  next();
};

router.post("/", protect, handleUpload, handleMulterError, createProfile);
router.get("/me", protect, getMyProfile);
router.get("/:userId", protect, getProfile);
router.put("/", protect, handleUpload, handleMulterError, updateProfile);
router.delete("/", protect, deleteProfile);

module.exports = router;