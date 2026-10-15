const mongoose = require("mongoose");

const adminSettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    notifyNewCase: { type: Boolean, default: true },
    notifyOneSide: { type: Boolean, default: false },
    notifyNewRegistration: { type: Boolean, default: true },
    dailySummary: { type: Boolean, default: true },
    autoClose: { type: Boolean, default: false },
    revealIdentity: { type: Boolean, default: true },
    activityArea: { type: String, trim: true, maxlength: 100, default: "" },
  },
  { timestamps: true }
);

const DEFAULT_SETTINGS = {
  notifyNewCase: true,
  notifyOneSide: false,
  notifyNewRegistration: true,
  dailySummary: true,
  autoClose: false,
  revealIdentity: true,
  activityArea: "",
};

module.exports = mongoose.model("AdminSettings", adminSettingsSchema);
module.exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
