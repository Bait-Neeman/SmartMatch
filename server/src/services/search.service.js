const Interest = require("../models/interest.model");
const Profile = require("../models/profile.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { PUBLIC_PROFILE_FIELDS } = require("./privacy.service");
const { getCandidatesForUser, getMatchesForUser } = require("./match.service");
const { getIncomingInterests, getOutgoingInterests } = require("./interest.service");

const ACTIVE_STAGES = new Set(["active", "forwarded", "other-forwarded"]);
const RESULT_LIMIT = 8;
const MIN_QUERY = 2;

const ETHNICITY = { ashkenazi: "אשכנזי", sephardic: "ספרדי", yemenite: "תימני", other: "אחר" };
const STYLE = { conservative: "שמור", classic: "קלאסי", modern: "מודרני", open: "פתוח" };
const APPEARANCE = { slim: "רזה", average: "ממוצע", full: "מלא", chubby: "רחב" };
const MARITAL = {
  single: { male: "רווק", female: "רווקה" },
  divorced: { male: "גרוש", female: "גרושה" },
  widowed: { male: "אלמן", female: "אלמנה" },
};
const GENDER = { male: "זכר", female: "נקבה" };
const NOUN = { male: "בן", female: "בת" };

const textOf = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text || text === "undefined" || text === "null") return "";
  return text;
};

const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase().slice(0, 80) : "");

const anonymousTitle = (person) => {
  const noun = NOUN[person?.gender] || "";
  const ageText = textOf(person?.age);
  const age = ageText && Number.isFinite(Number(ageText)) ? String(Math.round(Number(ageText))) : ageText;
  if (noun && age) return `${noun} ${age}`;
  if (age) return `גיל ${age}`;
  if (noun) return noun;
  return "הצעה";
};

const labelsFor = (person) => {
  const labels = [];
  if (ETHNICITY[person?.ethnicity]) labels.push(ETHNICITY[person.ethnicity]);
  if (STYLE[person?.style]) labels.push(STYLE[person.style]);
  if (APPEARANCE[person?.appearance]) labels.push(APPEARANCE[person.appearance]);
  const gender = person?.gender === "female" || person?.gender === "male" ? person.gender : "";
  if (GENDER[gender]) labels.push(GENDER[gender]);
  if (NOUN[gender]) labels.push(NOUN[gender]);
  const marital = MARITAL[person?.maritalStatus];
  if (marital) labels.push(gender === "female" ? marital.female : marital.male);
  return labels;
};

// Public profile fields only. Name, email, and phone are added solely when this
// viewer is already allowed to see them. Photos, resumes, and the national ID
// are never part of the search text.
const haystack = (person, reveal) => {
  const bits = [anonymousTitle(person), ...labelsFor(person)];
  for (const field of PUBLIC_PROFILE_FIELDS) {
    const text = textOf(person?.[field]);
    if (text) bits.push(text);
  }
  if (reveal) {
    for (const field of ["name", "email", "phone"]) {
      const text = textOf(person?.[field]);
      if (text) bits.push(text);
    }
  }
  return bits.join(" ").toLowerCase();
};

const subtitleOf = (person) =>
  [textOf(person?.city), textOf(person?.occupation) || textOf(person?.yeshiva) || textOf(person?.seminar)]
    .filter(Boolean)
    .join(" · ");

const hrefFor = (kind, id) => {
  if (kind === "matchmaker") return `/matchmaker/${encodeURIComponent(id)}`;
  if (kind === "active") return `/active/${encodeURIComponent(id)}`;
  return `/suggestions/${kind}/${encodeURIComponent(id)}`;
};

const toResult = (person, kind, reveal) => {
  const id = String(person._id);
  const title = reveal && textOf(person.name) ? textOf(person.name) : anonymousTitle(person);
  return {
    id,
    kind,
    title,
    subtitle: subtitleOf(person),
    href: hrefFor(kind, id),
  };
};

const loadVisibleLists = async (userId) => {
  let newSuggestions = [];
  try {
    newSuggestions = (await getCandidatesForUser(userId)).candidates;
  } catch (error) {
    if (!(error instanceof HttpError && error.statusCode === 404)) throw error;
  }

  const [incoming, outgoing, matches] = await Promise.all([
    getIncomingInterests(userId),
    getOutgoingInterests(userId),
    getMatchesForUser(userId),
  ]);

  return {
    newSuggestions,
    sent: outgoing.filter((item) => item.status === "pending"),
    received: incoming.filter((item) => item.status === "pending"),
    active: matches.filter((item) => ACTIVE_STAGES.has(item.stage)),
    matchmaker: matches.filter((item) => item.stage === "matchmaker"),
  };
};

const searchUser = async (userId, needle) => {
  const lists = await loadVisibleLists(userId);
  const rows = [];

  const consider = (person, kind, reveal) => {
    if (!person?._id || rows.length >= RESULT_LIMIT) return;
    if (!haystack(person, reveal).includes(needle)) return;
    rows.push(toResult(person, kind, reveal));
  };

  for (const item of lists.received) consider(item.sender, "received", false);
  for (const item of lists.sent) consider(item.receiver, "sent", false);
  for (const person of lists.active) consider(person, "active", true);
  for (const person of lists.matchmaker) consider(person, "matchmaker", true);
  for (const person of lists.newSuggestions) consider(person, "new", false);

  return rows;
};

const searchAdmin = async (needle) => {
  const users = await User.find({ role: "user" }).select("name").lean();
  const userIds = users.map((user) => user._id);
  const [profiles, cases] = await Promise.all([
    Profile.find({ user: { $in: userIds } })
      .select(["user", ...PUBLIC_PROFILE_FIELDS].join(" "))
      .lean(),
    Interest.find({
      status: "accepted",
      senderApprovedToManager: true,
      receiverApprovedToManager: true,
    })
      .select("sender receiver")
      .lean(),
  ]);

  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const rows = [];

  for (const user of users) {
    if (rows.length >= RESULT_LIMIT) break;
    const profile = profileByUser.get(String(user._id)) || {};
    const person = { ...profile, _id: user._id, name: user.name };
    if (!haystack(person, true).includes(needle)) continue;
    rows.push({
      id: String(user._id),
      kind: "user",
      title: textOf(user.name) || anonymousTitle(person),
      subtitle: subtitleOf(person),
      href: "/admin/users",
    });
  }

  const nameOf = new Map(users.map((user) => [String(user._id), textOf(user.name)]));
  for (const item of cases) {
    if (rows.length >= RESULT_LIMIT) break;
    const left = nameOf.get(String(item.sender));
    const right = nameOf.get(String(item.receiver));
    const leftCity = textOf(profileByUser.get(String(item.sender))?.city);
    const rightCity = textOf(profileByUser.get(String(item.receiver))?.city);
    const blob = [left, right, leftCity, rightCity, "תיק"].join(" ").toLowerCase();
    if (!blob.includes(needle)) continue;
    rows.push({
      id: String(item._id),
      kind: "case",
      title: [left, right].filter(Boolean).join(" · ") || "תיק",
      subtitle: [leftCity, rightCity].filter(Boolean).join(" · "),
      href: "/admin/matchmaker",
    });
  }

  return rows;
};

const searchForViewer = async (viewer, rawQuery) => {
  const needle = normalize(rawQuery);
  if (needle.length < MIN_QUERY) return [];
  if (viewer.role === "admin") return searchAdmin(needle);
  return searchUser(viewer.userId, needle);
};

module.exports = {
  searchForViewer,
  loadVisibleLists,
  anonymousTitle,
  textOf,
};
