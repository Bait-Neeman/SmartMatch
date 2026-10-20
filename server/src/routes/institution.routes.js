const express = require("express");
const router = express.Router();
const { listInstitutions } = require("../controllers/institution.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");

router.get("/", protect, requireAccountReady, listInstitutions);

module.exports = router;
