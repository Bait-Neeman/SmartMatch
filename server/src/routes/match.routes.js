const express = require('express');
const router = express.Router();
const { getMatches, getCandidates } = require('../controllers/match.controller');
const { protect, requireAccountReady } = require('../middleware/auth.middleware');

router.get('/', protect, requireAccountReady, getMatches);
router.get('/candidates', protect, requireAccountReady, getCandidates);

module.exports = router;
