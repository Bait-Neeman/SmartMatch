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

export const asNameList = (value) => {
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
    const key = normaliseInstitution(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(trimmed);
  }
  return names;
};

const numberOrEmpty = (value) => (value === "" || value == null ? "" : Number(value));

// Fields the profile form owns. The other gender's institution and work fields are cleared.
export const buildProfileFields = (data) => {
  const gender = data.gender === "female" ? "female" : data.gender === "male" ? "male" : "";
  const working = gender === "female" && Boolean(data.working);
  const workingInProfession = working && Boolean(data.workingInProfession);
  return {
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
    yeshiva: gender === "male" ? data.yeshiva || "" : "",
    seminar: gender === "female" ? data.seminar || "" : "",
    occupation: gender === "female" ? data.occupation || "" : "",
    working: gender === "female" ? working : "",
    workingInProfession: gender === "female" ? workingInProfession : "",
    workplace: working ? data.workplace || "" : "",
  };
};

// Preference fields the gender form shows. A field that is no longer on the form is cleared
// so it cannot keep filtering after a save. Free text is not part of this payload.
export const buildPreferenceFields = (data, gender) => ({
  ageMin: numberOrEmpty(data.ageMin),
  ageMax: numberOrEmpty(data.ageMax),
  heightMin: numberOrEmpty(data.heightMin),
  heightMax: numberOrEmpty(data.heightMax),
  city: data.city || "",
  style: data.style || "",
  preferredAppearance: data.preferredAppearance || "",
  preferredMaritalStatus: data.preferredMaritalStatus || "",
  preferredEthnicity: "",
  financialMin: "",
  financialMax: "",
  preferredYeshiva: gender === "female" ? asNameList(data.preferredYeshiva) : "",
  preferredSeminar: gender === "male" ? asNameList(data.preferredSeminar) : "",
  preferredOccupation: gender === "male" ? asNameList(data.preferredOccupation) : "",
  onlyWorking: gender === "male" && (Boolean(data.onlyWorking) || Boolean(data.onlyWorkingInProfession)),
  onlyWorkingInProfession: gender === "male" && Boolean(data.onlyWorkingInProfession),
});
