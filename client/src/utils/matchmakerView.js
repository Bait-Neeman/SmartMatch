import { idOf } from "./suggestionView.js";
import { toActiveView } from "./activeSuggestionView.js";

// GET /suggestions puts a row in `matchmaker` only after both sides have forwarded.
// Name and photo stay on the view the active page already builds for an accepted match.
// Email, phone, national ID, and anything else that view does not copy stay off this page.
const bothForwarded = (person) =>
  person?.stage === "matchmaker" && person.viewerForwarded !== false && person.otherForwarded !== false;

export const buildMatchmakerItems = (data) => {
  const rows = Array.isArray(data?.matchmaker) ? data.matchmaker : [];
  const seen = new Set();
  const items = [];

  for (const person of rows) {
    if (!bothForwarded(person)) continue;
    const view = toActiveView(person);
    const userId = idOf(person);
    if (!view || view.kind !== "matchmaker" || !view.revealed || !userId || seen.has(userId)) continue;
    seen.add(userId);
    items.push({ id: userId, userId, view });
  }

  return items;
};

export const matchmakerHref = (item) => `/matchmaker/${encodeURIComponent(item.id)}`;

export const matchmakerHome = () => "/matchmaker";
