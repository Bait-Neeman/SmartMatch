const Interest = require('../models/interest.model');
const User = require('../models/user.model');
const Profile = require('../models/profile.model');
const Preference = require('../models/preference.model');
const HttpError = require('../utils/httpError');
const { assertObjectId } = require('../utils/validators');
const { stageForViewer } = require('../utils/suggestionStage');
const { toPublicPerson, redactIdentity, withoutMatchPercent } = require('./privacy.service');
const { getCandidatesForUser, computeMatchPercent } = require('./match.service');

const RESPONSE_STATUSES = ['accepted', 'rejected'];
const USER_NOT_FOUND = 'המשתמש לא נמצא';
const SUGGESTIONS_PAUSED = 'קבלת ההצעות מושהית. בטלו את ההשהיה כדי לשלוח התעניינות חדשה';

const isDuplicateKey = (error) => error?.code === 11000 || error?.cause?.code === 11000;

const findInterestBetween = (userA, userB) =>
  Interest.findOne({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  });

// One interest per pair. If both users create a row at the same moment, keep the
// earlier one, mark it accepted, and drop the duplicate. Concurrent calls agree on
// the same row because the sort is stable.
const settlePair = async (userA, userB) => {
  const docs = await Interest.find({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  if (docs.length === 0) return null;

  if (docs.length > 1) {
    const rejected = docs.find((doc) => doc.status === 'rejected');
    const keep = rejected || docs[0];
    const extraIds = docs.filter((doc) => String(doc._id) !== String(keep._id)).map((doc) => doc._id);

    if (!rejected && keep.status === 'pending') {
      // Only a row that is still pending can become accepted. A rejection that
      // landed after this read is not overwritten.
      await Interest.updateOne({ _id: keep._id, status: 'pending' }, { $set: { status: 'accepted' } });
    }
    if (extraIds.length > 0) {
      // Leave a rejected row in place. Only a still-pending duplicate is removed.
      await Interest.deleteMany({ _id: { $in: extraIds }, status: 'pending' });
    }
  }

  const rejectedNow = await Interest.findOne({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
    status: 'rejected',
  });
  if (rejectedNow) return rejectedNow;

  return Interest.findOne({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  }).sort({ createdAt: 1, _id: 1 });
};

// Promote the other person's still-pending interest. If a rejection landed first,
// this does not report that rejected row as a successful send.
const acceptIfStillPending = async (interestId, senderId, receiverId) => {
  const promoted = await Interest.findOneAndUpdate(
    { _id: interestId, status: 'pending' },
    { $set: { status: 'accepted' } },
    { returnDocument: 'after' }
  );
  if (promoted) return promoted;

  const current = await settlePair(senderId, receiverId);
  if (current?.status === 'rejected') {
    throw new HttpError(409, 'הפנייה כבר נדחתה');
  }
  if (current?.status === 'accepted') return current;
  if (current?.status === 'pending' && String(current.sender) === String(senderId)) {
    return current;
  }
  throw new HttpError(409, 'לא ניתן לעדכן את הפנייה');
};

// A brand-new interest is allowed only when matching would currently show that
// person, or when they already sent one to the sender. Anything else uses the
// same not-found response as an unknown id.
const mayStartInterest = async (senderId, receiverId) => {
  const incoming = await Interest.exists({ sender: receiverId, receiver: senderId });
  if (incoming) return true;

  try {
    const { candidates } = await getCandidatesForUser(senderId);
    return candidates.some((candidate) => String(candidate._id) === String(receiverId));
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 404) return false;
    throw error;
  }
};

const sendInterest = async (senderId, receiverId) => {
  assertObjectId(receiverId, USER_NOT_FOUND);

  if (String(senderId) === String(receiverId)) {
    throw new HttpError(400, 'לא ניתן לשלוח פנייה לעצמך');
  }

  const receiver = await User.findById(receiverId).select('role').lean();
  if (!receiver || receiver.role !== 'user') {
    throw new HttpError(404, USER_NOT_FOUND);
  }

  // A pending interest from the other person is mutual approval, not a conflict —
  // including when both requests arrive together.
  const open = async () => {
    const settled = await settlePair(senderId, receiverId);
    if (!settled) return null;
    if (settled.status === 'accepted') return settled;
    if (settled.status === 'rejected') {
      throw new HttpError(409, 'הפנייה כבר נדחתה');
    }
    if (String(settled.sender) !== String(senderId)) {
      return acceptIfStillPending(settled._id, senderId, receiverId);
    }
    throw new HttpError(409, 'כבר שלחת פנייה למשתמש זה');
  };

  const existing = await open();
  if (existing) return existing;

  if (!(await mayStartInterest(senderId, receiverId))) {
    // The other request may have created the row while candidates were loaded.
    const recovered = await open();
    if (recovered) return recovered;
    // A paused account cannot start a new interest. Replies still pass mayStartInterest
    // because an incoming interest returns true before this branch. A target below the
    // viewer's own minimum percent stays a generic not-found, so the response does not
    // reveal that the person exists.
    const sender = await User.findById(senderId).select('pauseSuggestions').lean();
    if (sender?.pauseSuggestions) {
      throw new HttpError(403, SUGGESTIONS_PAUSED);
    }
    throw new HttpError(404, USER_NOT_FOUND);
  }

  let created = null;
  try {
    created = await Interest.create({
      sender: senderId,
      receiver: receiverId,
      status: 'pending',
    });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  const settled = await settlePair(senderId, receiverId);
  if (settled?.status === 'accepted') return settled;
  if (settled?.status === 'rejected') {
    throw new HttpError(409, 'הפנייה כבר נדחתה');
  }

  if (created && settled && String(settled.sender) === String(senderId) && settled.status === 'pending') {
    // The other person may have inserted the opposite row while this one was being saved.
    const latest = await settlePair(senderId, receiverId);
    if (latest?.status === 'accepted') return latest;
    if (latest?.status === 'rejected') {
      throw new HttpError(409, 'הפנייה כבר נדחתה');
    }
    if (latest && String(latest.sender) !== String(senderId) && latest.status === 'pending') {
      return acceptIfStillPending(latest._id, senderId, receiverId);
    }
    if (latest?.status === 'pending' && String(latest.sender) === String(senderId)) {
      return latest;
    }
    throw new HttpError(409, 'לא ניתן לעדכן את הפנייה');
  }

  // The other request won the race and now holds the pair.
  if (!created || (settled && String(settled.sender) !== String(senderId))) {
    const recovered = await open();
    if (recovered) return recovered;
  }

  throw new HttpError(409, 'כבר שלחת פנייה למשתמש זה');
};

const pairFilter = (userA, userB) => ({
  $or: [
    { sender: userA, receiver: userB },
    { sender: userB, receiver: userA },
  ],
});

// Either person may decline a pending or accepted interest. Run twice so an accept
// that lands between the two updates is still turned into a rejection.
const rejectPair = async (userId, otherUserId) => {
  const filter = { ...pairFilter(userId, otherUserId), status: { $in: ['pending', 'accepted'] } };
  const update = {
    $set: {
      status: 'rejected',
      rejectedBy: userId,
      senderApprovedToManager: false,
      receiverApprovedToManager: false,
    },
  };
  const first = await Interest.updateMany(filter, update);
  const second = await Interest.updateMany(filter, update);
  return first.matchedCount + second.matchedCount;
};

const respondInterest = async (userId, otherUserId, status) => {
  if (!RESPONSE_STATUSES.includes(status)) {
    throw new HttpError(400, 'סטטוס לא תקין');
  }
  assertObjectId(otherUserId);

  if (status === 'rejected') {
    const matched = await rejectPair(userId, otherUserId);
    if (matched > 0) {
      return Interest.findOne(pairFilter(userId, otherUserId)).sort({ createdAt: 1, _id: 1 });
    }
  } else {
    // Only the receiver can accept, and only while the interest is still pending.
    const interest = await Interest.findOneAndUpdate(
      { sender: otherUserId, receiver: userId, status: 'pending' },
      { $set: { status: 'accepted' } },
      { returnDocument: 'after' }
    );
    if (interest) return interest;
  }

  const existing = await Interest.findOne(pairFilter(userId, otherUserId)).select('_id').lean();
  if (!existing) {
    throw new HttpError(404, 'הפנייה לא נמצאה');
  }
  throw new HttpError(409, 'לא ניתן לעדכן את הפנייה');
};

const otherUserId = (interest, viewerId) =>
  String(interest.sender) === String(viewerId) ? interest.receiver : interest.sender;

// Name, photo, and resume are attached only once the interest is accepted.
// The contact phone is never attached for another user.
const withPublicCounterparts = async (interests, viewerId) => {
  if (interests.length === 0) return [];

  const otherIds = interests.map((interest) => otherUserId(interest, viewerId));
  const revealIds = interests
    .filter((interest) => interest.status === 'accepted')
    .map((interest) => otherUserId(interest, viewerId));

  const contextIds = [...new Set([String(viewerId), ...otherIds.map(String)])];
  const [users, profiles, preferences, viewerProfile] = await Promise.all([
    revealIds.length ? User.find({ _id: { $in: revealIds } }).select('name email').lean() : [],
    Profile.find({ user: { $in: contextIds } }).lean(),
    Preference.find({ user: { $in: contextIds } }).lean(),
    Profile.findOne({ user: viewerId }).lean(),
  ]);

  const userById = new Map(users.map((user) => [String(user._id), user]));
  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const preferenceByUser = new Map(preferences.map((preference) => [String(preference.user), preference]));
  if (viewerProfile) profileByUser.set(String(viewerId), viewerProfile);

  return withoutMatchPercent(interests.map((interest) => {
    const otherId = otherUserId(interest, viewerId);
    const revealIdentity = interest.status === 'accepted';
    const person = toPublicPerson(
      revealIdentity ? userById.get(String(otherId)) : { _id: otherId },
      profileByUser.get(String(otherId)),
      { revealIdentity }
    );
    person._id = otherId;
    person.matchPercent = computeMatchPercent(
      profileByUser.get(String(viewerId)),
      preferenceByUser.get(String(viewerId)),
      profileByUser.get(String(otherId)),
      preferenceByUser.get(String(otherId))
    );

    const view =
      String(interest.sender) === String(viewerId)
        ? { ...interest, receiver: person, ...stageForViewer(interest, viewerId) }
        : { ...interest, sender: person, ...stageForViewer(interest, viewerId) };

    return redactIdentity(view, { revealIdentity });
  }));
};

const getIncomingInterests = async (userId) => {
  const interests = await Interest.find({ receiver: userId }).sort({ createdAt: -1 }).lean();
  return withPublicCounterparts(interests, userId);
};

const getOutgoingInterests = async (userId) => {
  const interests = await Interest.find({ sender: userId }).sort({ createdAt: -1 }).lean();
  return withPublicCounterparts(interests, userId);
};

const approveToManager = async (userId, otherUserIdValue) => {
  assertObjectId(otherUserIdValue);

  const interest = await findInterestBetween(userId, otherUserIdValue);
  if (!interest) {
    throw new HttpError(404, 'הפנייה לא נמצאה');
  }

  if (interest.status !== 'accepted') {
    throw new HttpError(400, 'יש לאשר את הפנייה לפני העברה לטיפול מנהל');
  }

  if (String(interest.sender) === String(userId)) {
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
