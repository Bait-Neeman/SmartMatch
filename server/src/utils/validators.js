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

// bcrypt only uses the first 72 bytes and rejects a null byte. There is no
// minimum length and no complexity rule; the password only has to be non-empty.
const PASSWORD_MAX_BYTES = 72;
const PASSWORD_TOO_LONG = "הסיסמה ארוכה מדי. אפשר עד 72 בתים";
const PASSWORD_INVALID = "הסיסמה אינה תקינה";
const PASSWORD_REQUIRED = "יש להזין סיסמה";

const passwordProblem = (password) => {
  if (typeof password !== "string" || password.length === 0) return "empty";
  if (password.includes("\0")) return "invalid";
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) return "too-long";
  return null;
};

// emptyMessage lets a form ask for "current and new" instead of the generic line.
const passwordErrorMessage = (password, emptyMessage = PASSWORD_REQUIRED) => {
  const problem = passwordProblem(password);
  if (problem === "empty") return emptyMessage;
  if (problem === "too-long") return PASSWORD_TOO_LONG;
  if (problem === "invalid") return PASSWORD_INVALID;
  return null;
};

const validatePassword = (password) => passwordProblem(password) === null;

const validateName = (name) => {
  return typeof name === "string" && name.trim().length > 0 && name.trim().length <= 100;
};

const validatePhone = (phone) => {
  if (typeof phone !== "string" || phone.length > 20) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
};

module.exports = {
  isObjectId,
  assertObjectId,
  validateEmail,
  validateIdNumber,
  validatePassword,
  passwordErrorMessage,
  PASSWORD_TOO_LONG,
  PASSWORD_INVALID,
  PASSWORD_REQUIRED,
  validateName,
  validatePhone,
};
