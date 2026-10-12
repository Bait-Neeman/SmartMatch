const mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    ageMin: { type: Number },
    ageMax: { type: Number },

    city: { type: String },

    heightMin: { type: Number },
    heightMax: { type: Number },

    style: { type: String, enum: ["conservative", "modern", "open", "classic"] },

    preferredAppearance: { type: String, enum: ["slim", "average", "full", "chubby"] },

    financialMin: { type: Number },
    financialMax: { type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preference", preferenceSchema);
