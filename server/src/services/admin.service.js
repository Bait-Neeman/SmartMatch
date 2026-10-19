const Interest = require("../models/interest.model");
const User = require("../models/user.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const AdminCase = require("../models/adminCase.model");
const AdminSettings = require("../models/adminSettings.model");
const { DEFAULT_SETTINGS } = require("../models/adminSettings.model");
const HttpError = require("../utils/httpError");
const {
  assertObjectId,
  validateEmail,
  validateIdNumber,
  validateName,
  passwordErrorMessage,
} = require("../utils/validators");
const { comparePassword } = require("../utils/hash");
const { generateToken } = require("../config/jwt");
const { fileAccessPath } = require("./storage.service");
const { toOwnerProfile } = require("./profile.service");
const { getCandidatesForUser, computeMatchPercent } = require("./match.service");
const AdminStaff = require("../models/adminStaff.model");

// Admin-only views. Identity and contact stay here.
// Case notes live on AdminCase, not on Interest, so they are never copied
// into the interest responses that the couple receives.

const FORWARDED = {
  status: "accepted",
  senderApprovedToManager: true,
  receiverApprovedToManager: true,
};

const CASE_STATUSES = ["new", "in_progress", "closed"];
const SETTING_FLAGS = [
  "notifyNewCase",
  "notifyOneSide",
  "notifyNewRegistration",
  "dailySummary",
  "autoClose",
  "revealIdentity",
];
const STALE_MS = 60 * 24 * 60 * 60 * 1000;
const USER_FIELDS = "name email phone idNumber role createdAt";
const GENDERS = new Set(["male", "female"]);

// Every stored profile field the matchmaker is allowed to read. File ids are
// replaced with protected paths below and never copied out.
const PROFILE_DETAIL_FIELDS = [
  "gender",
  "age",
  "city",
  "height",
  "style",
  "appearance",
  "ethnicity",
  "description",
  "lookingFor",
  "maritalStatus",
  "occupation",
  "working",
  "workingInProfession",
  "workplace",
  "yeshiva",
  "seminar",
  "financialRequirement",
  "financialCapabilities",
  "financialStatus",
  "financialDemand",
  "financialParticipation",
  "resumeSize",
  "resumeUploadedAt",
];

const PREFERENCE_FIELDS = [
  "ageMin",
  "ageMax",
  "city",
  "heightMin",
  "heightMax",
  "style",
  "preferredAppearance",
  "financialMin",
  "financialMax",
  "preferredMaritalStatus",
  "preferredEthnicity",
  "preferredYeshiva",
  "preferredSeminar",
  "preferredOccupation",
  "onlyWorking",
  "onlyWorkingInProfession",
  "excludeIncomplete",
];

const blankFields = (fields) => Object.fromEntries(fields.map((field) => [field, null]));

const toAdminPreference = (preference) => {
  const full = blankFields(PREFERENCE_FIELDS);
  if (!preference) return full;
  for (const field of PREFERENCE_FIELDS) {
    if (preference[field] != null && preference[field] !== "") full[field] = preference[field];
  }
  full.excludeIncomplete = preference.excludeIncomplete === true;
  return full;
};

const toAdminProfile = (userId, profile) => {
  if (!profile) return null;
  return {
    ...blankFields(PROFILE_DETAIL_FIELDS),
    ...Object.fromEntries(
      PROFILE_DETAIL_FIELDS.filter((field) => profile[field] != null && profile[field] !== "").map((field) => [
        field,
        profile[field],
      ])
    ),
    image: fileAccessPath(userId, "image", profile.image),
    resumePdf: fileAccessPath(userId, "resumePdf", profile.resumePdf),
  };
};

// Full contact, profile, and preference for one person. Password and token
// version are never copied, even if the caller loaded them.
const toAdminPerson = (user, profile, preference) => {
  const id = user?._id || profile?.user || null;
  return {
    _id: id,
    name: user?.name || "",
    email: user?.email || null,
    phone: user?.phone || null,
    idNumber: user?.idNumber || null,
    role: user?.role || null,
    age: profile?.age ?? null,
    city: profile?.city || "",
    gender: profile?.gender || "",
    image: fileAccessPath(id, "image", profile?.image),
    resumePdf: fileAccessPath(id, "resumePdf", profile?.resumePdf),
    profile: toAdminProfile(id, profile),
    preference: toAdminPreference(preference),
  };
};

const toAdminAccount = (user) => {
  if (!user) return null;
  const plain = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete plain.password;
  delete plain.tokenVersion;
  delete plain.__v;
  return plain;
};

const removePendingMatch = async (senderId, receiverId) => {
  assertObjectId(senderId);
  assertObjectId(receiverId);

  const interest = await Interest.findOne({ sender: senderId, receiver: receiverId });
  if (!interest) {
    throw new HttpError(404, "הפנייה לא נמצאה");
  }

  interest.senderApprovedToManager = false;
  interest.receiverApprovedToManager = false;

  return interest.save();
};

const caseNumberFrom = (id) => String(parseInt(String(id).slice(-4), 16) % 10000).padStart(4, "0");

const toParty = (user, profile, preference) => toAdminPerson(user, profile, preference);

const monthStart = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), 1);

const readSettings = async (adminId) => {
  const stored = await AdminSettings.findOne({ user: adminId }).lean();
  if (!stored) return { ...DEFAULT_SETTINGS };
  return {
    notifyNewCase: stored.notifyNewCase,
    notifyOneSide: stored.notifyOneSide,
    notifyNewRegistration: stored.notifyNewRegistration,
    dailySummary: stored.dailySummary,
    autoClose: stored.autoClose,
    revealIdentity: stored.revealIdentity,
    activityArea: stored.activityArea || "",
  };
};

const publicSettings = (settings) => ({
  notifyNewCase: settings.notifyNewCase,
  notifyOneSide: settings.notifyOneSide,
  notifyNewRegistration: settings.notifyNewRegistration,
  dailySummary: settings.dailySummary,
  autoClose: settings.autoClose,
  revealIdentity: settings.revealIdentity,
  activityArea: settings.activityArea || "",
});

const closeStaleCases = async (adminId) => {
  const settings = await readSettings(adminId);
  if (!settings.autoClose) return;

  const cutoff = new Date(Date.now() - STALE_MS);
  const interests = await Interest.find(FORWARDED).select("_id updatedAt").lean();
  if (!interests.length) return;

  const records = await AdminCase.find({
    interest: { $in: interests.map((item) => item._id) },
  }).lean();
  const byInterest = new Map(records.map((record) => [String(record.interest), record]));
  const staleIds = [];

  for (const interest of interests) {
    const record = byInterest.get(String(interest._id));
    if (record?.status === "closed") continue;
    const touched = record?.touchedAt || record?.updatedAt || interest.updatedAt;
    if (touched && new Date(touched).getTime() <= cutoff.getTime()) {
      staleIds.push(interest._id);
    }
  }

  if (!staleIds.length) return;

  const now = new Date();
  await AdminCase.bulkWrite(
    staleIds.map((id) => ({
      updateOne: {
        filter: { interest: id },
        update: { $set: { status: "closed", touchedAt: now } },
        upsert: true,
      },
    }))
  );
};

const loadForwarded = () => Interest.find(FORWARDED).sort({ createdAt: -1 }).lean();

const shapeCases = async (interests) => {
  if (!interests.length) return [];

  const userIds = [
    ...new Set(interests.flatMap((item) => [String(item.sender), String(item.receiver)])),
  ];
  const [users, profiles, preferences, records] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("name email phone idNumber role").lean(),
    Profile.find({ user: { $in: userIds } }).lean(),
    Preference.find({ user: { $in: userIds } }).lean(),
    AdminCase.find({ interest: { $in: interests.map((item) => item._id) } }).lean(),
  ]);
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const preferenceByUser = new Map(preferences.map((preference) => [String(preference.user), preference]));
  const caseByInterest = new Map(records.map((record) => [String(record.interest), record]));

  return interests.map((item) => {
    const senderId = String(item.sender);
    const receiverId = String(item.receiver);
    const senderProfile = profileByUser.get(senderId);
    const receiverProfile = profileByUser.get(receiverId);
    const record = caseByInterest.get(String(item._id));
    return {
      _id: item._id,
      caseNumber: caseNumberFrom(item._id),
      status: record?.status || "new",
      note: record?.note || "",
      transferredAt: item.createdAt,
      matchPercent: computeMatchPercent(
        senderProfile,
        preferenceByUser.get(senderId),
        receiverProfile,
        preferenceByUser.get(receiverId)
      ),
      stage: "matchmaker",
      manageable: true,
      sender: toParty(userById.get(senderId), senderProfile, preferenceByUser.get(senderId)),
      receiver: toParty(userById.get(receiverId), receiverProfile, preferenceByUser.get(receiverId)),
    };
  });
};

const candidateStatus = (userId, openIds, closedIds) => {
  if (openIds.has(userId)) return "in_process";
  if (closedIds.has(userId)) return "engaged";
  return "active";
};

const caseMembership = async () => {
  const [interests, records] = await Promise.all([
    Interest.find(FORWARDED).select("sender receiver").lean(),
    AdminCase.find().select("interest status").lean(),
  ]);
  const statusByInterest = new Map(records.map((record) => [String(record.interest), record.status]));
  const openIds = new Set();
  const closedIds = new Set();

  for (const interest of interests) {
    const status = statusByInterest.get(String(interest._id)) || "new";
    const bucket = status === "closed" ? closedIds : openIds;
    bucket.add(String(interest.sender));
    bucket.add(String(interest.receiver));
  }

  return { openIds, closedIds };
};

const toDirectoryUser = (user, profile, status, preference) => ({
  _id: user._id,
  name: user.name,
  email: user.email || null,
  phone: user.phone || null,
  idNumber: user.idNumber || null,
  role: user.role,
  createdAt: user.createdAt,
  status,
  profile: toAdminProfile(user._id, profile),
  preference: toAdminPreference(preference),
});

// Password is never selected. Profile files are stable paths, not storage ids.
const getAllUsers = async () => {
  const [users, profiles, preferences, membership] = await Promise.all([
    User.find({ role: "user" }).select(USER_FIELDS).sort({ createdAt: -1 }).lean(),
    Profile.find().lean(),
    Preference.find().lean(),
    caseMembership(),
  ]);
  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const preferenceByUser = new Map(preferences.map((preference) => [String(preference.user), preference]));

  return users.map((user) =>
    toDirectoryUser(
      user,
      profileByUser.get(String(user._id)),
      candidateStatus(String(user._id), membership.openIds, membership.closedIds),
      preferenceByUser.get(String(user._id))
    )
  );
};

const getUserProfileForAdmin = async (userId) => {
  assertObjectId(userId);

  const user = await User.findById(userId).lean();
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  const [profile, preference] = await Promise.all([
    Profile.findOne({ user: userId }),
    Preference.findOne({ user: userId }).lean(),
  ]);

  return {
    user: toAdminAccount(user),
    profile: profile ? await toOwnerProfile(profile) : null,
    preference: toAdminPreference(preference),
  };
};

// One row for the matchmaker, not a viewer-relative stage.
// pending covers interest sent and interest received.
// active is mutual approval before either side forwards.
const adminSuggestionStage = (interest) => {
  if (interest.status === "rejected") return "declined";
  if (interest.status === "pending") return "interest";
  if (interest.senderApprovedToManager && interest.receiverApprovedToManager) return "matchmaker";
  if (interest.senderApprovedToManager || interest.receiverApprovedToManager) return "forwarded";
  return "active";
};

const loadPeople = async (ids) => {
  const unique = [...new Set(ids.filter(Boolean).map(String))];
  const [users, profiles, preferences] = await Promise.all([
    User.find({ _id: { $in: unique } }).select("name email phone idNumber role").lean(),
    Profile.find({ user: { $in: unique } }).lean(),
    Preference.find({ user: { $in: unique } }).lean(),
  ]);
  return {
    userById: new Map(users.map((user) => [String(user._id), user])),
    profileByUser: new Map(profiles.map((profile) => [String(profile.user), profile])),
    preferenceByUser: new Map(preferences.map((preference) => [String(preference.user), preference])),
  };
};

const personFrom = (maps, id) =>
  toAdminPerson(maps.userById.get(String(id)), maps.profileByUser.get(String(id)), maps.preferenceByUser.get(String(id)));

const discoverNewPairs = async () => {
  const users = await User.find({ role: "user", pauseSuggestions: { $ne: true } }).select("_id").lean();
  const seen = new Set();
  const pairs = [];

  for (const user of users) {
    let candidates = [];
    try {
      candidates = (await getCandidatesForUser(user._id)).candidates;
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) continue;
      throw error;
    }
    for (const candidate of candidates) {
      const key = [String(user._id), String(candidate._id)].sort().join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ viewerId: String(user._id), otherId: String(candidate._id), key });
    }
  }

  return pairs;
};

// Every suggestion the matchmaker can open, at every stage, with both people in full.
// New rows are candidate pairs that do not yet have an interest.
const getAdminSuggestions = async () => {
  const [interests, newPairs] = await Promise.all([
    Interest.find().sort({ updatedAt: -1 }).lean(),
    discoverNewPairs(),
  ]);
  const maps = await loadPeople([
    ...interests.flatMap((item) => [item.sender, item.receiver]),
    ...newPairs.flatMap((pair) => [pair.viewerId, pair.otherId]),
  ]);
  const records = interests.length
    ? await AdminCase.find({ interest: { $in: interests.map((item) => item._id) } }).lean()
    : [];
  const caseByInterest = new Map(records.map((record) => [String(record.interest), record]));

  const interestRows = interests.map((item) => {
    const stage = adminSuggestionStage(item);
    const record = caseByInterest.get(String(item._id));
    const senderId = String(item.sender);
    const receiverId = String(item.receiver);
    const matchmaker = stage === "matchmaker";
    return {
      _id: item._id,
      stage,
      status: matchmaker ? record?.status || "new" : null,
      note: matchmaker ? record?.note || "" : "",
      caseNumber: matchmaker ? caseNumberFrom(item._id) : null,
      manageable: matchmaker,
      transferredAt: item.createdAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      senderApprovedToManager: Boolean(item.senderApprovedToManager),
      receiverApprovedToManager: Boolean(item.receiverApprovedToManager),
      matchPercent: computeMatchPercent(
        maps.profileByUser.get(senderId),
        maps.preferenceByUser.get(senderId),
        maps.profileByUser.get(receiverId),
        maps.preferenceByUser.get(receiverId)
      ),
      sender: personFrom(maps, senderId),
      receiver: personFrom(maps, receiverId),
    };
  });

  const newRows = newPairs.map((pair) => ({
    _id: `new:${pair.key}`,
    stage: "new",
    status: null,
    note: "",
    caseNumber: null,
    manageable: false,
    transferredAt: null,
    createdAt: null,
    updatedAt: null,
    senderApprovedToManager: false,
    receiverApprovedToManager: false,
    matchPercent: computeMatchPercent(
      maps.profileByUser.get(pair.viewerId),
      maps.preferenceByUser.get(pair.viewerId),
      maps.profileByUser.get(pair.otherId),
      maps.preferenceByUser.get(pair.otherId)
    ),
    sender: personFrom(maps, pair.viewerId),
    receiver: personFrom(maps, pair.otherId),
  }));

  return [...interestRows, ...newRows];
};

const getPendingMatches = async () => {
  const suggestions = await getAdminSuggestions();
  return suggestions.filter((item) => item.stage === "matchmaker");
};

const getAdminCases = async (adminId, { applyAutoClose = true } = {}) => {
  if (applyAutoClose) await closeStaleCases(adminId);
  const settings = await readSettings(adminId);
  const [cases, suggestions] = await Promise.all([shapeCases(await loadForwarded()), getAdminSuggestions()]);
  return { cases, suggestions, revealIdentity: settings.revealIdentity !== false };
};

const getAdminSummary = async (adminId) => {
  const [users, { cases, suggestions, revealIdentity }, admin] = await Promise.all([
    getAllUsers(),
    getAdminCases(adminId),
    User.findById(adminId).select("name").lean(),
  ]);
  const start = monthStart();
  const ofGender = (gender) => users.filter((user) => user.profile?.gender === gender);
  const addedThisMonth = (list) =>
    list.filter((user) => user.createdAt && new Date(user.createdAt) >= start).length;
  const boys = ofGender("male");
  const girls = ofGender("female");
  const fresh = cases.filter((item) => item.status === "new");
  const open = cases.filter((item) => item.status !== "closed");
  const closed = cases.filter((item) => item.status === "closed");
  const recent = [...fresh, ...open.filter((item) => item.status !== "new")].slice(0, 4);

  return {
    adminName: admin?.name || "",
    revealIdentity,
    boys: { total: boys.length, addedThisMonth: addedThisMonth(boys) },
    girls: { total: girls.length, addedThisMonth: addedThisMonth(girls) },
    cases: { total: open.length, fresh: fresh.length },
    closed: { total: closed.length },
    recent,
    pipeline: suggestions.slice(0, 8),
  };
};

const includesQuery = (values, query) => {
  const needle = query.toLowerCase();
  return values.some((value) => String(value || "").toLowerCase().includes(needle));
};

const searchAdmin = async (adminId, rawQuery) => {
  const query = String(rawQuery || "").trim().slice(0, 80);
  if (!query) return { candidates: [], cases: [] };

  const [users, { cases }] = await Promise.all([
    getAllUsers(),
    getAdminCases(adminId, { applyAutoClose: false }),
  ]);

  const candidates = users
    .filter((user) =>
      includesQuery(
        [
          user.name,
          user.email,
          user.idNumber,
          user.profile?.city,
          user.profile?.yeshiva,
          user.profile?.seminar,
          user.profile?.occupation,
        ],
        query
      )
    )
    .slice(0, 6)
    .map((user) => ({
      _id: user._id,
      name: user.name,
      gender: user.profile?.gender || "",
      age: user.profile?.age ?? null,
      city: user.profile?.city || "",
    }));

  const matchedCases = cases
    .filter((item) =>
      includesQuery(
        [item.caseNumber, item.sender?.name, item.receiver?.name, item.sender?.city, item.receiver?.city],
        query
      )
    )
    .slice(0, 6)
    .map((item) => ({
      _id: item._id,
      caseNumber: item.caseNumber,
      senderName: item.sender?.name || "",
      receiverName: item.receiver?.name || "",
    }));

  return { candidates, cases: matchedCases };
};

const findForwarded = async (interestId) => {
  assertObjectId(interestId, "מזהה תיק לא תקין");
  const interest = await Interest.findOne({ _id: interestId, ...FORWARDED });
  if (!interest) {
    throw new HttpError(404, "התיק לא נמצא");
  }
  return interest;
};

const updateAdminCase = async (interestId, body = {}) => {
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const hasNote = Object.prototype.hasOwnProperty.call(body, "note");
  if (!hasStatus && !hasNote) {
    throw new HttpError(400, "אין מה לעדכן");
  }

  const interest = await findForwarded(interestId);
  const update = { touchedAt: new Date() };

  if (hasStatus) {
    if (!CASE_STATUSES.includes(body.status)) {
      throw new HttpError(400, "סטטוס לא תקין");
    }
    update.status = body.status;
  }
  if (hasNote) {
    if (typeof body.note !== "string") {
      throw new HttpError(400, "ההערה אינה תקינה");
    }
    const note = body.note.trim();
    if (note.length > 1000) {
      throw new HttpError(400, "ההערה ארוכה מדי");
    }
    update.note = note;
  }

  await AdminCase.findOneAndUpdate(
    { interest: interest._id },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const [shaped] = await shapeCases([interest.toObject()]);
  return shaped;
};

const accountOf = (user, settings) => ({
  name: user?.name || "",
  email: user?.email || "",
  activityArea: settings.activityArea || "",
});

const staffMember = (user, kind) => ({
  _id: user._id,
  name: user.name,
  email: user.email || "",
  role: user.role,
  staffKind: kind,
  subtitle: kind === "matchmaker" ? "שדכן/ית" : "מנהל מערכת",
});

const teamOf = async () => {
  const admins = await User.find({ role: "admin" }).select("name email role").sort({ createdAt: 1 }).lean();
  const marks = await AdminStaff.find({ user: { $in: admins.map((admin) => admin._id) } })
    .select("user kind")
    .lean();
  const kindByUser = new Map(marks.map((mark) => [String(mark.user), mark.kind]));
  return admins.map((admin) =>
    staffMember(admin, kindByUser.get(String(admin._id)) === "matchmaker" ? "matchmaker" : "manager")
  );
};

const optionalText = (value, max, label) => {
  if (value == null || value === "") return "";
  if (typeof value !== "string" || value.trim().length > max) {
    throw new HttpError(400, `${label} ארוך מדי`);
  }
  return value.trim();
};

const createManagedUser = async ({ name, idNumber, email, password, role }) => {
  if (!validateName(name)) {
    throw new HttpError(400, "שם לא תקין");
  }
  const cleanId = typeof idNumber === "string" ? idNumber.trim() : "";
  if (!validateIdNumber(cleanId)) {
    throw new HttpError(400, "תעודת זהות חייבת להכיל 9 ספרות");
  }
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!validateEmail(cleanEmail)) {
    throw new HttpError(400, "אימייל לא תקין");
  }
  const passwordMessage = passwordErrorMessage(password);
  if (passwordMessage) {
    throw new HttpError(400, passwordMessage);
  }

  try {
    return await User.create({
      name: name.trim(),
      idNumber: cleanId,
      email: cleanEmail,
      password,
      role,
    });
  } catch (error) {
    // The admin form sends an ID number, so a duplicate email or ID number is a 409.
    // Any other unique index is unexpected.
    if (error.code === 11000) {
      const duplicateEmail = error.keyPattern?.email || error.keyValue?.email;
      const duplicateIdNumber = error.keyPattern?.idNumber || error.keyValue?.idNumber;
      if (duplicateEmail || duplicateIdNumber) {
        throw new HttpError(409, "תעודת הזהות או האימייל כבר רשומים");
      }
      console.error(error.code, error.keyPattern);
    }
    throw error;
  }
};

const createAdminCandidate = async (body = {}) => {
  if (!GENDERS.has(body.gender)) {
    throw new HttpError(400, "מגדר לא תקין");
  }
  const age = typeof body.age === "string" ? Number(body.age) : body.age;
  if (typeof age !== "number" || !Number.isInteger(age) || age < 16 || age > 120) {
    throw new HttpError(400, "גיל לא תקין");
  }

  const city = optionalText(body.city, 100, "עיר");
  const occupation = optionalText(body.occupation, 100, "עיסוק");
  const yeshiva = optionalText(body.yeshiva, 100, "ישיבה");
  const seminar = optionalText(body.seminar, 100, "סמינר");
  const user = await createManagedUser({ ...body, role: "user" });

  let profile;
  try {
    profile = await Profile.create({
      user: user._id,
      gender: body.gender,
      age,
      city,
      occupation,
      yeshiva,
      seminar,
    });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  return toDirectoryUser(user, profile, "active");
};

const createAdminMatchmaker = async (body = {}) => {
  const user = await createManagedUser({ ...body, role: "admin" });
  await AdminStaff.create({ user: user._id, kind: "matchmaker" });
  return staffMember(user, "matchmaker");
};

const getAdminSettings = async (adminId) => {
  const [settings, user, team] = await Promise.all([
    readSettings(adminId),
    User.findById(adminId).select("name email").lean(),
    teamOf(),
  ]);
  return {
    settings: publicSettings(settings),
    account: accountOf(user, settings),
    team,
  };
};

const updateAdminSettings = async (adminId, body = {}) => {
  const update = {};
  for (const flag of SETTING_FLAGS) {
    if (Object.prototype.hasOwnProperty.call(body, flag)) {
      if (typeof body[flag] !== "boolean") {
        throw new HttpError(400, "ערך לא תקין");
      }
      update[flag] = body[flag];
    }
  }
  if (Object.prototype.hasOwnProperty.call(body, "activityArea")) {
    if (typeof body.activityArea !== "string" || body.activityArea.trim().length > 100) {
      throw new HttpError(400, "אזור הפעילות ארוך מדי");
    }
    update.activityArea = body.activityArea.trim();
  }
  if (!Object.keys(update).length) {
    throw new HttpError(400, "אין מה לעדכן");
  }

  const current = await readSettings(adminId);
  await AdminSettings.findOneAndUpdate(
    { user: adminId },
    { $set: { ...current, ...update, user: adminId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return getAdminSettings(adminId);
};

const updateAdminAccount = async (adminId, body = {}) => {
  const user = await User.findById(adminId).select("+password +tokenVersion");
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  if (Object.prototype.hasOwnProperty.call(body, "name")) {
    if (!validateName(body.name)) {
      throw new HttpError(400, "שם לא תקין");
    }
    user.name = body.name.trim();
  }

  const nextEmail =
    typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : "";
  const emailChanges = Boolean(nextEmail) && nextEmail !== user.email;
  const nextPassword = typeof body.password === "string" ? body.password : "";
  const passwordChanges = nextPassword.length > 0;

  if (emailChanges || passwordChanges) {
    if (typeof body.currentPassword !== "string" || !body.currentPassword) {
      throw new HttpError(400, "יש להזין את הסיסמה הנוכחית");
    }
    const matches = await comparePassword(body.currentPassword, user.password);
    if (!matches) {
      throw new HttpError(400, "הסיסמה הנוכחית שגויה");
    }
  }

  if (emailChanges) {
    if (!validateEmail(nextEmail)) {
      throw new HttpError(400, "אימייל לא תקין");
    }
    user.email = nextEmail;
  }
  if (passwordChanges) {
    const passwordMessage = passwordErrorMessage(nextPassword);
    if (passwordMessage) {
      throw new HttpError(400, passwordMessage);
    }
    user.password = nextPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
  }

  try {
    await user.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new HttpError(409, "האימייל כבר רשום");
    }
    throw error;
  }

  if (Object.prototype.hasOwnProperty.call(body, "activityArea")) {
    await updateAdminSettings(adminId, { activityArea: body.activityArea });
  }

  const settings = await readSettings(adminId);
  const account = { account: accountOf(user, settings) };
  if (passwordChanges) {
    account.token = generateToken(user._id, user.role, user.tokenVersion || 0);
  }
  return account;
};

// Admin chooses the new password. It must be non-empty and at most 72 bytes,
// which is all bcrypt will hash. The value is stored only as a hash, and it is
// never written to a log or included in the response.
const resetUserPassword = async (adminId, userId, body = {}) => {
  assertObjectId(userId, "מזהה משתמש לא תקין");

  const nextPassword = body.password;
  if (typeof nextPassword !== "string" || nextPassword.length === 0) {
    throw new HttpError(400, "יש להזין סיסמה");
  }
  if (Buffer.byteLength(nextPassword, "utf8") > 72) {
    throw new HttpError(400, "הסיסמה ארוכה מדי");
  }

  if (typeof body.currentPassword !== "string" || body.currentPassword.length === 0) {
    throw new HttpError(400, "יש להזין את הסיסמה הנוכחית");
  }

  const admin = await User.findById(adminId).select("+password");
  if (!admin) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }
  const confirmed = await comparePassword(body.currentPassword, admin.password);
  if (!confirmed) {
    throw new HttpError(400, "הסיסמה הנוכחית שגויה");
  }

  const user = await User.findById(userId).select("+password +tokenVersion");
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  user.password = nextPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  return { message: "הסיסמה עודכנה" };
};

module.exports = {
  getPendingMatches,
  getAdminSuggestions,
  removePendingMatch,
  getAllUsers,
  getUserProfileForAdmin,
  getAdminCases,
  getAdminSummary,
  searchAdmin,
  updateAdminCase,
  getAdminSettings,
  updateAdminSettings,
  updateAdminAccount,
  createAdminCandidate,
  createAdminMatchmaker,
  resetUserPassword,
};
