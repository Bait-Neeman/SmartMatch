const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

const authRoutes = require("./src/routes/auth.routes");
const profileRoutes = require("./src/routes/profile.routes");
const preferenceRoutes = require("./src/routes/preference.routes");
const interestRoutes = require("./src/routes/interest.routes");
const matchRoutes = require("./src/routes/match.routes");
const adminRoutes = require("./src/routes/admin.routes");
const { errorHandler } = require("./src/middleware/error.middleware");

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/preference", preferenceRoutes);
app.use("/api/interest", interestRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/admin", adminRoutes);

// Global error handler
app.use(errorHandler);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API is working" });
});

app.get("/", (req, res) => {
  res.send("SmartMatch server is running 🚀");
});

module.exports = app;
