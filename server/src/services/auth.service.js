const crypto = require("crypto");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { hashPassword, comparePassword } = require("../utils/hash");
const { generateToken } = require("../config/jwt");
const {
  validateEmail,
  validateIdNumber,
  validateName,
  validatePassword,
} = require("../utils/validators");

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  idNumber: user.idNumber,
  email: user.email,
  role: user.role,
});

const asTrimmedString = (value) => (typeof value === "string" ? value.trim() : "");

// Compared against when the ID number doesn't exist, so a login takes the same time
// whether or not the account exists (otherwise the timing reveals registered ID numbers).
let dummyHash;
const getDummyHash = () => {
  dummyHash ??= hashPassword(crypto.randomUUID());
  return dummyHash;
};

const registerUser = async ({ name, idNumber, email, password }) => {
  const cleanName = asTrimmedString(name);
  const cleanIdNumber = asTrimmedString(idNumber);
  const cleanEmail = asTrimmedString(email).toLowerCase();

  if (!validateName(cleanName)) {
    throw new HttpError(400, "יש להזין שם מלא");
  }
  if (!validateIdNumber(cleanIdNumber)) {
    throw new HttpError(400, "תעודת זהות חייבת להכיל 9 ספרות");
  }
  if (cleanEmail && !validateEmail(cleanEmail)) {
    throw new HttpError(400, "כתובת האימייל אינה תקינה");
  }
  if (!validatePassword(password)) {
    throw new HttpError(400, "הסיסמה חייבת להכיל לפחות 8 תווים ולפחות אות אחת באנגלית");
  }

  const existingUser = await User.findOne({
    $or: [{ idNumber: cleanIdNumber }, ...(cleanEmail ? [{ email: cleanEmail }] : [])],
  }).select("+password +tokenVersion");

  if (existingUser) {
    // Submitting the same registration twice (e.g. after a network error) is not an error
    const isSameUserRetry =
      existingUser.idNumber === cleanIdNumber && (await comparePassword(password, existingUser.password));
    if (isSameUserRetry) {
      return { ...buildUserResponse(existingUser), tokenVersion: existingUser.tokenVersion || 0 };
    }

    // One message for both cases, so the form doesn't reveal which detail is registered
    throw new HttpError(409, "לא ניתן להירשם עם הפרטים האלה. אם כבר יש לך חשבון, יש להתחבר.");
  }

  const user = await User.create({
    name: cleanName,
    idNumber: cleanIdNumber,
    email: cleanEmail || undefined,
    password,
  });

  return { ...buildUserResponse(user), tokenVersion: user.tokenVersion || 0 };
};

const loginUser = async ({ idNumber, password }) => {
  const cleanIdNumber = asTrimmedString(idNumber);

  if (!cleanIdNumber || typeof password !== "string" || !password) {
    throw new HttpError(400, "יש להזין תעודת זהות וסיסמה");
  }

  const user = await User.findOne({ idNumber: cleanIdNumber }).select("+password +tokenVersion");
  const isMatch = await comparePassword(password, user ? user.password : await getDummyHash());

  if (!user || !isMatch) {
    throw new HttpError(401, "תעודת זהות או סיסמה שגויים");
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
