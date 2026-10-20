const express = require("express");
const router = express.Router();
const { list, readOne, readAll } = require("../controllers/notification.controller");
const { protect, requireAccountReady } = require("../middleware/auth.middleware");

router.use(protect, requireAccountReady);
router.get("/", list);
router.post("/read-all", readAll);
router.post("/:id/read", readOne);

module.exports = router;
