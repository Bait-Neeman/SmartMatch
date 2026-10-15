import { toSafeFileUrl } from "./files.js";
import {
  anonymousTitle,
  cleanText,
  idOf,
  institutionOf,
  toSuggestionView,
} from "./suggestionView.js";

// Identity is rendered only for these stages. `active` is the server's name for a
// mutually approved match that nobody has forwarded yet; `accepted` is the same place
// in the shape described for this page.
const REVEALED_STAGES = new Set(["accepted", "active", "forwarded", "other-forwarded", "matchmaker"]);

const KIND_OF = {
  accepted: "accepted",
  active: "accepted",
  forwarded: "forwarded",
  "other-forwarded": "other-forwarded",
  matchmaker: "matchmaker",
};

const MARITAL = {
  single: { male: "רווק", female: "רווקה" },
  divorced: { male: "גרוש", female: "גרושה" },
  widowed: { male: "אלמן", female: "אלמנה" },
};

const BUCKETS = ["active", "matchmaker", "accepted"];

const textOf = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  return cleanText(value);
};

const genderOf = (person) => {
  const gender = textOf(person?.gender);
  return gender === "male" || gender === "female" ? gender : "";
};

const maritalOf = (person) => {
  const label = MARITAL[textOf(person?.maritalStatus)];
  if (!label) return "";
  return label[genderOf(person)] || `${label.male}/${label.female}`;
};

const fileOf = (person, keys) => {
  for (const key of keys) {
    const url = toSafeFileUrl(textOf(person?.[key]));
    if (url) return url;
  }
  return "";
};

export const isRevealedStage = (stage) => REVEALED_STAGES.has(stage);

export const formatResumeSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return "";
  if (size < 1024) return `${Math.round(size)}B`;
  return `${Math.max(1, Math.round(size / 1024))}KB`;
};

export const formatResumeDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
};

const revealedTitle = (person, name) => {
  const anonymous = anonymousTitle(person);
  if (!name) return anonymous;
  if (!anonymous || anonymous === "הצעה") return name;
  return `${name}, ${anonymous}`;
};

// Returns null unless this row is a mutually approved stage. Name, phone, photo,
// and resume are copied only in that case, and only from the fields the server sends.
export const toActiveView = (person) => {
  if (!person || typeof person !== "object") return null;
  const stage = textOf(person.stage);
  if (!isRevealedStage(stage)) return null;

  const kind = KIND_OF[stage];
  const base = toSuggestionView(person, kind, person);
  const gender = genderOf(person);
  const name = textOf(person.name);
  const phone = textOf(person.phone);
  const city = cleanText(base.city) || textOf(person.city);
  const institution = institutionOf(person);
  const occupation = textOf(person.occupation);
  const fields = base.fields.map((field) =>
    field.key === "institution" ? { ...field, label: "מוסד" } : field
  );
  const marital = maritalOf(person);
  if (marital) {
    const cityIndex = fields.findIndex((field) => field.key === "city");
    fields.splice(cityIndex >= 0 ? cityIndex + 1 : fields.length, 0, {
      key: "maritalStatus",
      label: "סטטוס",
      value: marital,
    });
  }
  const demand = textOf(person.financialDemand);
  if (demand && !fields.some((field) => field.key === "financialRequirement" || field.key === "financialDemand")) {
    fields.push({ key: "financialDemand", label: "דרישה כספית", value: demand });
  }
  if (phone) fields.push({ key: "phone", label: "טלפון", value: phone });

  const viewerForwarded = person.viewerForwarded === true || stage === "forwarded" || stage === "matchmaker";
  const otherForwarded = person.otherForwarded === true || stage === "other-forwarded" || stage === "matchmaker";

  return {
    ...base,
    kind,
    stage,
    revealed: true,
    gender,
    name,
    title: revealedTitle(person, name),
    subtitle: [city, institution || occupation].filter(Boolean).join(" · "),
    fields,
    phone,
    image: fileOf(person, ["image", "photo", "photoUrl", "imageUrl"]),
    resumePdf: fileOf(person, ["resumePdf", "resumeUrl", "resume"]),
    resumeSize: Number.isFinite(Number(person.resumeSize)) ? Number(person.resumeSize) : null,
    resumeUploadedAt: person.resumeUploadedAt || "",
    viewerForwarded,
    otherForwarded,
  };
};

const rowsOf = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const present = BUCKETS.filter((key) => Array.isArray(data[key]));
  if (present.length > 0) return present.flatMap((key) => data[key]);
  return Array.isArray(data.interests) ? data.interests : [];
};

export const buildActiveItems = (data) => {
  const seen = new Set();
  const items = [];
  for (const person of rowsOf(data)) {
    const view = toActiveView(person);
    const userId = idOf(person);
    if (!view || !userId || seen.has(userId)) continue;
    seen.add(userId);
    items.push({ id: userId, userId, view });
  }
  return items;
};

export const otherForwardedBanner = (view) => {
  if (view?.kind !== "other-forwarded") return undefined;
  const first = textOf(view.name).split(/\s+/)[0];
  const verb = view.gender === "female" ? "העבירה" : view.gender === "male" ? "העביר" : "העביר/ה";
  return `${first || "הצד השני"} ${verb} את ההצעה לטיפול שדכן. אפשר להעביר גם כדי שהשדכן יתחיל לטפל.`;
};

export const canForward = (view) => Boolean(view?.revealed && !view.viewerForwarded && view.kind !== "matchmaker");

export const activeHref = (item, preview) => {
  const path = `/active/${encodeURIComponent(item.id)}`;
  return preview ? `${path}?preview=1` : path;
};

export const activeHome = (preview) => (preview ? "/active?preview=1" : "/active");
