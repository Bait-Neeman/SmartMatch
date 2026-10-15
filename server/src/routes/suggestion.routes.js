const express = require("express");
const router = express.Router();
const { getLists } = require("../controllers/suggestion.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, getLists);

module.exports = router;
