import { labelOf, maritalStatusOptions } from "../constants/profileOptions.js";
import {
  anonymousTitle,
  cleanText,
  communityOf,
  idOf,
  readPercent,
  toSuggestionView,
} from "./suggestionView.js";

// Home cards may show only these facts before mutual approval.
// Institution, description, and looking-for stay off this page.
// Name, email, phone, photo, resume, contact, and ID number are never copied.
const LINE_ORDER = [
  "community",
  "occupation",
  "height",
  "maritalStatus",
  "financialDemand",
  "financialRequirement",
  "financialParticipation",
  "financialStatus",
];

const HEBREW_ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const HEBREW_TENS = ["", "י", "כ", "ל"];

const heightLabel = (person) => {
  const numeric = Number(person?.height);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  if (numeric >= 100) return `${Math.round(numeric)} ס"מ`;
  return String(numeric);
};

const moneyIndex = (person) => {
  const numeric = Number(person?.financialStatus);
  if (!Number.isFinite(numeric)) return "";
  return String(numeric);
};

// Day of the month as Hebrew letters, the way the approved home writes the date.
export const hebrewNumeral = (value) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 30) return "";
  if (number === 15) return "טו";
  if (number === 16) return "טז";
  const letters = `${HEBREW_TENS[Math.floor(number / 10)]}${HEBREW_ONES[number % 10]}`;
  if (letters.length < 2) return `${letters}\u05F3`;
  return `${letters.slice(0, -1)}\u05F4${letters.slice(-1)}`;
};

export const hebrewDateLine = (date = new Date()) => {
  const weekday = new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    timeZone: "Asia/Jerusalem",
  }).format(date);
  const parts = new Intl.DateTimeFormat("he-IL-u-ca-hebrew", {
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jerusalem",
  }).formatToParts(date);
  const day = hebrewNumeral(parts.find((part) => part.type === "day")?.value);
  const month = cleanText(parts.find((part) => part.type === "month")?.value);
  const monthLabel = month.startsWith("ב") ? month : `ב${month}`;
  return `${weekday} · ${day} ${monthLabel}`;
};

export const greetingName = (name) => {
  const clean = cleanText(name);
  if (!clean) return "";
  return clean.split(/\s+/)[0];
};

export const greetingLine = (name) => {
  const first = greetingName(name);
  return first ? `שלום ${first},` : "שלום,";
};

// GET /suggestions does not store a "chosen on" date. The live new-suggestion
// list is what the system has currently chosen for this user.
export const weeklyNewLine = (count) => {
  const total = Number.isFinite(Number(count)) ? Math.max(0, Math.round(Number(count))) : 0;
  if (total === 0) return "אין הצעות חדשות השבוע. הצעות חדשות נבחרות בהתאם להעדפות שלך.";
  if (total === 1) return "הצעה חדשה אחת נבחרה עבורך השבוע, בהתאם להעדפות שלך.";
  return `${total} הצעות חדשות נבחרו עבורך השבוע, בהתאם להעדפות שלך.`;
};

export const homeCounts = (lists) => {
  const fresh = Array.isArray(lists?.newSuggestions) ? lists.newSuggestions.length : 0;
  return {
    fresh,
    received: Array.isArray(lists?.received) ? lists.received.length : 0,
    active: Array.isArray(lists?.active) ? lists.active.length : 0,
    matchmaker: Array.isArray(lists?.matchmaker) ? lists.matchmaker.length : 0,
    weekly: fresh,
  };
};

const lineFromView = (view, key) => view.fields.find((field) => field.key === key) || null;

export const toHomeCard = (person) => {
  const view = toSuggestionView(person, "new");
  const lines = [];

  for (const key of LINE_ORDER) {
    if (key === "height") {
      const value = heightLabel(person);
      if (value) lines.push({ key, label: "גובה", value });
      continue;
    }
    if (key === "community") {
      const value = communityOf(person);
      if (value) lines.push({ key, label: "עדה", value });
      continue;
    }
    if (key === "maritalStatus") {
      const value = labelOf(maritalStatusOptions, person?.maritalStatus);
      if (cleanText(value)) lines.push({ key, label: "סטטוס משפחתי", value });
      continue;
    }
    if (key === "financialStatus") {
      const value = moneyIndex(person);
      if (value) lines.push({ key, label: "מדד כספי", value });
      continue;
    }
    const field = lineFromView(view, key);
    if (field?.value) lines.push({ key: field.key, label: field.label, value: field.value });
  }

  return {
    title: anonymousTitle(person) || view.title,
    city: view.city,
    percent: readPercent(person),
    lines,
  };
};

export const toHomeCards = (suggestions) => {
  if (!Array.isArray(suggestions)) return [];
  const cards = [];
  for (const person of suggestions) {
    const id = idOf(person);
    if (!id) continue;
    cards.push({ id, ...toHomeCard(person) });
  }
  return cards;
};
