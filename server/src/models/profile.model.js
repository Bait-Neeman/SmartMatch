const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    gender: { type: String, enum: ["male", "female"], required: true },
    age: { type: Number },
    city: { type: String },
    height: { type: Number },

    style: { type: String, enum: ["conservative", "modern", "open", "classic"] },
    appearance: { type: String, enum: ["slim", "average", "full", "chubby"] },
    ethnicity: { type: String, enum: ["ashkenazi", "sephardic", "yemenite", "other"] },

    description: { type: String },

    // Male fields
    yeshiva: { type: String },
    financialRequirement: { type: String },

    // Female fields
    seminar: { type: String },
    occupation: { type: String },
    financialCapabilities: { type: String },

    // Financial status for matching (numeric scale)
    financialStatus: { type: Number },

    resumePdf: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
