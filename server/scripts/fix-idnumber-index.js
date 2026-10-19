require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

const isIdNumberIndex = (index) => {
  const keys = index?.key ? Object.keys(index.key) : [];
  return keys.length === 1 && index.key.idNumber === 1;
};

// Drops every users index on { idNumber: 1 } and unsets the field.
// Safe to run again: a missing index and a missing field are left alone.
async function removeStoredIdNumbers(db) {
  const users = db.collection("users");
  let indexes = [];
  try {
    indexes = await users.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== "NamespaceNotFound") {
      throw error;
    }
  }

  const dropped = [];
  for (const index of indexes.filter(isIdNumberIndex)) {
    await users.dropIndex(index.name);
    dropped.push(index.name);
  }

  const unset = await users.updateMany({ idNumber: { $exists: true } }, { $unset: { idNumber: "" } });
  return { dropped, unset: unset.modifiedCount };
}

async function main() {
  if (!MONGO_URI) {
    console.error("MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");
  const summary = await removeStoredIdNumbers(mongoose.connection.db);
  if (summary.dropped.length) {
    console.log(`Dropped index: ${summary.dropped.join(", ")}`);
  } else {
    console.log("No idNumber index to drop.");
  }
  console.log(`Unset idNumber on ${summary.unset} user(s).`);
  await mongoose.disconnect();
  console.log("ID number removal complete.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("ID number removal failed:", error?.message);
    process.exit(1);
  });
}

module.exports = { removeStoredIdNumbers };
