const mongoose = require("mongoose");
const { STYLES, APPEARANCES, ETHNICITIES, MARITAL_STATUSES, textField, choiceField } = require("./options");

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

    // Range for the profile's financialStatus number (finance shape B).
    // Shape A is financialDemand vs financialParticipation on the profile.
    // See the finance rule in match.service.js. Empty bounds do not filter.
    financialMin: rangeField("מצב כלכלי מינימלי"),
    financialMax: rangeField("מצב כלכלי מקסימלי"),

    // Empty means any marital status is acceptable.
    preferredMaritalStatus: choiceField(MARITAL_STATUSES, "סטטוס משפחתי"),

    // Community and institution. Empty means no filter. A candidate who left
    // the field blank is unknown and is not removed.
    preferredEthnicity: choiceField(ETHNICITIES, "עדה"),
    preferredYeshiva: textField(100, "ישיבה"),
    preferredSeminar: textField(100, "סמינר"),
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preference", preferenceSchema);
