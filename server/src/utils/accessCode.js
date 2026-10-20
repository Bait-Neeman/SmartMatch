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

// AES-256-GCM key. ACCESS_CODE_KEY when it is set, otherwise JWT_SECRET.
// HKDF turns either secret into 32 bytes. The code itself is never logged.
const accessCodeKeyMaterial = () => {
  const dedicated = process.env.ACCESS_CODE_KEY;
  if (typeof dedicated === "string" && dedicated.trim()) return dedicated.trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
};

const accessCodeKey = () =>
  Buffer.from(crypto.hkdfSync("sha256", accessCodeKeyMaterial(), "smartmatch", "smartmatch-access-code-at-rest", 32));

const encryptAccessCode = (code) => {
  if (typeof code !== "string" || code.length === 0) {
    throw new Error("access code is empty");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", accessCodeKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
};

const decryptAccessCode = (stored) => {
  if (typeof stored !== "string" || stored.length === 0) return "";
  const packed = Buffer.from(stored, "base64");
  if (packed.length <= 28) {
    throw new Error("access code record is unreadable");
  }
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", accessCodeKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};

const readStoredAccessCode = (user) => {
  if (!user?.accessCodeCipher) return "";
  try {
    return decryptAccessCode(user.accessCodeCipher);
  } catch {
    return "";
  }
};

module.exports = {
  ALPHABET,
  CODE_LENGTH,
  allowCodeLogin,
  normalizeAccessCode,
  generateAccessCode,
  accessCodeLookup,
  encryptAccessCode,
  decryptAccessCode,
  readStoredAccessCode,
};
