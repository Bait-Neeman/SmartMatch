import { ethnicityOptions, labelOf, maritalStatusOptions } from "../constants/profileOptions.js";

// Fields the suggestions page may show before mutual approval.
// Name, photo, resume, and contact are never copied into a view.
// maritalStatus is public, like age and city.
// Shape follows PR #7 (privacy.service PUBLIC_PROFILE_FIELDS): the person object
// may omit name/image entirely, or an older payload may still include them.
const PUBLIC_KEYS = [
  "age",
  "height",
  "city",
  "ethnicity",
  "gender",
  "occupation",
  "description",
  "lookingFor",
  "maritalStatus",
  "yeshiva",
  "seminar",
  "financialRequirement",
  "financialDemand",
  "financialCapabilities",
  "financialContribution",
  "financialParticipation",
  "matchPercent",
];

const IDENTITY_KEYS = [
  "name",
  "email",
  "phone",
  "mobile",
  "telephone",
  "image",
  "resumePdf",
  "photo",
  "resume",
  "photoUrl",
  "resumeUrl",
  "imageUrl",
  "contact",
];

export const SUGGESTION_KINDS = {
  new: {
    tone: "pending",
    label: "הצעה חדשה",
    bannerTitle: "הצעה חדשה",
    bannerText: "בשלב זה מוצגים פרטים כלליים בלבד – ללא תמונה וללא שם.",
  },
  sent: {
    tone: "sent",
    label: "התעניינות נשלחה",
    bannerTitle: "התעניינות נשלחה",
    bannerText: "ההתעניינות נשלחה וממתינה לתגובת הצד השני.",
  },
  received: {
    tone: "received",
    label: "התקבלה התעניינות",
    bannerTitle: "התקבלה התעניינות!",
    bannerText: "הצד השני שלח אלייך התעניינות. אשרי כדי לחשוף תמונה ושם לשני הצדדים.",
  },
  accepted: {
    tone: "accepted",
    label: "אושרה · פרטים גלויים",
    bannerTitle: "ההתעניינות אושרה · פרטים גלויים",
    bannerText: "שני הצדדים אישרו. התמונה והשם נחשפו לשניכם.",
  },
  forwarded: {
    tone: "forwarded",
    label: "העברתי לשדכן · ממתין לצד השני",
    bannerTitle: "העברתי לשדכן · ממתין לצד השני",
    bannerText: "העברת את ההצעה לטיפול שדכן. ממתינים שהצד השני יעביר גם.",
  },
  "other-forwarded": {
    tone: "otherForwarded",
    label: "הצד השני מעוניין להתקדם לשדכן",
    bannerTitle: "הצד השני מעוניין להתקדם לשדכן",
    bannerText: "הצד השני העביר את ההצעה לטיפול שדכן. אפשר להעביר גם כדי שהשדכן יתחיל לטפל.",
  },
  matchmaker: {
    tone: "matchmaker",
    label: "בטיפול שדכן",
    bannerTitle: "בטיפול שדכן",
    bannerText: "שני הצדדים העבירו. השדכן קיבל את הפרטים ויצור קשר בקרוב.",
  },
};

const GENDER_NOUN = { male: "בן", female: "בת" };

export const idOf = (item) => {
  if (item == null || item === "") return "";
  if (typeof item !== "object") return String(item);
  const id = item._id ?? item.id ?? item.user?._id ?? item.user;
  if (id && typeof id === "object") return idOf(id);
  return id != null && id !== "" ? String(id) : "";
};

export const cleanText = (value) => {
  if (value == null) return "";
  const text = String(value).trim();
  if (!text || text === "?" || text === "undefined" || text === "null") return "";
  return text;
};

const asPerson = (value) => {
  if (!value || typeof value !== "object") return {};
  const nested = value.profile && typeof value.profile === "object" ? value.profile : {};
  return { ...nested, ...value };
};

export const lookingForOf = (person) => {
  const value = asPerson(person).lookingFor;
  if (typeof value !== "string" && typeof value !== "number") return "";
  return cleanText(value);
};

export const lookingForHeading = (gender) => {
  if (gender === "female") return "מה היא מחפשת";
  if (gender === "male") return "מה הוא מחפש";
  return "מה מחפש/ת";
};

export const readPercent = (...sources) => {
  for (const source of sources) {
    const value = asPerson(source).matchPercent;
    if (value == null || value === "") continue;
    const numeric = Number(String(value).replace("%", "").trim());
    if (!Number.isFinite(numeric)) continue;
    const percent = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
    return Math.max(0, Math.min(100, Math.round(percent)));
  }
  return null;
};

export const publicFields = (value) => {
  const source = asPerson(value);
  const copy = {};
  for (const key of PUBLIC_KEYS) {
    if (key === "lookingFor" || key === "matchPercent") continue;
    const text = cleanText(source[key]);
    if (text) copy[key] = source[key];
  }
  const lookingFor = lookingForOf(source);
  if (lookingFor) copy.lookingFor = lookingFor;
  const percent = readPercent(source);
  if (percent != null) copy.matchPercent = percent;
  return copy;
};

export const formatHeight = (height) => {
  const numeric = Number(height);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric >= 3) return (numeric / 100).toFixed(2);
  return numeric.toFixed(2);
};

export const institutionOf = (person) => {
  const source = asPerson(person);
  return [cleanText(source.yeshiva), cleanText(source.seminar)].filter(Boolean).join(" · ");
};

export const communityOf = (person) => {
  const value = cleanText(asPerson(person).ethnicity);
  if (!value) return "";
  return labelOf(ethnicityOptions, value) || value;
};

const contributionOf = (person) => {
  const source = asPerson(person);
  return (
    cleanText(source.financialContribution) ||
    cleanText(source.financialParticipation) ||
    cleanText(source.financialCapabilities)
  );
};

export const anonymousTitle = (person) => {
  const source = asPerson(person);
  const noun = GENDER_NOUN[source.gender] || "";
  const ageText = cleanText(source.age);
  const age = ageText && Number.isFinite(Number(ageText)) ? String(Math.round(Number(ageText))) : ageText;
  if (noun && age) return `${noun} ${age}`;
  if (age) return `גיל ${age}`;
  if (noun) return noun;
  return "הצעה";
};

export const toSuggestionView = (person, kind = "new", extra) => {
  const source = { ...publicFields(person), ...publicFields(extra) };
  const city = cleanText(source.city);
  const occupation = cleanText(source.occupation);
  const institution = institutionOf(source);
  const description = cleanText(source.description);
  const lookingFor = cleanText(source.lookingFor) || lookingForOf(source);
  const fields = [
    { key: "height", label: "גובה", value: formatHeight(source.height) },
    { key: "maritalStatus", label: "סטטוס משפחתי", value: labelOf(maritalStatusOptions, source.maritalStatus) },
    { key: "community", label: "עדה", value: communityOf(source) },
    { key: "city", label: "מגורים", value: city },
    { key: "institution", label: "מוסד לימוד", value: institution },
    { key: "occupation", label: "עיסוק", value: occupation },
    {
      key: cleanText(source.financialDemand) ? "financialDemand" : "financialRequirement",
      label: "דרישה כספית",
      value: cleanText(source.financialDemand) || cleanText(source.financialRequirement),
    },
    { key: "financialParticipation", label: "השתתפות כספית", value: contributionOf(source) },
  ].filter((field) => field.value);

  return {
    kind,
    title: anonymousTitle(source),
    subtitle: [city, occupation || institution].filter(Boolean).join(" · "),
    city,
    description,
    lookingFor,
    lookingForHeading: lookingForHeading(source.gender),
    percent: readPercent(source, extra),
    fields,
  };
};

// Survives navigation between the list and the detail page, so a profile we already
// saw stays available if a later payload omits those fields. Identity keys are never stored.
const remembered = new Map();

const remember = (userId, person) => {
  if (!userId || !person || typeof person !== "object") return;
  const prev = remembered.get(userId) || {};
  remembered.set(userId, { ...prev, ...publicFields(person) });
};

const mergePerson = (userId, person) => ({
  ...(userId ? remembered.get(userId) : null),
  ...publicFields(person),
});

export const buildSuggestionList = ({ matches = [], incoming = [], outgoing = [] } = {}) => {
  for (const match of matches) remember(idOf(match), match);
  for (const interest of incoming) remember(idOf(interest?.sender), interest?.sender);
  for (const interest of outgoing) remember(idOf(interest?.receiver), interest?.receiver);

  const taken = new Set();
  for (const interest of incoming) {
    const userId = idOf(interest?.sender);
    if (userId) taken.add(userId);
  }
  for (const interest of outgoing) {
    const userId = idOf(interest?.receiver);
    if (userId) taken.add(userId);
  }

  const items = [];

  for (const match of matches) {
    const userId = idOf(match);
    if (!userId || taken.has(userId)) continue;
    const person = mergePerson(userId, match);
    items.push({
      kind: "new",
      id: userId,
      userId,
      match,
      view: toSuggestionView(person, "new", match),
    });
  }

  for (const interest of outgoing) {
    if (interest?.status !== "pending") continue;
    const userId = idOf(interest?.receiver);
    const person = mergePerson(userId, interest?.receiver);
    items.push({
      kind: "sent",
      id: userId || idOf(interest),
      userId,
      interest,
      view: toSuggestionView(person, "sent", interest),
    });
  }

  for (const interest of incoming) {
    if (interest?.status !== "pending") continue;
    const userId = idOf(interest?.sender);
    const person = mergePerson(userId, interest?.sender);
    items.push({
      kind: "received",
      id: userId || idOf(interest),
      userId,
      interest,
      view: toSuggestionView(person, "received", interest),
    });
  }

  return items;
};

export const filterSuggestions = (items, { query = "", city = "", age = "", percent = "" } = {}) => {
  const needle = query.trim().toLowerCase();
  const minimum = percent ? Number(percent) : null;

  return items.filter((item) => {
    const view = item.view;
    if (city && view.city !== city) return false;
    if (age && !matchesAge(ageOf(item), age)) return false;

    if (minimum != null) {
      if (view.percent == null || view.percent < minimum) return false;
    }

    if (!needle) return true;
    const haystack = [view.title, view.subtitle, view.city, view.description, view.lookingFor, ...view.fields.map((field) => field.value)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
};

const ageOf = (item) => {
  const sources = [item.match, item.interest?.sender, item.interest?.receiver, item.person];
  for (const source of sources) {
    const text = cleanText(asPerson(source).age);
    if (!text) continue;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) return numeric;
  }
  const titled = item.view?.title?.match(/(\d+)/);
  return titled ? Number(titled[1]) : null;
};

const matchesAge = (age, filter) => {
  if (age == null) return false;
  if (filter === "31+") return age >= 31;
  const [min, max] = filter.split("-").map(Number);
  return age >= min && age <= max;
};

export const suggestionHref = (item, preview) => {
  const path = `/suggestions/${item.kind}/${encodeURIComponent(item.id)}`;
  return preview ? `${path}?preview=1` : path;
};

export const suggestionsHome = (preview) => (preview ? "/suggestions?preview=1" : "/suggestions");

// Kept for a defensive check: a view must not echo identifying strings.
export const identityLeak = (view, raw) => {
  const blob = JSON.stringify(view);
  const source = asPerson(raw);
  for (const key of IDENTITY_KEYS) {
    const value = cleanText(source[key]);
    if (value && blob.includes(value)) return key;
  }
  return "";
};
