const jwt = require("jsonwebtoken");

const TOKEN_EXPIRES_IN = "7d";

// There is deliberately no fallback secret: with a known default anyone could forge tokens.
// server.js refuses to start when JWT_SECRET is missing.
const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return secret;
};

const generateToken = (userId, role, tokenVersion = 0) => {
  return jwt.sign(
    { userId: String(userId), role, tokenVersion: Number(tokenVersion) || 0 },
    getSecret(),
    { expiresIn: TOKEN_EXPIRES_IN, algorithm: "HS256" }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, getSecret(), { algorithms: ["HS256"] });
};

module.exports = { generateToken, verifyToken, TOKEN_EXPIRES_IN };
