require("dotenv").config({ quiet: true });

// Without these the server can't work safely, so it refuses to start
const missing = ["MONGO_URI", "JWT_SECRET"].filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const connectDB = require("./src/config/db");
const app = require("./app");
const { isStorageConfigured } = require("./src/services/storage.service");

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB(process.env.MONGO_URI);

  if (!isStorageConfigured()) {
    console.warn("CLOUDINARY_URL is not set - image and resume uploads are disabled");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start the server:", error.message);
  process.exit(1);
});
