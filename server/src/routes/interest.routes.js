const express = require('express');
const router = express.Router();
const {
  createInterest,
  getIncoming,
  getOutgoing,
  respondToInterest,
  sendToManager,
} = require('../controllers/interest.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/', protect, createInterest);
router.get('/incoming', protect, getIncoming);
router.get('/outgoing', protect, getOutgoing);
router.put('/respond', protect, respondToInterest);
router.post('/send-to-manager', protect, sendToManager);

module.exports = router;
