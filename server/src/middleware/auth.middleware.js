const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { verifyToken } = require("../config/jwt");
const { isObjectId } = require("../utils/validators");

const SESSION_EXPIRED = "פג תוקף ההתחברות, יש להתחבר מחדש";

// Verifies the token and loads the user from the database, so a deleted user
// or a changed role takes effect immediately instead of when the token expires.
const protect = async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new HttpError(401, "נדרשת התחברות");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, SESSION_EXPIRED);
  }

  const user = isObjectId(payload.userId)
    ? await User.findById(payload.userId).select("+tokenVersion").lean()
    : null;

  if (!user) {
    throw new HttpError(401, SESSION_EXPIRED);
  }

  // Tokens issued before this check have no version and match an unchanged account (0).
  if ((payload.tokenVersion || 0) !== (user.tokenVersion || 0)) {
    throw new HttpError(401, SESSION_EXPIRED);
  }

  req.user = { userId: String(user._id), role: user.role };
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    throw new HttpError(403, "הפעולה מותרת למנהל בלבד");
  }
  next();
};

module.exports = { protect, requireAdmin };
