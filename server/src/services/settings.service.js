const User = require("../models/user.model");
const Profile = require("../models/profile.model");
const Preference = require("../models/preference.model");
const Interest = require("../models/interest.model");
const HttpError = require("../utils/httpError");
const { comparePassword } = require("../utils/hash");
const { validateEmail, validatePassword, validatePhone } = require("../utils/validators");
const { deleteProfileFile } = require("./storage.service");

const NOTIFICATION_KEYS = [
  "newSuggestion",
  "interestReceived",
  "activeSuggestion",
  "matchmakerRequest",
  "matchmakerStarted",
  "emailDigest",
];

const DEFAULT_NOTIFICATIONS = {
  newSuggestion: true,
  interestReceived: true,
  activeSuggestion: true,
  matchmakerRequest: true,
  matchmakerStarted: true,
  emailDigest: false,
};

const LANGUAGES = new Set(["he", "en"]);

const BOOLEAN_FIELDS = {
  pauseSuggestions: "השהיית קבלת הצעות",
  showMatchPercent: "הצגת אחוז התאמה",
};

// The account owner only. No id number, password, or token.
const toSettings = (user) => {
  const stored = user.notifications?.toObject?.() || user.notifications || {};
  const notifications = { ...DEFAULT_NOTIFICATIONS };
  for (const key of NOTIFICATION_KEYS) {
    if (typeof stored[key] === "boolean") notifications[key] = stored[key];
  }

  return {
    email: user.email || null,
    phone: user.phone || null,
    language: user.language || "he",
    pauseSuggestions: user.pauseSuggestions === true,
    showMatchPercent: user.showMatchPercent !== false,
    minMatchPercent: user.minMatchPercent ?? null,
    notifications,
  };
};

const getSettingsForUser = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }
  return toSettings(user);
};

const updateSettingsForUser = async (userId, body = {}) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  if (body.phone !== undefined) {
    if (body.phone === null || body.phone === "") {
      user.phone = undefined;
    } else if (typeof body.phone === "string" && validatePhone(body.phone.trim())) {
      user.phone = body.phone.trim();
    } else {
      throw new HttpError(400, "מספר הטלפון אינו תקין");
    }
  }

  if (body.email !== undefined) {
    if (body.email === null || body.email === "") {
      user.email = undefined;
    } else if (typeof body.email !== "string" || !validateEmail(body.email.trim().toLowerCase())) {
      throw new HttpError(400, "כתובת האימייל אינה תקינה");
    } else {
      const email = body.email.trim().toLowerCase();
      if (email !== user.email) {
        const taken = await User.exists({ email, _id: { $ne: user._id } });
        if (taken) {
          throw new HttpError(409, "לא ניתן לעדכן את כתובת האימייל");
        }
        user.email = email;
      }
    }
  }

  if (body.language !== undefined) {
    if (!LANGUAGES.has(body.language)) {
      throw new HttpError(400, "ערך לא תקין בשדה שפה");
    }
    user.language = body.language;
  }

  for (const [field, label] of Object.entries(BOOLEAN_FIELDS)) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "boolean") {
      throw new HttpError(400, `ערך לא תקין בשדה ${label}`);
    }
    user[field] = body[field];
  }

  if (body.minMatchPercent !== undefined) {
    if (body.minMatchPercent === null || body.minMatchPercent === "") {
      user.minMatchPercent = undefined;
    } else {
      const value = typeof body.minMatchPercent === "string" ? Number(body.minMatchPercent) : body.minMatchPercent;
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
        throw new HttpError(400, "ערך לא תקין בשדה אחוז התאמה מינימלי");
      }
      user.minMatchPercent = value;
    }
  }

  if (body.notifications !== undefined) {
    if (!body.notifications || typeof body.notifications !== "object" || Array.isArray(body.notifications)) {
      throw new HttpError(400, "ערך לא תקין בשדה התראות");
    }
    const next = { ...DEFAULT_NOTIFICATIONS, ...(user.notifications?.toObject?.() || {}) };
    for (const key of NOTIFICATION_KEYS) {
      if (body.notifications[key] === undefined) continue;
      if (typeof body.notifications[key] !== "boolean") {
        throw new HttpError(400, "ערך לא תקין בשדה התראות");
      }
      next[key] = body.notifications[key];
    }
    user.notifications = next;
    user.markModified("notifications");
  }

  await user.save();
  return toSettings(user);
};

const changePassword = async (userId, body = {}) => {
  const { currentPassword, newPassword } = body;
  if (typeof currentPassword !== "string" || !currentPassword || typeof newPassword !== "string" || !newPassword) {
    throw new HttpError(400, "יש להזין סיסמה נוכחית וסיסמה חדשה");
  }
  if (!validatePassword(newPassword)) {
    throw new HttpError(400, "הסיסמה חייבת להכיל לפחות 8 תווים ולפחות אות אחת באנגלית");
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }
  const matches = await comparePassword(currentPassword, user.password);
  if (!matches) {
    throw new HttpError(400, "הסיסמה הנוכחית שגויה");
  }

  user.password = newPassword;
  await user.save();
};

const deleteAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }

  const profile = await Profile.findOne({ user: userId });
  if (profile) {
    await Promise.all([
      deleteProfileFile("image", profile.image),
      deleteProfileFile("resumePdf", profile.resumePdf),
    ]);
    await profile.deleteOne();
  }

  await Preference.deleteOne({ user: userId });
  await Interest.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] });
  await user.deleteOne();
};

module.exports = {
  getSettingsForUser,
  updateSettingsForUser,
  changePassword,
  deleteAccount,
};
