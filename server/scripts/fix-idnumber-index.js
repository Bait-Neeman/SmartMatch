require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;
const INDEX_NAME = "idNumber_1";

if (!MONGO_URI) {
  console.error("MONGO_URI is not defined in environment variables.");
  process.exit(1);
}

const indexOptions = (index) => {
  const { name, ...options } = index;
  return `${name} ${JSON.stringify(options)}`;
};

async function fixIdNumberIndex() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");

  const users = mongoose.connection.collection("users");
  let indexes = [];
  try {
    indexes = await users.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== "NamespaceNotFound") {
      throw error;
    }
  }

  const current = indexes.find((index) => index.name === INDEX_NAME);
  const dropped = Boolean(current && current.sparse !== true);
  if (dropped) {
    await users.dropIndex(INDEX_NAME);
    console.log(`Dropped non-sparse index ${INDEX_NAME}.`);
  }

  if (!current || dropped) {
    await users.createIndex({ idNumber: 1 }, { unique: true, sparse: true, name: INDEX_NAME });
    console.log(`Created unique sparse index ${INDEX_NAME}.`);
  }

  const finalIndexes = await users.indexes();
  for (const index of finalIndexes) {
    console.log(indexOptions(index));
  }

  await mongoose.disconnect();
  console.log("Index check complete.");
}

fixIdNumberIndex().catch((error) => {
  if (error?.code === 11000) {
    console.error("Index fix failed:", error.code, error.keyPattern);
  } else {
    console.error("Index fix failed:", error?.message);
  }
  process.exit(1);
});
