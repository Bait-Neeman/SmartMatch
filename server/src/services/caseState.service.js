const AdminCase = require("../models/adminCase.model");
const Interest = require("../models/interest.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");

// Case phases the matchmaker sets after both sides forward a suggestion.
// new          הועבר לשדכן     initial, including a case with no AdminCase row yet
// coordinating בתיאום פגישה    optional, before a numbered meeting
// meeting      פגישה N         meetingNumber is the meeting (1, 2, 3, then N)
// ended        השידוך ירד      both people are free for new suggestions
// engaged      התארסו          both people leave the suggestion pool
//
// Legacy AdminCase.status values are not results by themselves:
//   new         stays new
//   in_progress becomes coordinating (it was an unnamed in-process state)
//   closed      becomes ended, never engaged (the old screen treated every
//               closed case as "מזל טוב")
const PHASES = ["new", "coordinating", "meeting", "ended", "engaged"];
const OPEN_PHASES = new Set(["new", "coordinating", "meeting"]);
const LEGACY_STATUS = {
  in_progress: "coordinating",
  closed: "ended",
};
const MAX_MEETING = 99;
const FORWARDED = {
  status: "accepted",
  senderApprovedToManager: true,
  receiverApprovedToManager: true,
};

const meetingLabel = (meetingNumber) => {
  const n = Number(meetingNumber);
  if (n === 1) return "פגישה ראשונה";
  if (n === 2) return "פגישה שנייה";
  if (n === 3) return "פגישה שלישית";
  if (Number.isInteger(n) && n > 3) return `פגישה ${n}`;
  return "פגישה";
};

const adminStatusLabel = (status, meetingNumber) => {
  if (status === "new") return "הועבר לשדכן";
  if (status === "coordinating") return "בתיאום פגישה";
  if (status === "meeting") return meetingLabel(meetingNumber);
  if (status === "ended") return "השידוך ירד";
  if (status === "engaged") return "התארסו";
  return "הועבר לשדכן";
};

const userStageLabel = (status, meetingNumber) => {
  if (status === "engaged") return "מזל טוב, התארסתם";
  return adminStatusLabel(status, meetingNumber);
};

const isOpenPhase = (status) => OPEN_PHASES.has(status);

const readMeetingNumber = (value) => {
  const n = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > MAX_MEETING) return null;
  return n;
};

const normalizeCase = (record) => {
  const raw = record?.status;
  if (raw === "in_progress" || raw === "closed") {
    return { status: LEGACY_STATUS[raw], meetingNumber: null, legacy: raw };
  }
  if (raw === "meeting") {
    return { status: "meeting", meetingNumber: readMeetingNumber(record.meetingNumber) || 1, legacy: null };
  }
  if (PHASES.includes(raw) && raw !== "meeting") {
    return { status: raw, meetingNumber: null, legacy: null };
  }
  return { status: "new", meetingNumber: null, legacy: raw ? String(raw) : null };
};

const sameState = (left, right) =>
  left.status === right.status && (left.meetingNumber || null) === (right.meetingNumber || null);

const nextCaseState = (current, body = {}) => {
  const hasAction = Object.prototype.hasOwnProperty.call(body, "action") && body.action != null && body.action !== "";
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  if (hasAction && hasStatus) {
    throw new HttpError(400, "סטטוס לא תקין");
  }
  if (!hasAction && !hasStatus) return null;

  if (hasAction) {
    if (body.action === "coordinating") return { status: "coordinating", meetingNumber: null };
    if (body.action === "ended") return { status: "ended", meetingNumber: null };
    if (body.action === "engaged") return { status: "engaged", meetingNumber: null };
    if (body.action === "nextMeeting") {
      const next = current.status === "meeting" ? current.meetingNumber + 1 : 1;
      if (next > MAX_MEETING) {
        throw new HttpError(400, "מספר הפגישה גבוה מדי");
      }
      return { status: "meeting", meetingNumber: next };
    }
    throw new HttpError(400, "סטטוס לא תקין");
  }

  if (!PHASES.includes(body.status)) {
    throw new HttpError(400, "סטטוס לא תקין");
  }
  if (body.status === "meeting") {
    const meetingNumber = readMeetingNumber(body.meetingNumber);
    if (!meetingNumber) {
      throw new HttpError(400, "מספר פגישה לא תקין");
    }
    return { status: "meeting", meetingNumber };
  }
  if (
    Object.prototype.hasOwnProperty.call(body, "meetingNumber") &&
    body.meetingNumber != null &&
    body.meetingNumber !== ""
  ) {
    throw new HttpError(400, "מספר פגישה לא תקין");
  }
  return { status: body.status, meetingNumber: null };
};

const presentHistory = (entry, nameById) => {
  const changedById = entry.changedBy ? String(entry.changedBy) : "";
  return {
    status: entry.status,
    meetingNumber: entry.meetingNumber || null,
    label: adminStatusLabel(entry.status, entry.meetingNumber),
    changedAt: entry.changedAt,
    source: entry.source || "admin",
    legacyStatus: entry.legacyStatus || "",
    changedBy: changedById ? { _id: entry.changedBy, name: nameById.get(changedById) || "" } : null,
  };
};

const presentCase = (record, nameById = new Map()) => {
  const normalized = normalizeCase(record);
  return {
    status: normalized.status,
    meetingNumber: normalized.meetingNumber,
    label: adminStatusLabel(normalized.status, normalized.meetingNumber),
    history: (record?.history || []).map((entry) => presentHistory(entry, nameById)),
  };
};

const actorIdsFrom = (records) => [
  ...new Set(
    records.flatMap((record) =>
      (record?.history || []).map((entry) => (entry.changedBy ? String(entry.changedBy) : "")).filter(Boolean)
    )
  ),
];

const namesById = async (ids) => {
  if (!ids.length) return new Map();
  const users = await User.find({ _id: { $in: ids } }).select("name").lean();
  return new Map(users.map((user) => [String(user._id), user.name || ""]));
};

const historyEntry = ({ status, meetingNumber, changedBy, changedAt, source, legacyStatus }) => ({
  status,
  meetingNumber: meetingNumber || null,
  changedBy: changedBy || null,
  changedAt: changedAt || new Date(),
  source: source || "admin",
  legacyStatus: legacyStatus || "",
});

// Rewrites stored legacy statuses in place. Safe to call more than once.
const migrateLegacyAdminCases = async () => {
  const rows = await AdminCase.find({ status: { $in: Object.keys(LEGACY_STATUS) } }).select(
    "_id status touchedAt updatedAt"
  );
  for (const row of rows) {
    const from = row.status;
    const next = LEGACY_STATUS[from];
    if (!next) continue;
    await AdminCase.updateOne(
      { _id: row._id, status: from },
      {
        $set: { status: next, meetingNumber: null },
        $push: {
          history: historyEntry({
            status: next,
            meetingNumber: null,
            changedBy: null,
            changedAt: row.touchedAt || row.updatedAt || new Date(),
            source: "migration",
            legacyStatus: from,
          }),
        },
      }
    );
  }
};

const loadForwardedCases = async () => {
  await migrateLegacyAdminCases();
  const interests = await Interest.find(FORWARDED).select("_id sender receiver").lean();
  const records = interests.length
    ? await AdminCase.find({ interest: { $in: interests.map((item) => item._id) } })
        .select("interest status meetingNumber")
        .lean()
    : [];
  const byInterest = new Map(records.map((record) => [String(record.interest), record]));
  return interests.map((interest) => ({
    interest,
    state: normalizeCase(byInterest.get(String(interest._id))),
  }));
};

const directoryBuckets = async () => {
  const rows = await loadForwardedCases();
  const engaged = new Set();
  const open = new Set();
  const ended = new Set();
  for (const row of rows) {
    const bucket = row.state.status === "engaged" ? engaged : row.state.status === "ended" ? ended : open;
    bucket.add(String(row.interest.sender));
    bucket.add(String(row.interest.receiver));
  }
  return { engaged, open, ended };
};

// One label per person. Engagement wins, then an open case, then an ended one.
// Someone with no forwarded case is "none" — not active.
const candidateStatus = (userId, buckets) => {
  if (buckets.engaged.has(userId)) return "engaged";
  if (buckets.open.has(userId)) return "in_process";
  if (buckets.ended.has(userId)) return "ended";
  return "none";
};

// Open cases and engagements stay out of new suggestions.
// An ended case does not block either person, except that the interest itself
// still keeps that pair from being suggested to each other.
const blockedFromSuggestions = async () => {
  const rows = await loadForwardedCases();
  const blocked = new Set();
  for (const row of rows) {
    if (row.state.status === "ended") continue;
    blocked.add(String(row.interest.sender));
    blocked.add(String(row.interest.receiver));
  }
  return blocked;
};

const caseStagesByInterest = async (interestIds) => {
  await migrateLegacyAdminCases();
  const ids = [...new Set((interestIds || []).filter(Boolean).map(String))];
  const records = ids.length
    ? await AdminCase.find({ interest: { $in: ids } }).select("interest status meetingNumber").lean()
    : [];
  const byInterest = new Map(records.map((record) => [String(record.interest), record]));
  const stages = new Map();
  for (const id of ids) {
    const state = normalizeCase(byInterest.get(id));
    stages.set(id, {
      caseStatus: state.status,
      meetingNumber: state.meetingNumber,
      caseStageLabel: userStageLabel(state.status, state.meetingNumber),
    });
  }
  return stages;
};

module.exports = {
  PHASES,
  MAX_MEETING,
  FORWARDED,
  LEGACY_STATUS,
  meetingLabel,
  adminStatusLabel,
  userStageLabel,
  isOpenPhase,
  normalizeCase,
  sameState,
  nextCaseState,
  presentCase,
  actorIdsFrom,
  namesById,
  historyEntry,
  migrateLegacyAdminCases,
  directoryBuckets,
  candidateStatus,
  blockedFromSuggestions,
  caseStagesByInterest,
};
