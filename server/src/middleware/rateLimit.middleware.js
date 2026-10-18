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

// Off only for local development and the test suite. npm run dev sets
// NODE_ENV=development. Any other value, including an unset one, keeps the limits on.
const authLimitsActive = () => {
  const env = process.env.NODE_ENV;
  return env !== "development" && env !== "test";
};

// Only a wrong password (401) uses up a try. An incomplete form (400) and a
// successful login do not, so fixing a typo cannot lock the account.
const countsAsLoginFailure = (_req, res) => res.statusCode !== 401;

// Failed logins from one address.
const loginIpLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 20,
  skipSuccessfulRequests: true,
  requestWasSuccessful: countsAsLoginFailure,
  skip: () => !authLimitsActive(),
  message: "יותר מדי ניסיונות התחברות. נסו שוב בעוד 15 דקות.",
});

// Failed logins to one account, so a password can't be guessed from many addresses.
const loginAccountLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: countsAsLoginFailure,
  skip: () => !authLimitsActive(),
  keyGenerator: (req) =>
    `account:${typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""}`,
  message: "יותר מדי ניסיונות התחברות לחשבון זה. נסו שוב בעוד 15 דקות.",
});

// A rejected form or a server error does not use up the hourly budget.
// Created accounts and duplicate attempts do.
const registerLimiter = createLimiter({
  windowMs: ONE_HOUR,
  limit: 10,
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode === 400 || res.statusCode >= 500,
  skip: () => !authLimitsActive(),
  message: "יותר מדי ניסיונות הרשמה. נסו שוב מאוחר יותר.",
});

module.exports = { apiLimiter, loginIpLimiter, loginAccountLimiter, registerLimiter };
