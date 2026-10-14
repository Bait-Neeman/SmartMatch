const mongoose = require("mongoose");
const { STYLES, APPEARANCES, textField, choiceField } = require("./options");

const rangeField = (label) => ({ type: Number, min: [0, `ערך לא תקין בשדה ${label}`] });

const preferenceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    ageMin: rangeField("גיל מינימלי"),
    ageMax: rangeField("גיל מקסימלי"),

    city: textField(100, "עיר"),

    heightMin: rangeField("גובה מינימלי"),
    heightMax: rangeField("גובה מקסימלי"),

    style: choiceField(STYLES, "סגנון"),

    preferredAppearance: choiceField(APPEARANCES, "מראה חיצוני"),

    financialMin: rangeField("מצב כלכלי מינימלי"),
    financialMax: rangeField("מצב כלכלי מקסימלי"),
  },
  { timestamps: true }
);

module.exports = mongoose.model("Preference", preferenceSchema);
