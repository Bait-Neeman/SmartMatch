const mongoose = require("mongoose");

// Kept off the interest document on purpose. Interest responses are sent to the
// couple, and a case note can contain names. Only admin routes read this model.
//
// status:
//   new           הועבר לשדכן (initial; the previous "new")
//   coordinating  בתיאום פגישה (optional). Old "in_progress" is migrated here.
//   meeting       numbered meeting. meetingNumber is 1..99.
//   ended         השידוך ירד. Old "closed" is migrated here, not to engaged.
//   engaged       התארסו
const adminCaseSchema = new mongoose.Schema(
  {
    interest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Interest",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["new", "coordinating", "meeting", "ended", "engaged"],
      default: "new",
    },
    meetingNumber: { type: Number, default: null },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    touchedAt: { type: Date },
    history: [
      {
        status: {
          type: String,
          enum: ["new", "coordinating", "meeting", "ended", "engaged"],
          required: true,
        },
        meetingNumber: { type: Number, default: null },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        changedAt: { type: Date, required: true },
        source: { type: String, enum: ["admin", "autoClose", "migration"], default: "admin" },
        legacyStatus: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminCase", adminCaseSchema);
