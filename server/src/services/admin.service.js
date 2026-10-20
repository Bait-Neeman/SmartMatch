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
  validateName,
  passwordErrorMessage,
} = require("../utils/validators");
const { comparePassword } = require("../utils/hash");
const { generateToken } = require("../config/jwt");
const { STYLES, APPEARANCES, ETHNICITIES, MARITAL_STATUSES } = require("../models/options");
const { fileAccessPath } = require("./storage.service");
const { toOwnerProfile, createProfileForUser } = require("./profile.service");
const { createPreferenceForUser } = require("./preference.service");
const { generateAccessCode, accessCodeLookup, encryptAccessCode, readStoredAccessCode } = require("../utils/accessCode");
const { getCandidatesForUser, computeMatchPercent } = require("./match.service");
const AdminStaff = require("../models/adminStaff.model");
const {
  isOpenPhase,
  nextCaseState,
  sameState,
  presentCase,
  actorIdsFrom,
  namesById,
  migrateLegacyAdminCases,
  directoryBuckets,
  candidateStatus,
  historyEntry,
  normalizeCase,
} = require("./caseState.service");

// Admin-only views. Identity and contact stay here.
// Case notes live on AdminCase, not on Interest, so they are never copied
// into the interest responses that the couple receives.

const FORWARDED = {
  status: "accepted",
  senderApprovedToManager: true,
  receiverApprovedToManager: true,
};

const SETTING_FLAGS = [
  "notifyNewCase",
  "notifyOneSide",
  "notifyNewRegistration",
  "dailySummary",
  "autoClose",
  "revealIdentity",
  "hideFemalePhotos",
];
const STALE_MS = 60 * 24 * 60 * 60 * 1000;
const USER_FIELDS = "name email phone role gender createdAt credentialSetupRequired createdBy";
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

// A female member's photo is left out when this admin has asked to hide those photos.
// The resume path stays. Missing the flag, or any other gender, keeps the photo path.
const adminImagePath = (userId, profile, hideFemalePhotos) => {
  if (hideFemalePhotos && profile?.gender === "female") return null;
  return fileAccessPath(userId, "image", profile?.image);
};

const toAdminProfile = (userId, profile, hideFemalePhotos = false) => {
  if (!profile) return null;
  return {
    ...blankFields(PROFILE_DETAIL_FIELDS),
    ...Object.fromEntries(
      PROFILE_DETAIL_FIELDS.filter((field) => profile[field] != null && profile[field] !== "").map((field) => [
        field,
        profile[field],
      ])
    ),
    image: adminImagePath(userId, profile, hideFemalePhotos),
    resumePdf: fileAccessPath(userId, "resumePdf", profile.resumePdf),
  };
};

// Full contact, profile, and preference for one person. Password and token
// version are never copied, even if the caller loaded them.
const toAdminPerson = (user, profile, preference, hideFemalePhotos = false) => {
  const id = user?._id || profile?.user || null;
  return {
    _id: id,
    name: user?.name || "",
    email: user?.email || null,
    phone: user?.phone || null,
    role: user?.role || null,
    age: profile?.age ?? null,
    city: profile?.city || "",
    gender: profile?.gender || "",
    image: adminImagePath(id, profile, hideFemalePhotos),
    resumePdf: fileAccessPath(id, "resumePdf", profile?.resumePdf),
    profile: toAdminProfile(id, profile, hideFemalePhotos),
    preference: toAdminPreference(preference),
  };
};

const presentCreatedBy = (createdBy) => {
  const id = createdBy?.id || createdBy?._id;
  if (!id) return null;
  return {
    _id: id,
    name: typeof createdBy.name === "string" ? createdBy.name : "",
  };
};

const toAdminAccount = (user) => {
  if (!user) return null;
  const accessCode = readStoredAccessCode(user);
  const plain = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete plain.password;
  delete plain.tokenVersion;
  delete plain.accessCodeLookup;
  delete plain.accessCodeCipher;
  delete plain.idNumber;
  delete plain.__v;
  if (accessCode) plain.accessCode = accessCode;
  if (plain.createdBy) plain.createdBy = presentCreatedBy(plain.createdBy);
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

const toParty = (user, profile, preference, hideFemalePhotos = false) =>
  toAdminPerson(user, profile, preference, hideFemalePhotos);

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
    hideFemalePhotos: stored.hideFemalePhotos === true,
    activityArea: stored.activityArea || "",
  };
};

const femalePhotosHidden = async (adminId) => {
  if (!adminId) return false;
  const settings = await readSettings(adminId);
  return settings.hideFemalePhotos === true;
};

const publicSettings = (settings) => ({
  notifyNewCase: settings.notifyNewCase,
  notifyOneSide: settings.notifyOneSide,
  notifyNewRegistration: settings.notifyNewRegistration,
  dailySummary: settings.dailySummary,
    autoClose: settings.autoClose,
    revealIdentity: settings.revealIdentity,
    hideFemalePhotos: settings.hideFemalePhotos === true,
    activityArea: settings.activityArea || "",
});

const closeStaleCases = async (adminId) => {
  const settings = await readSettings(adminId);
  if (!settings.autoClose) return;

  await migrateLegacyAdminCases();
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
    const state = normalizeCase(record);
    if (state.status === "ended" || state.status === "engaged") continue;
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
        update: {
          $set: { status: "ended", meetingNumber: null, touchedAt: now },
          $push: {
            history: historyEntry({
              status: "ended",
              meetingNumber: null,
              changedBy: adminId,
              changedAt: now,
              source: "autoClose",
            }),
          },
        },
        upsert: true,
      },
    }))
  );
};

const loadForwarded = () => Interest.find(FORWARDED).sort({ createdAt: -1 }).lean();

const shapeCases = async (interests, hideFemalePhotos = false) => {
  if (!interests.length) return [];

  const userIds = [
    ...new Set(interests.flatMap((item) => [String(item.sender), String(item.receiver)])),
  ];
  const [users, profiles, preferences, records] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("name email phone role").lean(),
    Profile.find({ user: { $in: userIds } }).lean(),
    Preference.find({ user: { $in: userIds } }).lean(),
    AdminCase.find({ interest: { $in: interests.map((item) => item._id) } }).lean(),
  ]);
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const preferenceByUser = new Map(preferences.map((preference) => [String(preference.user), preference]));
  const caseByInterest = new Map(records.map((record) => [String(record.interest), record]));
  const nameById = await namesById(actorIdsFrom(records));

  return interests.map((item) => {
    const senderId = String(item.sender);
    const receiverId = String(item.receiver);
    const senderProfile = profileByUser.get(senderId);
    const receiverProfile = profileByUser.get(receiverId);
    const record = caseByInterest.get(String(item._id));
    const presented = presentCase(record, nameById);
    return {
      _id: item._id,
      caseNumber: caseNumberFrom(item._id),
      status: presented.status,
      meetingNumber: presented.meetingNumber,
      label: presented.label,
      history: presented.history,
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
      sender: toParty(userById.get(senderId), senderProfile, preferenceByUser.get(senderId), hideFemalePhotos),
      receiver: toParty(userById.get(receiverId), receiverProfile, preferenceByUser.get(receiverId), hideFemalePhotos),
    };
  });
};

const toDirectoryUser = (user, profile, status, preference, hideFemalePhotos = false) => {
  const accessCode = readStoredAccessCode(user);
  return {
    _id: user._id,
    name: user.name,
    email: user.email || null,
    phone: user.phone || null,
    role: user.role,
    gender: profile?.gender || user.gender || "",
    createdAt: user.createdAt,
    status,
    credentialSetupRequired: user.credentialSetupRequired === true,
    createdBy: presentCreatedBy(user.createdBy),
    ...(accessCode ? { accessCode } : {}),
    profile: toAdminProfile(user._id, profile, hideFemalePhotos),
    preference: toAdminPreference(preference),
  };
};

// Password is never selected. Profile files are stable paths, not storage ids.
const getAllUsers = async (adminId) => {
  const hideFemalePhotos = await femalePhotosHidden(adminId);
  const [users, profiles, preferences, buckets] = await Promise.all([
    User.find({ role: "user" }).select(`${USER_FIELDS} +accessCodeCipher`).sort({ createdAt: -1 }).lean(),
    Profile.find().lean(),
    Preference.find().lean(),
    directoryBuckets(),
  ]);
  const profileByUser = new Map(profiles.map((profile) => [String(profile.user), profile]));
  const preferenceByUser = new Map(preferences.map((preference) => [String(preference.user), preference]));

  return users.map((user) =>
    toDirectoryUser(
      user,
      profileByUser.get(String(user._id)),
      candidateStatus(String(user._id), buckets),
      preferenceByUser.get(String(user._id)),
      hideFemalePhotos
    )
  );
};

const getUserProfileForAdmin = async (userId, adminId) => {
  assertObjectId(userId);

  const user = await User.findById(userId).select("+accessCodeCipher").lean();
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  const [profile, preference, hideFemalePhotos] = await Promise.all([
    Profile.findOne({ user: userId }),
    Preference.findOne({ user: userId }).lean(),
    femalePhotosHidden(adminId),
  ]);

  const ownerProfile = profile ? await toOwnerProfile(profile) : null;
  if (ownerProfile && hideFemalePhotos && ownerProfile.gender === "female") {
    ownerProfile.image = null;
  }

  return {
    user: toAdminAccount(user),
    profile: ownerProfile,
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
    User.find({ _id: { $in: unique } }).select("name email phone role").lean(),
    Profile.find({ user: { $in: unique } }).lean(),
    Preference.find({ user: { $in: unique } }).lean(),
  ]);
  return {
    userById: new Map(users.map((user) => [String(user._id), user])),
    profileByUser: new Map(profiles.map((profile) => [String(profile.user), profile])),
    preferenceByUser: new Map(preferences.map((preference) => [String(preference.user), preference])),
  };
};

const personFrom = (maps, id, hideFemalePhotos = false) =>
  toAdminPerson(
    maps.userById.get(String(id)),
    maps.profileByUser.get(String(id)),
    maps.preferenceByUser.get(String(id)),
    hideFemalePhotos
  );

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
const getAdminSuggestions = async (adminId) => {
  const hideFemalePhotos = await femalePhotosHidden(adminId);
  await migrateLegacyAdminCases();
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
  const nameById = await namesById(actorIdsFrom(records));

  const interestRows = interests.map((item) => {
    const stage = adminSuggestionStage(item);
    const record = caseByInterest.get(String(item._id));
    const senderId = String(item.sender);
    const receiverId = String(item.receiver);
    const matchmaker = stage === "matchmaker";
    const presented = matchmaker ? presentCase(record, nameById) : null;
    return {
      _id: item._id,
      stage,
      status: presented ? presented.status : null,
      meetingNumber: presented ? presented.meetingNumber : null,
      label: presented ? presented.label : "",
      history: presented ? presented.history : [],
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
      sender: personFrom(maps, senderId, hideFemalePhotos),
      receiver: personFrom(maps, receiverId, hideFemalePhotos),
    };
  });

  const newRows = newPairs.map((pair) => ({
    _id: `new:${pair.key}`,
    stage: "new",
    status: null,
    meetingNumber: null,
    label: "",
    history: [],
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
    sender: personFrom(maps, pair.viewerId, hideFemalePhotos),
    receiver: personFrom(maps, pair.otherId, hideFemalePhotos),
  }));

  return [...interestRows, ...newRows];
};

const getPendingMatches = async (adminId) => {
  const suggestions = await getAdminSuggestions(adminId);
  return suggestions.filter((item) => item.stage === "matchmaker");
};

const getAdminCases = async (adminId, { applyAutoClose = true } = {}) => {
  await migrateLegacyAdminCases();
  if (applyAutoClose) await closeStaleCases(adminId);
  const settings = await readSettings(adminId);
  const hideFemalePhotos = settings.hideFemalePhotos === true;
  const [cases, suggestions] = await Promise.all([
    shapeCases(await loadForwarded(), hideFemalePhotos),
    getAdminSuggestions(adminId),
  ]);
  return { cases, suggestions, revealIdentity: settings.revealIdentity !== false };
};

const getAdminSummary = async (adminId) => {
  const [users, { cases, suggestions, revealIdentity }, admin] = await Promise.all([
    getAllUsers(adminId),
    getAdminCases(adminId),
    User.findById(adminId).select("name").lean(),
  ]);
  const start = monthStart();
  const ofGender = (gender) => users.filter((user) => (user.profile?.gender || user.gender) === gender);
  const addedThisMonth = (list) =>
    list.filter((user) => user.createdAt && new Date(user.createdAt) >= start).length;
  const boys = ofGender("male");
  const girls = ofGender("female");
  const fresh = cases.filter((item) => item.status === "new");
  const inProgress = cases.filter((item) => isOpenPhase(item.status));
  const ended = cases.filter((item) => item.status === "ended");
  const engaged = cases.filter((item) => item.status === "engaged");
  const recent = [...fresh, ...inProgress.filter((item) => item.status !== "new")].slice(0, 4);

  return {
    adminName: admin?.name || "",
    revealIdentity,
    boys: { total: boys.length, addedThisMonth: addedThisMonth(boys) },
    girls: { total: girls.length, addedThisMonth: addedThisMonth(girls) },
    cases: { total: inProgress.length, fresh: fresh.length },
    ended: { total: ended.length },
    engaged: { total: engaged.length },
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
    getAllUsers(adminId),
    getAdminCases(adminId, { applyAutoClose: false }),
  ]);

  const candidates = users
    .filter((user) =>
      includesQuery(
        [
          user.name,
          user.email,
          user.phone,
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
      gender: user.profile?.gender || user.gender || "",
      age: user.profile?.age ?? null,
      city: user.profile?.city || "",
      image: user.profile?.image || "",
      yeshiva: user.profile?.gender === "male" ? user.profile?.yeshiva || "" : "",
      seminar: user.profile?.gender === "female" ? user.profile?.seminar || "" : "",
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

const updateAdminCase = async (interestId, body = {}, adminId) => {
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const hasAction = Object.prototype.hasOwnProperty.call(body, "action") && body.action != null && body.action !== "";
  const hasNote = Object.prototype.hasOwnProperty.call(body, "note");
  if (!hasStatus && !hasAction && !hasNote) {
    throw new HttpError(400, "אין מה לעדכן");
  }

  const interest = await findForwarded(interestId);
  await migrateLegacyAdminCases();
  const existing = await AdminCase.findOne({ interest: interest._id }).lean();
  const current = normalizeCase(existing);
  const next = hasStatus || hasAction ? nextCaseState(current, body) : null;
  const changed = Boolean(next) && !sameState(current, next);
  const hideFemalePhotos = await femalePhotosHidden(adminId);
  if (!changed && !hasNote) {
    const [unchanged] = await shapeCases([interest.toObject()], hideFemalePhotos);
    return unchanged;
  }

  const touchedAt = new Date();
  const update = { touchedAt };
  if (changed) {
    update.status = next.status;
    update.meetingNumber = next.meetingNumber;
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

  const write = { $set: update };
  if (changed) {
    write.$push = {
      history: historyEntry({
        status: next.status,
        meetingNumber: next.meetingNumber,
        changedBy: adminId,
        changedAt: touchedAt,
        source: "admin",
      }),
    };
  }

  await AdminCase.findOneAndUpdate({ interest: interest._id }, write, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  const [shaped] = await shapeCases([interest.toObject()], hideFemalePhotos);
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

const createManagedUser = async ({ name, email, password, role }) => {
  if (!validateName(name)) {
    throw new HttpError(400, "שם לא תקין");
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
      email: cleanEmail,
      password,
      role,
    });
  } catch (error) {
    if (error.code === 11000 && (error.keyPattern?.email || error.keyValue?.email)) {
      throw new HttpError(409, "האימייל כבר רשום");
    }
    if (error.code === 11000) {
      console.error(error.code, error.keyPattern);
    }
    throw error;
  }
};

const choiceOrSkip = (value, allowed, label) => {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new HttpError(400, `ערך לא תקין בשדה ${label}`);
  }
  return value;
};

const optionalNumber = (value, min, max, label) => {
  if (value == null || value === "") return undefined;
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isInteger(number) || number < min || number > max) {
    throw new HttpError(400, `${label} לא תקין`);
  }
  return number;
};

const optionalFlag = (value) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false" || value == null || value === "") return false;
  throw new HttpError(400, "ערך לא תקין");
};

const createAdminCandidate = async (body = {}) => {
  if (!GENDERS.has(body.gender)) {
    throw new HttpError(400, "מגדר לא תקין");
  }
  const age = typeof body.age === "string" ? Number(body.age) : body.age;
  if (typeof age !== "number" || !Number.isInteger(age) || age < 16 || age > 120) {
    throw new HttpError(400, "גיל לא תקין");
  }

  const female = body.gender === "female";
  const working = female && optionalFlag(body.working);
  const profileFields = {
    gender: body.gender,
    age,
    city: optionalText(body.city, 100, "עיר"),
    ethnicity: choiceOrSkip(body.ethnicity, ETHNICITIES, "עדה"),
    maritalStatus: choiceOrSkip(body.maritalStatus, MARITAL_STATUSES, "סטטוס"),
    height: optionalNumber(body.height, 100, 250, "גובה"),
    style: choiceOrSkip(body.style, STYLES, "סגנון"),
    appearance: choiceOrSkip(body.appearance, APPEARANCES, "מראה חיצוני"),
    financialDemand: optionalNumber(body.financialDemand, 0, 100000000, "דרישה כספית"),
    financialParticipation: optionalNumber(body.financialParticipation, 0, 100000000, "השתתפות כספית"),
    description: optionalText(body.description, 1000, "עוד פרטים עליי"),
    yeshiva: female ? "" : optionalText(body.yeshiva, 100, "ישיבה"),
    seminar: female ? optionalText(body.seminar, 100, "סמינר") : "",
    occupation: female ? optionalText(body.occupation, 100, "מקצוע") : "",
    working: female ? working : undefined,
    workingInProfession: working ? optionalFlag(body.workingInProfession) : undefined,
    workplace: working ? optionalText(body.workplace, 100, "מקום עבודה") : "",
  };
  const user = await createManagedUser({ ...body, role: "user" });

  let profile;
  try {
    profile = await Profile.create({
      user: user._id,
      ...profileFields,
    });
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  return toDirectoryUser(user, profile, "none");
};

const hasContent = (value) => {
  if (value == null || value === "") return false;
  if (typeof value === "boolean") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

const PROFILE_CONTENT_KEYS = [
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
  "financialDemand",
  "financialParticipation",
  "phone",
];

const asPlainObject = (value, label) => {
  if (value == null || value === "") return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, `${label} אינו תקין`);
  }
  return value;
};

// Name and gender only are enough. A filled profile needs an age. Phone may
// be left empty here; the member still has to enter one on their own profile.
const maybeCreateProfile = async (user, raw) => {
  const profileBody = asPlainObject(raw, "פרופיל");
  if (!profileBody) return null;
  const filled = PROFILE_CONTENT_KEYS.some((key) => hasContent(profileBody[key]));
  if (!filled) return null;
  if (!hasContent(profileBody.age)) {
    throw new HttpError(400, "גיל הוא שדה חובה");
  }
  const saved = await createProfileForUser(
    user._id,
    { ...profileBody, gender: user.gender },
    undefined,
    { requirePhone: false }
  );
  return saved;
};

const maybeCreatePreferences = async (userId, raw) => {
  const preferences = asPlainObject(raw, "העדפות");
  if (!preferences) return null;
  const filled = Object.values(preferences).some((value) => hasContent(value));
  if (!filled) return null;
  return createPreferenceForUser(userId, preferences);
};

const createAdminMember = async (adminId, body = {}) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!validateName(name)) {
    throw new HttpError(400, "יש להזין שם מלא");
  }
  if (!GENDERS.has(body.gender)) {
    throw new HttpError(400, "מגדר הוא שדה חובה");
  }

  const admin = await User.findById(adminId).select("name").lean();
  if (!admin) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  const accessCode = generateAccessCode();
  let user;
  try {
    user = await User.create({
      name,
      gender: body.gender,
      password: accessCode,
      role: "user",
      credentialSetupRequired: true,
      accessCodeLookup: accessCodeLookup(accessCode),
      accessCodeCipher: encryptAccessCode(accessCode),
      createdBy: { id: admin._id, name: admin.name || "" },
    });
  } catch (error) {
    if (error?.code === 11000) {
      console.error(error.code, error.keyPattern);
      throw new HttpError(500, "אירעה שגיאה בשרת. נסו שוב מאוחר יותר.");
    }
    throw error;
  }

  try {
    await maybeCreateProfile(user, body.profile);
    await maybeCreatePreferences(user._id, body.preferences);
  } catch (error) {
    await Preference.deleteOne({ user: user._id });
    await Profile.deleteOne({ user: user._id });
    await User.deleteOne({ _id: user._id });
    throw error;
  }

  const fresh = await User.findById(user._id).select(`${USER_FIELDS} +accessCodeCipher`).lean();
  const [profile, preference] = await Promise.all([
    Profile.findOne({ user: user._id }).lean(),
    Preference.findOne({ user: user._id }).lean(),
  ]);
  return {
    user: toDirectoryUser(fresh, profile, "none", preference),
    accessCode,
  };
};

const writeAccessCode = (user, accessCode) => {
  user.password = accessCode;
  user.accessCodeLookup = accessCodeLookup(accessCode);
  user.accessCodeCipher = encryptAccessCode(accessCode);
  user.credentialSetupRequired = true;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
};

const regenerateAccessCode = async (userId) => {
  assertObjectId(userId, "מזהה משתמש לא תקין");
  const user = await User.findById(userId).select("+password +tokenVersion +accessCodeLookup +accessCodeCipher");
  if (!user || user.role !== "user") {
    throw new HttpError(404, "המשתמש לא נמצא");
  }
  if (user.credentialSetupRequired !== true) {
    throw new HttpError(400, "אין קוד פעיל");
  }

  const accessCode = generateAccessCode();
  writeAccessCode(user, accessCode);
  await user.save();
  return { accessCode };
};

// A new code for any member. Their email stays. Their password and sessions do not.
const resetMemberAccess = async (userId) => {
  assertObjectId(userId, "מזהה משתמש לא תקין");
  const user = await User.findById(userId).select("+password +tokenVersion +accessCodeLookup +accessCodeCipher");
  if (!user || user.role !== "user") {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  const accessCode = generateAccessCode();
  writeAccessCode(user, accessCode);
  await user.save();
  return { accessCode };
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
  createAdminMember,
  regenerateAccessCode,
  resetMemberAccess,
  createAdminMatchmaker,
  resetUserPassword,
};
