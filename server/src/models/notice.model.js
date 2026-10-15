const mongoose = require("mongoose");

// Read state for the top-bar bell. The text is rebuilt on each read from the
// current suggestion, so a stored row never keeps a name that should be hidden.
const TYPES = [
  "newSuggestion",
  "interestReceived",
  "activeSuggestion",
  "matchmakerRequest",
  "matchmakerStarted",
  "adminCase",
];

const noticeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: TYPES, required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

noticeSchema.index({ user: 1, type: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model("Notice", noticeSchema);
