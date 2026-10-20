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

// Snapshot of the admin who opened the account. Never taken from the client.
const createdBySchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, trim: true, maxlength: 100, default: "" },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    // Empty until the member sets a name. Registration must not invent one
    // from the email or the password.
    name: { type: String, trim: true, maxlength: 100, default: "" },
    gender: { type: String, enum: ["male", "female"] },

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

    // HMAC of the matchmaker access code. Indexed so login is a single lookup.
    // The code itself is stored only as the password hash, and only until the
    // member chooses their own password.
    accessCodeLookup: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },

    // The same code, encrypted (AES-256-GCM) so an admin can read it again.
    // Not the plaintext, and not selected unless an admin view asks for it.
    accessCodeCipher: {
      type: String,
      select: false,
    },

    // True until an admin-created member sets their own email and password.
    credentialSetupRequired: { type: Boolean, default: false },

    createdBy: { type: createdBySchema },

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
