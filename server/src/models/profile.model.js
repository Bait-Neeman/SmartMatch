const mongoose = require("mongoose");
const { GENDERS, STYLES, APPEARANCES, ETHNICITIES, textField, choiceField } = require("./options");

const heightMessage = "יש להזין גובה בסנטימטרים (100-250)";

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    gender: { ...choiceField(GENDERS, "מגדר"), required: [true, "מגדר הוא שדה חובה"] },
    age: {
      type: Number,
      required: [true, "גיל הוא שדה חובה"],
      min: [16, "הגיל המינימלי הוא 16"],
      max: [120, "הגיל שהוזן אינו תקין"],
    },
    city: textField(100, "עיר"),
    height: { type: Number, min: [100, heightMessage], max: [250, heightMessage] },

    style: choiceField(STYLES, "סגנון"),
    appearance: choiceField(APPEARANCES, "מראה חיצוני"),
    ethnicity: choiceField(ETHNICITIES, "עדה"),

    description: textField(1000, "תיאור"),

    // Male fields
    yeshiva: textField(100, "ישיבה"),
    financialRequirement: textField(100, "דרישה כספית"),

    // Female fields
    seminar: textField(100, "סמינר"),
    occupation: textField(100, "עיסוק"),
    financialCapabilities: textField(100, "יכולת כספית"),

    // Financial status for matching (numeric scale)
    financialStatus: { type: Number, min: [0, "המדד הכספי לא יכול להיות שלילי"] },

    // Cloudinary public IDs - the API returns them as signed URLs (see storage.service)
    resumePdf: { type: String },
    image: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
