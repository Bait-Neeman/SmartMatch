const mongoose = require("mongoose");
const { hashPassword } = require("../utils/hash");
const { LANGUAGES } = require("./options");

const notificationSchema = new mongoose.Schema(
  {
    newSuggestion: { type: Boolean, default: true },
    interestReceived: { type: Boolean, default: true },
    activeSuggestion: { type: Boolean, default: true },
    matchmakerRequest: { type: Boolean, default: true },
    matchmakerStarted: { type: Boolean, default: true },
    emailDigest: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },

    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },

    // Never returned by queries unless explicitly requested with .select("+password")
    password: {
      type: String,
      required: true,
      select: false,
    },

    // Bumped on password change. Tokens carry the version they were issued with,
    // and auth rejects a token whose version is older.
    tokenVersion: { type: Number, default: 0, select: false },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },

    phone: { type: String, trim: true, maxlength: 20 },
    language: { type: String, enum: LANGUAGES, default: "he" },
    pauseSuggestions: { type: Boolean, default: false },
    showMatchPercent: { type: Boolean, default: true },
    minMatchPercent: { type: Number, min: 0, max: 100 },
    notifications: { type: notificationSchema, default: () => ({}) },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await hashPassword(this.password);
  }
});

module.exports = mongoose.model("User", userSchema);
