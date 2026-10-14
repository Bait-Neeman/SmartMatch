const mongoose = require("mongoose");

// Rejects if the database can't be reached, so the server never runs without it.
const connectDB = async (uri) => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log("MongoDB connected");
};

module.exports = connectDB;
