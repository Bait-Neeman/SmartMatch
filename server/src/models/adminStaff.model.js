const mongoose = require("mongoose");

// Marks an admin account that was added as a matchmaker.
// Accounts without a row stay managers. This is not a login role.
const adminStaffSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    kind: { type: String, enum: ["manager", "matchmaker"], default: "matchmaker" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminStaff", adminStaffSchema);
