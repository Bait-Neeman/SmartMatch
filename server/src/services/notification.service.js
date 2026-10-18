const Notice = require("../models/notice.model");
const Interest = require("../models/interest.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { assertObjectId } = require("../utils/validators");
const { loadVisibleLists, anonymousTitle, textOf } = require("./search.service");

// Same keys as the settings document. emailDigest is mail only, not an in-app row.
const DEFAULT_ON = {
  newSuggestion: true,
  interestReceived: true,
  activeSuggestion: true,
  matchmakerRequest: true,
  matchmakerStarted: true,
};

const TITLES = {
  newSuggestion: "הצעה חדשה",
  interestReceived: "התקבלה התעניינות",
  activeSuggestion: "הצעה פעילה חדשה",
  matchmakerRequest: "הצד השני מעוניין להתקדם לשדכן",
  matchmakerStarted: "העברה לשדכן",
  adminCase: "הצעה בטיפול",
};

const enabled = (prefs, key) => (prefs && typeof prefs[key] === "boolean" ? prefs[key] : DEFAULT_ON[key]);

const detailFor = (person, reveal) => {
  const place = [textOf(person?.city), textOf(person?.occupation)].filter(Boolean).join(" · ");
  const who = reveal && textOf(person?.name) ? textOf(person.name) : anonymousTitle(person);
  return [who, place].filter(Boolean).join(" · ");
};

const hrefFor = (kind, id) => {
  if (kind === "matchmaker") return `/matchmaker/${encodeURIComponent(id)}`;
  if (kind === "active") return `/active/${encodeURIComponent(id)}`;
  return `/suggestions/${kind}/${encodeURIComponent(id)}`;
};

const isDuplicate = (error) =>
  error?.code === 11000 || (Array.isArray(error?.writeErrors) && error.writeErrors.every((item) => item.code === 11000));

const remember = async (userId, desired) => {
  if (desired.length > 0) {
    try {
      await Notice.bulkWrite(
        desired.map((event) => ({
          updateOne: {
            filter: { user: userId, type: event.type, subject: event.subject },
            update: { $setOnInsert: { user: userId, type: event.type, subject: event.subject } },
            upsert: true,
          },
        })),
        { ordered: false }
      );
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
  }

  if (desired.length === 0) {
    await Notice.deleteMany({ user: userId });
  } else {
    await Notice.deleteMany({
      user: userId,
      $nor: desired.map((event) => ({ type: event.type, subject: event.subject })),
    });
  }

  const docs = await Notice.find({ user: userId }).sort({ createdAt: -1 }).lean();
  const byKey = new Map(desired.map((event) => [`${event.type}:${String(event.subject)}`, event]));
  const notifications = [];

  for (const doc of docs) {
    const event = byKey.get(`${doc.type}:${String(doc.subject)}`);
    if (!event) continue;
    notifications.push({
      id: String(doc._id),
      type: doc.type,
      title: event.title,
      detail: event.detail,
      href: event.href,
      read: Boolean(doc.readAt),
      createdAt: doc.createdAt,
    });
  }

  return notifications;
};

const eventsForUser = (lists, prefs) => {
  const events = [];

  if (enabled(prefs, "newSuggestion")) {
    for (const person of lists.newSuggestions) {
      if (!person?._id) continue;
      events.push({
        type: "newSuggestion",
        subject: person._id,
        title: TITLES.newSuggestion,
        detail: detailFor(person, false),
        href: hrefFor("new", person._id),
      });
    }
  }

  if (enabled(prefs, "interestReceived")) {
    for (const item of lists.received) {
      const person = item.sender;
      if (!person?._id) continue;
      events.push({
        type: "interestReceived",
        subject: person._id,
        title: TITLES.interestReceived,
        detail: detailFor(person, false),
        href: hrefFor("received", person._id),
      });
    }
  }

  const accepted = [...lists.active, ...lists.matchmaker];
  for (const person of accepted) {
    if (!person?._id) continue;
    let type = null;
    if (person.stage === "matchmaker") type = enabled(prefs, "matchmakerStarted") ? "matchmakerStarted" : null;
    else if (person.stage === "other-forwarded") type = enabled(prefs, "matchmakerRequest") ? "matchmakerRequest" : null;
    else if (person.stage === "active" || person.stage === "forwarded") {
      type = enabled(prefs, "activeSuggestion") ? "activeSuggestion" : null;
    }
    if (!type) continue;
    events.push({
      type,
      subject: person._id,
      title: TITLES[type],
      detail: detailFor(person, true),
      href: hrefFor(person.stage === "matchmaker" ? "matchmaker" : "active", person._id),
    });
  }

  return events;
};

const listForAdmin = async (userId) => {
  const cases = await Interest.find({
    status: "accepted",
    senderApprovedToManager: true,
    receiverApprovedToManager: true,
  })
    .select("sender receiver")
    .lean();

  const ids = [...new Set(cases.flatMap((item) => [String(item.sender), String(item.receiver)]))];
  const users = ids.length ? await User.find({ _id: { $in: ids } }).select("name").lean() : [];
  const nameOf = new Map(users.map((user) => [String(user._id), textOf(user.name)]));

  const desired = cases.map((item) => ({
    type: "adminCase",
    subject: item._id,
    title: TITLES.adminCase,
    detail: [nameOf.get(String(item.sender)), nameOf.get(String(item.receiver))].filter(Boolean).join(" · "),
    href: "/admin/matchmaker",
  }));

  const notifications = await remember(userId, desired);
  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    mailCount: cases.length,
  };
};

const listForUser = async (userId) => {
  const [lists, account] = await Promise.all([
    loadVisibleLists(userId),
    User.findById(userId).select("notifications").lean(),
  ]);
  const notifications = await remember(userId, eventsForUser(lists, account?.notifications));
  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
    mailCount: notifications.filter((item) => item.type === "interestReceived" && !item.read).length,
  };
};

const listNotifications = async (viewer) => {
  if (viewer.role === "admin") return listForAdmin(viewer.userId);
  return listForUser(viewer.userId);
};

const markNotificationRead = async (userId, noticeId) => {
  assertObjectId(noticeId, "ההתראה לא נמצאה");
  const notice = await Notice.findOne({ _id: noticeId, user: userId });
  if (!notice) throw new HttpError(404, "ההתראה לא נמצאה");
  if (!notice.readAt) {
    notice.readAt = new Date();
    await notice.save();
  }
};

const markAllNotificationsRead = async (userId) => {
  await Notice.updateMany({ user: userId, readAt: null }, { $set: { readAt: new Date() } });
};

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
