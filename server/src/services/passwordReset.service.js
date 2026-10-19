const crypto = require("crypto");
const PasswordReset = require("../models/passwordReset.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { passwordErrorMessage, validateEmail } = require("../utils/validators");
const { findUserByEmail } = require("./auth.service");
const { sendPasswordResetEmail } = require("./mail.service");

const RESET_TTL_MS = 60 * 60 * 1000;

const GENERIC_MESSAGE =
  "אם קיים חשבון עם הכתובת הזו, נשלח אליו קישור לאיפוס הסיסמה. הקישור תקף לשעה אחת.";
const INVALID_LINK_MESSAGE =
  "הקישור לאיפוס הסיסמה אינו תקין או שפג תוקפו. אפשר לבקש קישור חדש.";
const PASSWORD_UPDATED_MESSAGE = "הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.";

const asTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const clientBaseUrl = () => {
  const configured = (process.env.CLIENT_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") return "";
  return "http://localhost:5173";
};

const buildResetUrl = (token) => {
  const base = clientBaseUrl();
  if (!base) return "";
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
};

// Same reply for an existing account and an unknown address.
const requestPasswordReset = async (body = {}) => {
  const cleanEmail = asTrimmedString(body.email).toLowerCase();

  if (!cleanEmail) {
    throw new HttpError(400, "יש להזין כתובת אימייל");
  }
  if (!validateEmail(cleanEmail)) {
    throw new HttpError(400, "כתובת האימייל אינה תקינה");
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const user = await findUserByEmail(cleanEmail);

  if (!user) {
    // tokenHash is discarded. The lookup and hashing still ran.
    return GENERIC_MESSAGE;
  }

  try {
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);
    await PasswordReset.findOneAndUpdate(
      { user: user._id },
      { $set: { tokenHash, expiresAt, usedAt: null } },
      { upsert: true }
    );
    await sendPasswordResetEmail({
      to: user.email,
      resetUrl: buildResetUrl(token),
    });
  } catch (error) {
    // A failure here must not tell the caller whether the account exists.
    if (error?.code !== 11000) {
      console.error("Password reset request could not be completed.");
    }
  }

  return GENERIC_MESSAGE;
};

const resetPassword = async (body = {}) => {
  const passwordMessage = passwordErrorMessage(body.password);
  if (passwordMessage) {
    throw new HttpError(400, passwordMessage);
  }

  const token = body.token;
  if (typeof token !== "string" || token.length < 20 || token.length > 200) {
    throw new HttpError(400, INVALID_LINK_MESSAGE);
  }

  const now = new Date();
  const reset = await PasswordReset.findOneAndUpdate(
    {
      tokenHash: hashToken(token),
      usedAt: null,
      expiresAt: { $gt: now },
    },
    { $set: { usedAt: now } },
    { returnDocument: "after" }
  );

  if (!reset) {
    throw new HttpError(400, INVALID_LINK_MESSAGE);
  }

  try {
    const user = await User.findById(reset.user).select("+password +tokenVersion");
    if (!user) {
      throw new HttpError(400, INVALID_LINK_MESSAGE);
    }

    user.password = body.password;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
  } catch (error) {
    await PasswordReset.updateOne({ _id: reset._id }, { $set: { usedAt: null } });
    throw error;
  }

  return PASSWORD_UPDATED_MESSAGE;
};

module.exports = {
  requestPasswordReset,
  resetPassword,
  GENERIC_MESSAGE,
  INVALID_LINK_MESSAGE,
  PASSWORD_UPDATED_MESSAGE,
};
