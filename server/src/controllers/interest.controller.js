const {
  sendInterest,
  respondInterest,
  getIncomingInterests,
  getOutgoingInterests,
  approveToManager,
} = require('../services/interest.service');

const createInterest = async (req, res) => {
  const interest = await sendInterest(req.user.userId, req.body?.receiverId);
  res.status(201).json({ message: 'הפנייה נשלחה בהצלחה', interest });
};

const getIncoming = async (req, res) => {
  const interests = await getIncomingInterests(req.user.userId);
  res.status(200).json({ interests });
};

const getOutgoing = async (req, res) => {
  const interests = await getOutgoingInterests(req.user.userId);
  res.status(200).json({ interests });
};

const respondToInterest = async (req, res) => {
  const { senderId, status } = req.body || {};
  const interest = await respondInterest(req.user.userId, senderId, status);
  res.status(200).json({ message: 'הפנייה עודכנה בהצלחה', interest });
};

const sendToManager = async (req, res) => {
  const interest = await approveToManager(req.user.userId, req.body?.otherUserId);
  res.status(200).json({ message: 'הפנייה הועברה לטיפול מנהל', interest });
};

module.exports = {
  createInterest,
  getIncoming,
  getOutgoing,
  respondToInterest,
  sendToManager,
};
