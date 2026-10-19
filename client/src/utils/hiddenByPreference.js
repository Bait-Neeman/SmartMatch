// Counts only. The server never sends a name or id in this object.
const FILTERS = [
  ["age", "גיל"],
  ["height", "גובה"],
  ["city", "עיר"],
  ["style", "סגנון"],
  ["appearance", "מראה"],
  ["maritalStatus", "סטטוס"],
  ["ethnicity", "עדה"],
  ["institution", "מוסד"],
  ["profession", "מקצוע"],
  ["working", "עבודה"],
  ["workingInProfession", "מקצוע נלמד"],
  ["financialStatus", "מצב כלכלי"],
  ["financialDemand", "דרישה כספית"],
  ["missing", "חסרים פרטים"],
];

export const hiddenPreferenceSummary = (hidden) => {
  const total = Number(hidden?.total);
  if (!Number.isFinite(total) || total <= 0) return "";
  const parts = FILTERS.filter(([key]) => Number(hidden[key]) > 0).map(([key, label]) => `${label} ${hidden[key]}`);
  const people = total === 1 ? "אדם אחד" : `${total} אנשים`;
  const detail = parts.length ? ` (${parts.join(", ")})` : "";
  return `ההעדפות שלך הסתירו ${people}${detail}.`;
};

export const hiddenPreferenceEmptyText = (hidden) => {
  const summary = hiddenPreferenceSummary(hidden);
  if (!summary) return "";
  const pronoun = Number(hidden.total) === 1 ? "אותו" : "אותם";
  return `${summary} אפשר לעדכן את ההעדפות כדי לראות ${pronoun}.`;
};
