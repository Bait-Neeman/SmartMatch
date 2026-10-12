const Interest = require('../models/interest.model');

const sendInterest = async (senderId, receiverId) => {
  if (senderId.toString() === receiverId.toString()) {
    const error = new Error('Cannot send interest to yourself');
    error.statusCode = 400;
    throw error;
  }

  const existing = await Interest.findOne({ sender: senderId, receiver: receiverId });
  if (existing) {
    const error = new Error('Interest already exists');
    error.statusCode = 400;
    throw error;
  }

  return await Interest.create({
    sender: senderId,
    receiver: receiverId,
    status: 'pending',
  });
};

const respondInterest = async (senderId, receiverId, status) => {
  if (!['accepted', 'rejected'].includes(status)) {
    const error = new Error('Invalid status');
    error.statusCode = 400;
    throw error;
  }

  const interest = await Interest.findOne({ sender: senderId, receiver: receiverId });
  if (!interest) {
    const error = new Error('Interest not found');
    error.statusCode = 404;
    throw error;
  }

  interest.status = status;
  return await interest.save();
};

const getIncomingInterests = async (userId) => {
  return await Interest.find({ receiver: userId })
    .populate('sender', 'name idNumber role')
    .sort({ createdAt: -1 });
};

const getOutgoingInterests = async (userId) => {
  return await Interest.find({ sender: userId })
    .populate('receiver', 'name idNumber role')
    .sort({ createdAt: -1 });
};

const approveToManager = async (userId, otherUserId, approverRole) => {
  // Find interest in either direction
  const interest = await Interest.findOne({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId }
    ]
  });
  if (!interest) {
    const error = new Error('Interest not found');
    error.statusCode = 404;
    throw error;
  }

  if (interest.status !== 'accepted') {
    const error = new Error('Interest must be accepted before approving to manager');
    error.statusCode = 400;
    throw error;
  }

  if (approverRole === 'sender') {
    interest.senderApprovedToManager = true;
  } else if (approverRole === 'receiver') {
    interest.receiverApprovedToManager = true;
  }

  return await interest.save();
};

module.exports = {
  sendInterest,
  respondInterest,
  getIncomingInterests,
  getOutgoingInterests,
  approveToManager,
};
