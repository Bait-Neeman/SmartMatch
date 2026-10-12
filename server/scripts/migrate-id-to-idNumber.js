require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/user.model");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in environment variables.");
  process.exit(1);
}

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const copyResult = await User.updateMany(
    {
      id: { $exists: true },
      $or: [
        { idNumber: { $exists: false } },
        { idNumber: null },
        { idNumber: "" },
      ],
    },
    [{ $set: { idNumber: "$id" } }]
  );

  console.log(`Copied id to idNumber for ${copyResult.modifiedCount} user(s).`);

  const unsetResult = await User.updateMany(
    { id: { $exists: true } },
    { $unset: { id: "" } }
  );

  console.log(`Removed legacy id field from ${unsetResult.modifiedCount} user(s).`);

  await mongoose.disconnect();
  console.log("Migration complete.");
}

migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
