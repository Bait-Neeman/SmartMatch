const crypto = require("crypto");

// 32 characters, so a random byte can be masked to an index with no modulo bias.
// Leaves out 0/O, 1/I, and other look-alikes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 16;

const allowCodeLogin = () => {
  const value = process.env.ALLOW_CODE_LOGIN;
  return value === "true" || value === "1";
};

const normalizeAccessCode = (value) =>
  typeof value === "string" ? value.trim().replace(/[\s-]/g, "").toUpperCase() : "";

const generateAccessCode = () => {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += ALPHABET[bytes[i] & 31];
  }
  return code;
};

// Indexed lookup key. Not the code and not a password hash: an HMAC with the
// server secret, so a login finds the account with one indexed read.
const accessCodeLookup = (code) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return crypto.createHmac("sha256", secret).update(`smartmatch-access-code\0${code}`).digest("hex");
};

module.exports = {
  ALPHABET,
  CODE_LENGTH,
  allowCodeLogin,
  normalizeAccessCode,
  generateAccessCode,
  accessCodeLookup,
};
