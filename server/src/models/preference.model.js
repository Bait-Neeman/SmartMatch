const mongoose = require("mongoose");
const { STYLES, APPEARANCES, MARITAL_STATUSES, textField, choiceField } = require("./options");

const rangeField = (label) => ({ type: Number, min: [0, `ערך לא תקין בשדה ${label}`] });
const ageField = (label) => ({
  type: Number,
  min: [18, `ערך לא תקין בשדה ${label}`],
  max: [99, `ערך לא תקין בשדה ${label}`],
});

const preferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    ageMin: ageField("גיל מינימלי"),
    ageMax: ageField("גיל מקסימלי"),

    city: textField(100, "עיר"),

    heightMin: rangeField("גובה מינימלי"),
    heightMax: rangeField("גובה מקסימלי"),

    style: choiceField(STYLES, "סגנון"),

    preferredAppearance: choiceField(APPEARANCES, "מראה חיצוני"),

    // Range for the profile's financialStatus number. Not דרישה כספית vs השתתפות כספית.
    financialMin: rangeField("מצב כלכלי מינימלי"),
    financialMax: rangeField("מצב כלכלי מקסימלי"),

    // Empty means any marital status is acceptable.
    preferredMaritalStatus: choiceField(MARITAL_STATUSES, "סטטוס משפחתי"),
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preference", preferenceSchema);
