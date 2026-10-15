const express = require("express");
const router = express.Router();
const { getSettings, updateSettings, updatePassword, removeAccount } = require("../controllers/settings.controller");
const { protect } = require("../middleware/auth.middleware");

// Always the logged-in user. There is no user id in the path.
router.use(protect);

router.get("/", getSettings);
router.patch("/", updateSettings);
router.post("/password", updatePassword);
router.delete("/", removeAccount);

module.exports = router;
