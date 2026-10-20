const express = require("express");
const router = express.Router();
const { openFile } = require("../controllers/file.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");

router.get("/:userId/:kind", protect, requireAccountReady, openFile);

module.exports = router;
