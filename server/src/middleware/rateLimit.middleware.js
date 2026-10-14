const { rateLimit } = require("express-rate-limit");

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Counters are kept in memory, which fits a single server instance.
const createLimiter = ({ message, ...options }) =>
  rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message },
    ...options,
  });

// Protects the whole API from floods without affecting normal use.
const apiLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 600,
  message: "יותר מדי בקשות. נסו שוב בעוד כמה דקות.",
});

// Failed logins from one address.
const loginIpLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  skipSuccessfulRequests: true,
  message: "יותר מדי ניסיונות התחברות. נסו שוב בעוד 15 דקות.",
});

// Failed logins to one account, so a password can't be guessed from many addresses.
const loginAccountLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) =>
    `account:${typeof req.body?.idNumber === "string" ? req.body.idNumber.trim() : ""}`,
  message: "יותר מדי ניסיונות התחברות לחשבון זה. נסו שוב בעוד 15 דקות.",
});

const registerLimiter = createLimiter({
  windowMs: ONE_HOUR,
  limit: 10,
  message: "יותר מדי ניסיונות הרשמה. נסו שוב מאוחר יותר.",
});

module.exports = { apiLimiter, loginIpLimiter, loginAccountLimiter, registerLimiter };
