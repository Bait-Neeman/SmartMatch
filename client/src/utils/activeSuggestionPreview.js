import { idOf } from "./suggestionView.js";

// Dev-only fixtures for /active?preview=1. Loaded with a dynamic import behind
// import.meta.env.DEV so this file stays out of the production bundle.
// Rows that are not an accepted stage carry a name, phone, photo, and resume on purpose
// so the view can prove those values stay off the screen. Phone stays off after approval too.

const DESCRIPTION =
  "בחור שמח ורציני, עם לב פתוח ויחס חם לכל אדם. לומד בבוקר בכולל ועובד אחר הצהריים כמפתח תוכנה, ומשתדל לשלב בין עולם התורה לפרנסה בצורה מכובדת. אוהב שיחות עומק, טיולים בטבע ומוזיקה יהודית. בבית ההורים ידוע כמי שתמיד נותן יד – בעזרה לאחים הקטנים, בחסד ובארגון שבתות משפחתיות. חברים מתארים אותי כאדם יציב, אחראי וסבלני, עם חוש הומור עדין.";

const LOOKING_FOR =
  "מחפש בת זוג עם מידות טובות, רגישה ושמחה, שרואה בבניית בית של תורה ערך מרכזי. חשוב לי שתהיה פתוחה לשיחה כנה, בעלת שאיפות אישיות ואכפתיות למשפחה ולסביבה. אשמח למישהי שמעריכה פשטות ושלום בית, אוהבת לארח, ושנוכל לצמוח יחד – גם ברוחניות וגם בחיים המעשיים. מקום מגורים גמיש, העיקר האווירה בבית.";

const leak = (id, stage) => ({
  _id: id,
  stage,
  age: 41,
  city: "עיר חסויה",
  gender: "male",
  occupation: "עיסוק חסוי",
  description: "טקסט שאינו אמור להופיע לפני אישור",
  name: "זהותחסויה בדיקה",
  email: "leak-check@invalid.test",
  phone: "059-111-2222",
  image: "/api/files/leak-secret-file/image",
  resumePdf: "/api/files/leak-secret-file/resume",
  resumeSize: 12345,
  resumeUploadedAt: "2026-01-01T12:00:00.000Z",
  contact: { phone: "059-111-2222", email: "leak-check@invalid.test" },
  viewerForwarded: false,
  otherForwarded: false,
});

const person = (fields) => ({
  gender: "male",
  description: DESCRIPTION,
  lookingFor: LOOKING_FOR,
  height: 178,
  ethnicity: "ashkenazi",
  maritalStatus: "single",
  ...fields,
});

const initialPayload = () => ({
  newSuggestions: [leak("leak-new", "new")],
  sent: [leak("leak-sent", "sent")],
  received: [leak("leak-received", "received")],
  interests: [leak("leak-interests", "received")],
  active: [
    person({
      _id: "user-yosi",
      stage: "accepted",
      viewerForwarded: false,
      otherForwarded: false,
      name: "יוסי כהן",
      phone: "052-430-1187",
      age: 27,
      city: "מודיעין עילית",
      yeshiva: "ישיבה גבוהה",
      occupation: "עובד בהייטק",
      matchPercent: 93,
      image: "/api/files/user-yosi/image",
      resumePdf: "/api/files/user-yosi/resume",
      resumeSize: 217088,
      resumeUploadedAt: "2026-10-09T12:00:00.000Z",
    }),
    person({
      _id: "user-moshe",
      stage: "other-forwarded",
      viewerForwarded: false,
      otherForwarded: true,
      name: "משה לוי",
      phone: "053-220-4410",
      age: 29,
      city: "בית שמש",
      occupation: "עובד בהייטק",
      height: 180,
      matchPercent: 89,
      image: "/api/files/user-moshe/image",
      resumePdf: "/api/files/user-moshe/resume",
      resumeSize: 184320,
      resumeUploadedAt: "2026-10-08T12:00:00.000Z",
    }),
    person({
      _id: "user-arye",
      stage: "forwarded",
      viewerForwarded: true,
      otherForwarded: false,
      name: "אריה פרידמן",
      phone: "054-700-2211",
      age: 28,
      city: "בני ברק",
      occupation: "אברך",
      matchPercent: 91,
      image: "/api/files/user-arye/image",
      resumePdf: "/api/files/user-arye/resume",
      resumeSize: 102400,
      resumeUploadedAt: "2026-10-10T12:00:00.000Z",
    }),
    leak("leak-in-active", "sent"),
    leak("leak-no-stage", ""),
    leak("leak-bad-case", "Accepted"),
  ],
  matchmaker: [
    person({
      _id: "user-dan",
      stage: "matchmaker",
      viewerForwarded: true,
      otherForwarded: true,
      name: "דן לוי",
      phone: "058-333-9090",
      age: 27,
      city: "בית שמש",
      yeshiva: "ישיבה גבוהה",
      occupation: "ישיבה גבוהה",
      matchPercent: 88,
      image: "/api/files/user-dan/image",
      resumePdf: "/api/files/user-dan/resume",
      resumeSize: 153600,
      resumeUploadedAt: "2026-10-12T12:00:00.000Z",
    }),
  ],
});

let payload = initialPayload();
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

const mapBuckets = (data, mapper) => {
  const next = { ...data };
  for (const key of ["active", "matchmaker", "accepted", "interests", "sent", "received", "newSuggestions"]) {
    if (!Array.isArray(next[key])) continue;
    next[key] = next[key].map(mapper).filter(Boolean);
  }
  return next;
};

export const subscribePreview = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPreviewPayload = () => payload;

export const forwardPreview = (userId) => {
  payload = mapBuckets(payload, (person) => {
    if (idOf(person) !== userId) return person;
    const other = person.otherForwarded === true || person.stage === "other-forwarded" || person.stage === "matchmaker";
    return {
      ...person,
      stage: other ? "matchmaker" : "forwarded",
      viewerForwarded: true,
      otherForwarded: other,
    };
  });
  emit();
};

export const declinePreview = (userId) => {
  payload = mapBuckets(payload, (person) => (idOf(person) === userId ? null : person));
  emit();
};
