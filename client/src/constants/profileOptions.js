// Choices for profile and preference fields: the value stored on the server and its Hebrew label.
// The values must match server/src/models/options.js.
export const genderOptions = [
  { value: "male", label: "זכר" },
  { value: "female", label: "נקבה" },
];

export const ethnicityOptions = [
  { value: "ashkenazi", label: "אשכנזי" },
  { value: "sephardic", label: "ספרדי" },
  { value: "yemenite", label: "תימני" },
  { value: "other", label: "אחר" },
];

export const styleOptions = [
  { value: "conservative", label: "שמור" },
  { value: "classic", label: "קלאסי" },
  { value: "modern", label: "מודרני" },
  { value: "open", label: "פתוח" },
];

export const appearanceOptions = [
  { value: "slim", label: "רזה" },
  { value: "average", label: "ממוצע" },
  { value: "full", label: "מלא" },
  { value: "chubby", label: "רחב" },
];

export const maritalStatusOptions = [
  { value: "single", label: "רווק/ה" },
  { value: "divorced", label: "גרוש/ה" },
  { value: "widowed", label: "אלמן/ה" },
];

const ROLE_LABELS = { user: "משתמש", admin: "מנהל" };

// The Hebrew label of a stored value ("" when there is no value)
export const labelOf = (options, value) =>
  options.find((option) => option.value === value)?.label || value || "";

export const roleLabel = (role) => ROLE_LABELS[role] || role || "";
