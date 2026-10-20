const crypto = require("crypto");
const User = require("../models/user.model");
const Profile = require("../models/profile.model");
const HttpError = require("../utils/httpError");
const { hashPassword, comparePassword } = require("../utils/hash");
const { generateToken } = require("../config/jwt");
const { validateEmail, validateName, passwordErrorMessage } = require("../utils/validators");
const { allowCodeLogin, normalizeAccessCode, accessCodeLookup } = require("../utils/accessCode");

const GENDERS = new Set(["male", "female"]);

const buildUserResponse = (user) => ({
  _id: user._id,
  name: typeof user.name === "string" ? user.name : "",
  email: user.email || "",
  role: user.role,
  gender: GENDERS.has(user.gender) ? user.gender : "",
  credentialSetupRequired: user.credentialSetupRequired === true,
  allowCodeLogin: allowCodeLogin(),
});

const asTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Exact lowercase match first. Older accounts may still be stored with mixed case,
// so a miss falls back to an anchored case-insensitive match.
const findUserByEmail = async (email) => {
  const exact = await User.findOne({ email }).select("+password +tokenVersion");
  if (exact || !email) return exact;
  return User.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") },
  }).select("+password +tokenVersion");
};

// Compared against when the email doesn't exist, so a login takes the same time
// whether or not the account exists.
let dummyHash;
const getDummyHash = () => {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
};

// Account creation is email and password only. A name sent with the request
// is ignored, including when it is the password. The member sets a name later.
const registerUser = async ({ email, password } = {}) => {
  const cleanEmail = asTrimmedString(email).toLowerCase();

  if (!validateEmail(cleanEmail)) {
    throw new HttpError(400, "כתובת האימייל אינה תקינה");
  }
  const passwordMessage = passwordErrorMessage(password);
  if (passwordMessage) {
    throw new HttpError(400, passwordMessage);
  }

  const existingUser = await findUserByEmail(cleanEmail);

  if (existingUser) {
    // Submitting the same registration twice (e.g. after a network error) is not an error
    const isSameUserRetry = await comparePassword(password, existingUser.password);
    if (isSameUserRetry) {
      return { ...buildUserResponse(existingUser), tokenVersion: existingUser.tokenVersion || 0 };
    }

    throw new HttpError(409, "לא ניתן להירשם עם הפרטים האלה. אם כבר יש לך חשבון, יש להתחבר.");
  }

  let user;
  try {
    user = await User.create({
      name: "",
      email: cleanEmail,
      password,
    });
  } catch (error) {
    // Only an email collision is an existing account. Another unique index
    // (for example a leftover idNumber index) must not be reported that way.
    if (error?.code === 11000 && (error.keyPattern?.email || error.keyValue?.email)) {
      throw new HttpError(409, "לא ניתן להירשם עם הפרטים האלה. אם כבר יש לך חשבון, יש להתחבר.");
    }
    if (error?.code === 11000) {
      console.error(error.code, error.keyPattern);
    }
    throw error;
  }

  return { ...buildUserResponse(user), tokenVersion: user.tokenVersion || 0 };
};

const loginUser = async ({ email, password }) => {
  const cleanEmail = asTrimmedString(email).toLowerCase();

  if (!cleanEmail || typeof password !== "string" || password.length === 0) {
    throw new HttpError(400, "יש להזין אימייל וסיסמה");
  }
  // Reject before bcrypt. A longer value would be silently truncated to 72 bytes.
  const passwordMessage = passwordErrorMessage(password);
  if (passwordMessage) {
    throw new HttpError(400, passwordMessage);
  }

  const user = await findUserByEmail(cleanEmail);
  const isMatch = await comparePassword(password, user ? user.password : await getDummyHash());

  if (!user || !isMatch) {
    throw new HttpError(401, "אימייל או סיסמה שגויים");
  }

  await backfillGender(user);

  return {
    token: generateToken(user._id, user.role, user.tokenVersion || 0),
    user: buildUserResponse(user),
  };
};

// Older accounts stored gender only on the profile. Copy it onto the user
// so the member is not sent through the name-and-gender step again.
const backfillGender = async (user) => {
  if (!user || GENDERS.has(user.gender)) return;
  const profile = await Profile.findOne({ user: user._id }).select("gender").lean();
  if (!GENDERS.has(profile?.gender)) return;
  user.gender = profile.gender;
  await User.updateOne({ _id: user._id }, { $set: { gender: profile.gender } });
};

const loginWithAccessCode = async ({ code } = {}) => {
  const normalized = normalizeAccessCode(code);
  if (!normalized) {
    throw new HttpError(400, "יש להזין קוד");
  }
  if (normalized.length > 64) {
    throw new HttpError(401, "הקוד אינו תקין");
  }

  let lookup;
  try {
    lookup = accessCodeLookup(normalized);
  } catch (error) {
    if (typeof error?.message === "string" && error.message.includes("JWT_SECRET")) throw error;
    throw new HttpError(401, "הקוד אינו תקין");
  }

  const user = await User.findOne({ accessCodeLookup: lookup }).select("+password +tokenVersion");
  const isMatch = await comparePassword(normalized, user ? user.password : await getDummyHash());

  if (!user || !isMatch || user.credentialSetupRequired !== true) {
    throw new HttpError(401, "הקוד אינו תקין");
  }

  return {
    token: generateToken(user._id, user.role, user.tokenVersion || 0),
    user: buildUserResponse(user),
  };
};

// Replaces the access code. The code can no longer be used, and email must be unique.
const completeCredentialSetup = async (userId, { email, password } = {}) => {
  const cleanEmail = asTrimmedString(email).toLowerCase();
  if (!validateEmail(cleanEmail)) {
    throw new HttpError(400, "כתובת האימייל אינה תקינה");
  }
  const passwordMessage = passwordErrorMessage(password);
  if (passwordMessage) {
    throw new HttpError(400, passwordMessage);
  }

  const user = await User.findById(userId).select("+password +tokenVersion +accessCodeLookup");
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }
  if (user.credentialSetupRequired !== true) {
    throw new HttpError(400, "החשבון כבר מוגדר");
  }

  const existing = await findUserByEmail(cleanEmail);
  if (existing && String(existing._id) !== String(user._id)) {
    throw new HttpError(409, "האימייל כבר רשום");
  }

  user.email = cleanEmail;
  user.password = password;
  user.credentialSetupRequired = false;
  user.accessCodeLookup = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000 && (error.keyPattern?.email || error.keyValue?.email)) {
      throw new HttpError(409, "האימייל כבר רשום");
    }
    throw error;
  }

  await User.updateOne({ _id: user._id }, { $unset: { accessCodeLookup: 1 } });

  return {
    token: generateToken(user._id, user.role, user.tokenVersion || 0),
    user: buildUserResponse(user),
  };
};

const getUserById = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }
  await backfillGender(user);
  return buildUserResponse(user);
};

// The step after registration: a real name and a gender. The password is
// never accepted as the name.
const saveIdentity = async (userId, body = {}) => {
  const name = asTrimmedString(body.name);
  const gender = body.gender;
  if (!validateName(name)) {
    throw new HttpError(400, "יש להזין שם מלא");
  }
  if (!GENDERS.has(gender)) {
    throw new HttpError(400, "מגדר הוא שדה חובה");
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new HttpError(404, "המשתמש לא נמצא");
  }
  if (await comparePassword(name, user.password)) {
    throw new HttpError(400, "יש להזין שם מלא");
  }

  // Gender is chosen once. An admin-created account already has one, and a
  // profile gender from the name step is kept the same way.
  if (GENDERS.has(user.gender) && user.gender !== gender) {
    throw new HttpError(400, "מגדר הוא שדה חובה");
  }

  const profile = await Profile.findOne({ user: userId }).select("gender").lean();
  if (profile && GENDERS.has(profile.gender) && profile.gender !== gender) {
    throw new HttpError(400, "מגדר הוא שדה חובה");
  }

  user.name = name;
  user.gender = GENDERS.has(user.gender) ? user.gender : profile?.gender || gender;
  await user.save();
  return buildUserResponse(user);
};

module.exports = {
  registerUser,
  loginUser,
  loginWithAccessCode,
  completeCredentialSetup,
  getUserById,
  saveIdentity,
  findUserByEmail,
};
