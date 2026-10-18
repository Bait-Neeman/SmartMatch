const crypto = require("crypto");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { hashPassword, comparePassword } = require("../utils/hash");
const { generateToken } = require("../config/jwt");
const { validateEmail, validateName, passwordErrorMessage } = require("../utils/validators");

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const asTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

// Compared against when the email doesn't exist, so a login takes the same time
// whether or not the account exists.
let dummyHash;
const getDummyHash = () => {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
};

// A display name when the form only sends email and password.
const nameFromEmail = (email) => {
  const local = email.split("@")[0].replace(/[._+-]+/g, " ").trim().slice(0, 100);
  return local || "משתמש";
};

// Account creation is email and password. A name is optional. An ID number is ignored.
const registerUser = async ({ name, email, password }) => {
  const cleanEmail = asTrimmedString(email).toLowerCase();
  const requestedName = asTrimmedString(name);
  const cleanName = requestedName || (validateEmail(cleanEmail) ? nameFromEmail(cleanEmail) : "");

  if (!validateEmail(cleanEmail)) {
    throw new HttpError(400, "כתובת האימייל אינה תקינה");
  }
  if (!validateName(cleanName)) {
    throw new HttpError(400, "יש להזין שם מלא");
  }
  const passwordMessage = passwordErrorMessage(password);
  if (passwordMessage) {
    throw new HttpError(400, passwordMessage);
  }

  const existingUser = await User.findOne({ email: cleanEmail }).select("+password +tokenVersion");

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
      name: cleanName,
      email: cleanEmail,
      password,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new HttpError(409, "לא ניתן להירשם עם הפרטים האלה. אם כבר יש לך חשבון, יש להתחבר.");
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

  const user = await User.findOne({ email: cleanEmail }).select("+password +tokenVersion");
  const isMatch = await comparePassword(password, user ? user.password : await getDummyHash());

  if (!user || !isMatch) {
    throw new HttpError(401, "אימייל או סיסמה שגויים");
  }

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
  return buildUserResponse(user);
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
};
