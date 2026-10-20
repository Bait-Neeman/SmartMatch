const mongoose = require("mongoose");
const { GENDERS, STYLES, APPEARANCES, ETHNICITIES, MARITAL_STATUSES, textField, choiceField } = require("./options");

const heightMessage = "יש להזין גובה בסנטימטרים (100-250)";

const photoCropSchema = new mongoose.Schema(
  {
    x: { type: Number, min: 0, max: 100 },
    y: { type: Number, min: 0, max: 100 },
    width: { type: Number, min: 0, max: 100 },
    height: { type: Number, min: 0, max: 100 },
    zoom: { type: Number, min: 1, max: 3 },
  },
  { _id: false }
);

const profileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    gender: { ...choiceField(GENDERS, "מגדר"), required: [true, "מגדר הוא שדה חובה"], index: true },
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
    // Free text: what this person is looking for (מה אני מחפש/ת).
    lookingFor: textField(1000, "מה אני מחפש"),
    maritalStatus: choiceField(MARITAL_STATUSES, "סטטוס משפחתי"),

    occupation: textField(100, "מקצוע"),

    // Female profile: checkbox "עובדת", and where she works when it is checked.
    // workingInProfession is "עובדת במקצוע שלמדתי". It is stored only while she is working.
    working: { type: Boolean },
    workingInProfession: { type: Boolean },
    workplace: textField(100, "מקום עבודה"),

    // Learning institution (מוסד). The profile form shows yeshiva for men and seminar for women.
    yeshiva: textField(100, "ישיבה"),
    seminar: textField(100, "סמינר"),

    // דרישה כספית (financialDemand): the minimum this side requires from the other.
    // A higher participation on the other side still fits. Free text, not used by matching.
    financialRequirement: textField(100, "דרישה כספית"),

    // יכולת כספית. There is no separate השתתפות כספית (financialContribution) field.
    // This is the other stored money figure, and either side may set it.
    financialCapabilities: textField(100, "יכולת כספית"),

    // One number matched against a preference min/max range. Not demand or participation.
    financialStatus: { type: Number, min: [0, "המדד הכספי לא יכול להיות שלילי"] },

    // Numeric pair used by matching (finance shape A). financialDemand is the
    // minimum this side requires. financialParticipation is what this side can
    // give. financialStatus is shape B, against the preference range. A missing
    // number does not exclude. Free-text money fields are not compared.
    financialDemand: {
      type: Number,
      min: [0, "ערך לא תקין בשדה דרישה כספית"],
      max: [100000000, "ערך לא תקין בשדה דרישה כספית"],
    },
    financialParticipation: {
      type: Number,
      min: [0, "ערך לא תקין בשדה השתתפות כספית"],
      max: [100000000, "ערך לא תקין בשדה השתתפות כספית"],
    },

    // Cloudinary public IDs - the API returns them as signed URLs (see storage.service)
    resumePdf: { type: String },
    image: { type: String },
    // How to frame the original image. Percentages of that file, not a second file.
    // x/y is the top-left of the crop rect. The focal point is the rect's center.
    photoCrop: photoCropSchema,
    // Set when a resume is uploaded. Shown on the owner's profile, not before mutual approval.
    resumeSize: { type: Number, min: [0, "גודל הקובץ אינו תקין"] },
    resumeUploadedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
