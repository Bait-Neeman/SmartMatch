const express = require("express");
const router = express.Router();
const { openFile } = require("../controllers/file.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/:userId/:kind", protect, openFile);

module.exports = router;
