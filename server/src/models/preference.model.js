const mongoose = require("mongoose");

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

    heightMin: rangeField("גובה מינימלי"),
    heightMax: rangeField("גובה מקסימלי"),

    // Lists. An older document may still store one string. Empty means no filter.
    // "לא משנה" and "אין העדפת עיר" are form state and are not stored.
    city: { type: mongoose.Schema.Types.Mixed },
    style: { type: mongoose.Schema.Types.Mixed },
    preferredAppearance: { type: mongoose.Schema.Types.Mixed },

    // Range for the profile's financialStatus number (finance shape B).
    // Shape A is financialDemand vs financialParticipation on the profile.
    // See the finance rule in match.service.js. Empty bounds do not filter.
    financialMin: rangeField("מצב כלכלי מינימלי"),
    financialMax: rangeField("מצב כלכלי מקסימלי"),

    // Empty means any marital status is acceptable. Default for a new form is רווק/ה.
    preferredMaritalStatus: { type: mongoose.Schema.Types.Mixed },

    // Community and institution. Empty means no filter. A candidate who left
    // the field blank is unknown and is not removed.
    preferredEthnicity: { type: mongoose.Schema.Types.Mixed },
    // A list of names. Older documents stored one string; both shapes are read.
    // Empty, or the "אין העדפה" choice (it is not stored), means no filter.
    // Mixed so a legacy string is not split into letters by an array cast.
    preferredYeshiva: { type: mongoose.Schema.Types.Mixed },
    preferredSeminar: { type: mongoose.Schema.Types.Mixed },
    // Same shape as the institution lists. Empty means no profession filter.
    // A candidate who left מקצוע blank is unknown and is not removed.
    preferredOccupation: { type: mongoose.Schema.Types.Mixed },

    // Hard filters. Checked means the candidate must have answered yes.
    // A missing or false answer is excluded. These are not "unknown, keep".
    // onlyWorkingInProfession ("רק בחורה שעובדת במקצוע שלמדה") implies onlyWorking.
    onlyWorking: { type: Boolean },
    onlyWorkingInProfession: { type: Boolean },

    // Unchecked by default. A document without the field keeps the old rule:
    // a blank value in a filtered field stays unknown and is still shown.
    excludeIncomplete: { type: Boolean },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preference", preferenceSchema);
