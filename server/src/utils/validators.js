const HttpError = require("./httpError");

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const isObjectId = (value) => typeof value === "string" && OBJECT_ID_REGEX.test(value);

// Throws a 400 error unless the value is a valid MongoDB id string.
// Rejecting anything else (e.g. objects like { "$ne": null }) also blocks query injection.
const assertObjectId = (value, message = "מזהה לא תקין") => {
  if (!isObjectId(value)) {
    throw new HttpError(400, message);
  }
  return value;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === "string" && email.length <= 254 && emailRegex.test(email);
};

const validateIdNumber = (idNumber) => {
  // Israeli ID numbers are 9 digits
  return typeof idNumber === "string" && /^\d{9}$/.test(idNumber);
};

const validatePassword = (password) => {
  // At least 8 characters with an English letter (same rule as the register form).
  // bcrypt ignores anything past 72 bytes, so longer passwords are rejected.
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    Buffer.byteLength(password, "utf8") <= 72 &&
    /[A-Za-z]/.test(password)
  );
};

const validateName = (name) => {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 100;
};

module.exports = {
  isObjectId,
  assertObjectId,
  validateEmail,
  validateIdNumber,
  validatePassword,
  validateName,
};
