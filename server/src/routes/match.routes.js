const express = require('express');
const router = express.Router();
const { getMatches, getCandidates } = require('../controllers/match.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getMatches);
router.get('/candidates', protect, getCandidates);

module.exports = router;
