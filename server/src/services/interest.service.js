const Interest = require('../models/interest.model');
const User = require('../models/user.model');
const HttpError = require('../utils/httpError');
const { assertObjectId } = require('../utils/validators');

const RESPONSE_STATUSES = ['accepted', 'rejected'];

// Other users are identified by name only - their ID number is private
const OTHER_USER_FIELDS = 'name';

const findInterestBetween = (userA, userB) =>
  Interest.findOne({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  });

const sendInterest = async (senderId, receiverId) => {
  assertObjectId(receiverId, 'המשתמש לא נמצא');

  if (senderId === receiverId) {
    throw new HttpError(400, 'לא ניתן לשלוח פנייה לעצמך');
  }

  const receiver = await User.findById(receiverId).select('role').lean();
  if (!receiver || receiver.role !== 'user') {
    throw new HttpError(404, 'המשתמש לא נמצא');
  }

  // One interest per pair of users, whichever of them sent it
  const existing = await findInterestBetween(senderId, receiverId).lean();
  if (existing) {
    const message =
      String(existing.sender) === senderId
        ? 'כבר שלחת פנייה למשתמש זה'
        : 'משתמש זה כבר שלח לך פנייה - אפשר לאשר אותה בדף הפניות';
    throw new HttpError(409, message);
  }

  return Interest.create({
    sender: senderId,
    receiver: receiverId,
    status: 'pending',
  });
};

const respondInterest = async (receiverId, senderId, status) => {
  if (!RESPONSE_STATUSES.includes(status)) {
    throw new HttpError(400, 'סטטוס לא תקין');
  }
  assertObjectId(senderId);

  const interest = await Interest.findOne({ sender: senderId, receiver: receiverId });
  if (!interest) {
    throw new HttpError(404, 'הפנייה לא נמצאה');
  }

  interest.status = status;
  if (status === 'rejected') {
    // A rejected match must not stay waiting for the manager
    interest.senderApprovedToManager = false;
    interest.receiverApprovedToManager = false;
  }

  return interest.save();
};

const getIncomingInterests = (userId) =>
  Interest.find({ receiver: userId })
    .populate('sender', OTHER_USER_FIELDS)
    .sort({ createdAt: -1 });

const getOutgoingInterests = (userId) =>
  Interest.find({ sender: userId })
    .populate('receiver', OTHER_USER_FIELDS)
    .sort({ createdAt: -1 });

const approveToManager = async (userId, otherUserId) => {
  assertObjectId(otherUserId);

  const interest = await findInterestBetween(userId, otherUserId);
  if (!interest) {
    throw new HttpError(404, 'הפנייה לא נמצאה');
  }

  if (interest.status !== 'accepted') {
    throw new HttpError(400, 'יש לאשר את הפנייה לפני העברה לטיפול מנהל');
  }

  if (String(interest.sender) === userId) {
    interest.senderApprovedToManager = true;
  } else {
    interest.receiverApprovedToManager = true;
  }

  return interest.save();
};

module.exports = {
  sendInterest,
  respondInterest,
  getIncomingInterests,
  getOutgoingInterests,
  approveToManager,
};
