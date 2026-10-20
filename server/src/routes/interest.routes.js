const express = require('express');
const router = express.Router();
const {
  createInterest,
  getIncoming,
  getOutgoing,
  respondToInterest,
  sendToManager,
} = require('../controllers/interest.controller');
const { protect, requireAccountReady } = require('../middleware/auth.middleware');

router.post('/', protect, requireAccountReady, createInterest);
router.get('/incoming', protect, requireAccountReady, getIncoming);
router.get('/outgoing', protect, requireAccountReady, getOutgoing);
router.put('/respond', protect, requireAccountReady, respondToInterest);
router.post('/send-to-manager', protect, requireAccountReady, sendToManager);

module.exports = router;
