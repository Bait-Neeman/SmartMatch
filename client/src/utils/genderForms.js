export const NO_YESHIVA_PREFERENCE = "אין העדפת ישיבה";
export const NO_SEMINAR_PREFERENCE = "אין העדפת סמינר";
export const NO_OCCUPATION_PREFERENCE = "אין העדפת מקצוע";

export const ABOUT_ME_TITLE = "עוד פרטים עליי";
export const ABOUT_ME_HELP =
  "כאן ניתן לכתוב כל מה שתרצו שיהיה גלוי לכל ההצעות הרלוונטיות (תכונות אופי, סגנון, תחביבים ועוד...)";

export const lookingForTitle = (gender) => (gender === "female" ? "מה אני מחפשת" : "מה אני מחפש");

export const lookingForHelp = (gender) =>
  gender === "female"
    ? "כאן ניתן לכתוב איזה נתונים או תכונות חשוב או עדיף לכם שיהיה בבחור"
    : "כאן ניתן לכתוב איזה נתונים או תכונות חשוב או עדיף לכם שיהיה בבחורה";

export const normaliseInstitution = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[-–—־]/g, " ")
    .replace(/\s+/g, " ");

// "ישיבת חברון" matches "חברון". "סמינר אור החיים" matches "אור החיים".
export const institutionKey = (value) => normaliseInstitution(value).replace(/^(?:ישיבת|סמינר)\s+/, "");

export const PHONE_LABEL = "טלפון נייד ליצירת קשר";
export const PHONE_REQUIRED = "טלפון נייד ליצירת קשר הוא שדה חובה";
export const PHONE_INVALID = "מספר הטלפון הנייד אינו תקין";
export const PHONE_HINT = "המספר גלוי רק לך ולשדכן";

// Same rule as the server: optional spaces, dashes, parentheses, and +972.
// A valid number becomes 10 digits starting with 05.
export const normalizeIsraeliMobile = (value) => {
  if (typeof value !== "string") return "";
  let text = value.trim().replace(/[\s\-().]/g, "");
  if (text.startsWith("+")) text = text.slice(1);
  if (!/^\d+$/.test(text)) return "";
  if (text.startsWith("972")) {
    text = text.slice(3);
    if (!text.startsWith("0")) text = `0${text}`;
  } else if (text.length === 9 && text.startsWith("5")) {
    text = `0${text}`;
  }
  return /^05\d{8}$/.test(text) ? text : "";
};

export const phoneRules = {
  required: PHONE_REQUIRED,
  validate: (value) => (normalizeIsraeliMobile(value) ? true : PHONE_INVALID),
};

export const asNameList = (value, keyOf = normaliseInstitution) => {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const seen = new Set();
  const names = [];
  for (const item of raw) {
    const trimmed = String(item ?? "").trim().replace(/\s+/g, " ");
    if (
      !trimmed ||
      trimmed === NO_YESHIVA_PREFERENCE ||
      trimmed === NO_SEMINAR_PREFERENCE ||
      trimmed === NO_OCCUPATION_PREFERENCE
    ) {
      continue;
    }
    const key = keyOf(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(trimmed);
  }
  return names;
};

const numberOrEmpty = (value) => (value === "" || value == null ? "" : Number(value));

// Fields this gender's profile form shows. Anything else is left untouched,
// including a man's older עיסוק (occupation) value.
export const buildProfileFields = (data) => {
  const gender = data.gender === "female" ? "female" : data.gender === "male" ? "male" : "";
  const working = gender === "female" && Boolean(data.working);
  const fields = {
    gender,
    ethnicity: data.ethnicity || "",
    age: data.age === "" || data.age == null ? "" : Number(data.age),
    maritalStatus: data.maritalStatus || "",
    city: data.city || "",
    height: numberOrEmpty(data.height),
    style: data.style || "",
    appearance: data.appearance || "",
    financialDemand: numberOrEmpty(data.financialDemand),
    financialParticipation: numberOrEmpty(data.financialParticipation),
    description: data.description || "",
    phone: String(data.phone ?? "").trim(),
  };
  if (gender === "male") fields.yeshiva = data.yeshiva || "";
  if (gender === "female") {
    fields.seminar = data.seminar || "";
    fields.occupation = data.occupation || "";
    fields.working = working;
    fields.workplace = working ? data.workplace || "" : "";
    fields.workingInProfession = working && Boolean(data.workingInProfession);
  }
  return fields;
};

// Only the fields this gender's preference form shows. A stored community
// preference or financial range is left as it was.
export const buildPreferenceFields = (data, gender) => {
  const fields = {
    ageMin: numberOrEmpty(data.ageMin),
    ageMax: numberOrEmpty(data.ageMax),
    heightMin: numberOrEmpty(data.heightMin),
    heightMax: numberOrEmpty(data.heightMax),
    city: data.city || "",
    style: data.style || "",
    preferredAppearance: data.preferredAppearance || "",
    preferredMaritalStatus: data.preferredMaritalStatus || "",
  };
  if (gender === "female") fields.preferredYeshiva = asNameList(data.preferredYeshiva, institutionKey);
  if (gender === "male") {
    fields.preferredSeminar = asNameList(data.preferredSeminar, institutionKey);
    fields.preferredOccupation = asNameList(data.preferredOccupation);
    fields.onlyWorking = Boolean(data.onlyWorking) || Boolean(data.onlyWorkingInProfession);
    fields.onlyWorkingInProfession = Boolean(data.onlyWorkingInProfession);
  }
  return fields;
};
