// Allowed values shared by the profile and preference models.
const GENDERS = ["male", "female"];
const STYLES = ["conservative", "modern", "open", "classic"];
const APPEARANCES = ["slim", "average", "full", "chubby"];
const ETHNICITIES = ["ashkenazi", "sephardic", "yemenite", "other"];

// Schema field helpers with Hebrew validation messages (they are shown to users).
const textField = (maxlength, label) => ({
  type: String,
  trim: true,
  maxlength: [maxlength, `השדה ${label} ארוך מדי`],
});

const choiceField = (values, label) => ({
  type: String,
  enum: { values, message: `ערך לא תקין בשדה ${label}` },
});

module.exports = { GENDERS, STYLES, APPEARANCES, ETHNICITIES, textField, choiceField };
