const express = require("express");
const router = express.Router();
const { getLists } = require("../controllers/suggestion.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");

router.get("/", protect, requireAccountReady, getLists);

module.exports = router;
