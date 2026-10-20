const express = require("express");
const router = express.Router();

const {
  getPending,
  getSuggestions,
  removePending,
  getUsers,
  getUserProfile,
  getSummary,
  getCases,
  search,
  patchCase,
  getSettings,
  patchSettings,
  putAccount,
  postCandidate,
  postMember,
  postAccessCode,
  postAccessReset,
  postMatchmaker,
  putUserPassword,
} = require("../controllers/admin.controller");

const { protect, requireAdmin } = require("../middleware/auth.middleware");

router.use(protect, requireAdmin);

router.get("/summary", getSummary);
router.get("/search", search);
router.get("/settings", getSettings);
router.patch("/settings", patchSettings);
router.put("/account", putAccount);
router.post("/candidates", postCandidate);
router.post("/members", postMember);
router.post("/matchmakers", postMatchmaker);

router.get("/cases", getCases);
router.get("/suggestions", getSuggestions);
router.patch("/cases/:id", patchCase);

router.get("/pending-matches", getPending);
router.delete("/pending-match", removePending);

router.get("/users", getUsers);
router.get("/users/:userId/profile", getUserProfile);
router.put("/users/:userId/password", putUserPassword);
router.post("/users/:userId/access-code", postAccessCode);
router.post("/users/:userId/access-reset", postAccessReset);

module.exports = router;
