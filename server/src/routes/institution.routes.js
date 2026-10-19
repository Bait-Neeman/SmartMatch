const express = require("express");
const router = express.Router();
const { listInstitutions } = require("../controllers/institution.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", protect, listInstitutions);

module.exports = router;
