const express = require("express");
const router = express.Router();
const { search } = require("../controllers/search.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");

router.get("/", protect, requireAccountReady, search);

module.exports = router;
