const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./src/routes/auth.routes");
const profileRoutes = require("./src/routes/profile.routes");
const preferenceRoutes = require("./src/routes/preference.routes");
const interestRoutes = require("./src/routes/interest.routes");
const matchRoutes = require("./src/routes/match.routes");
const adminRoutes = require("./src/routes/admin.routes");
const fileRoutes = require("./src/routes/file.routes");
const settingsRoutes = require("./src/routes/settings.routes");
const suggestionRoutes = require("./src/routes/suggestion.routes");
const searchRoutes = require("./src/routes/search.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const institutionRoutes = require("./src/routes/institution.routes");
const { apiLimiter } = require("./src/middleware/rateLimit.middleware");
const { notFound, errorHandler } = require("./src/middleware/error.middleware");

const app = express();

// Number of proxies in front of the server. Render passes requests through several, and
// rate limiting needs the visitor's real IP address. Override with TRUST_PROXY if needed.
const trustProxy = Number.parseInt(process.env.TRUST_PROXY ?? "3", 10);
app.set("trust proxy", Number.isInteger(trustProxy) ? trustProxy : 3);

// Sites allowed to call the API from a browser. CORS_ORIGINS (comma-separated) replaces the list.
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : ["http://localhost:5173", "http://127.0.0.1:5173", "https://smart-matchmaking-system.vercel.app"];
// Preview deployments of the project's Vercel site
const vercelPreviewOrigin = /^https:\/\/smart-matchmaking-system-[a-z0-9-]+-r0583252581-1797s-projects\.vercel\.app$/;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedOrigins.includes(origin) || vercelPreviewOrigin.test(origin)),
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Logs method, path, status and duration - never request bodies, which hold passwords and ID numbers
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

app.get("/", (req, res) => {
  res.send("SmartMatch server is running 🚀");
});

// Health check (used by Render)
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

app.use("/api", apiLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/preference", preferenceRoutes);
app.use("/api/interest", interestRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/suggestions", suggestionRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/institutions", institutionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
