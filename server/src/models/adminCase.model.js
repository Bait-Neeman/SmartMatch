const mongoose = require("mongoose");

// Kept off the interest document on purpose. Interest responses are sent to the
// couple, and a case note can contain names. Only admin routes read this model.
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
      enum: ["new", "in_progress", "closed"],
      default: "new",
    },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    touchedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminCase", adminCaseSchema);
