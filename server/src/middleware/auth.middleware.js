const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const protect = (req, res, next) => {
  console.log('=== AUTH MIDDLEWARE ===');
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Token verified for user:', decoded.userId);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(401).json({ message: "Token not valid" });
  }
};

module.exports = { protect };
