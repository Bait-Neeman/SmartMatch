import { AutoAwesome, Close, HourglassTop, WorkspacePremium } from "@mui/icons-material";
import { adminStatusLabel } from "../../utils/caseStatus.js";

export const CASE_STATUS = {
  new: { tone: "received", label: "הועבר לשדכן", Icon: AutoAwesome },
  coordinating: { tone: "progress", label: "בתיאום פגישה", Icon: HourglassTop },
  meeting: { tone: "matchmaker", label: "פגישה", Icon: HourglassTop },
  ended: { tone: "neutral", label: "השידוך ירד", Icon: Close },
  engaged: { tone: "pending", label: "התארסו", Icon: WorkspacePremium },
};

export const CANDIDATE_STATUS = {
  in_process: { tone: "progress", label: "בטיפול שדכן", Icon: HourglassTop },
  ended: { tone: "neutral", label: "השידוך ירד", Icon: Close },
  engaged: { tone: "pending", label: "מאורס/ת", Icon: WorkspacePremium },
};

export const casePill = (status, meetingNumber) => {
  const meta = CASE_STATUS[status] || CASE_STATUS.new;
  const label = adminStatusLabel(status, meetingNumber) || meta.label;
  return { ...meta, label };
};

export const formatDotDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
};

export const todayLine = (date = new Date()) => {
  const weekday = new Intl.DateTimeFormat("he-IL", { weekday: "long" }).format(date);
  return `${weekday} · ${formatDotDate(date)}`;
};

export const greeting = (name, date = new Date()) => {
  const hour = date.getHours();
  const hello =
    hour < 5 || hour >= 21 ? "לילה טוב" : hour < 12 ? "בוקר טוב" : hour < 17 ? "צהריים טובים" : "ערב טוב";
  const clean = String(name || "").trim();
  return clean ? `${hello}, ${clean}` : hello;
};

export const freshCaseLine = (count) => {
  if (!count) return "אין תיקים חדשים שממתינים לך.";
  if (count === 1) return "תיק חדש אחד ממתין לך.";
  return `${count} תיקים חדשים ממתינים לך.`;
};

export const monthTrend = (count) => (count > 0 ? `+${count} החודש` : "0 החודש");

export const freshTrend = (count) => (count === 1 ? "חדשה אחת" : `${count} חדשות`);

export const closedTrend = (count) => (count > 0 ? "מזל טוב!" : "אין עדיין");

export const endedTrend = (count) => (count > 0 ? "הסתיימו" : "אין עדיין");

export const formatHistoryWhen = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDotDate(date)} · ${hours}:${minutes}`;
};

export const historyWho = (entry) => {
  if (entry?.source === "migration") return "מיגרציה";
  const name = entry?.changedBy?.name;
  if (entry?.source === "autoClose") return name ? `${name} · סגירה אוטומטית` : "סגירה אוטומטית";
  return name || "שדכן";
};

export const SUGGESTION_STAGE = {
  new: { tone: "pending", label: "הצעה חדשה" },
  interest: { tone: "received", label: "התעניינות" },
  active: { tone: "accepted", label: "אושרה הדדית" },
  forwarded: { tone: "forwarded", label: "הועבר לשדכן" },
  matchmaker: { tone: "matchmaker", label: "בטיפול שדכן" },
  declined: { tone: "rejected", label: "נדחה" },
};

export const partyLine = (party) => {
  if (!party) return "";
  const noun = party.gender === "female" ? "בת" : party.gender === "male" ? "בן" : "";
  const age = party.age != null && party.age !== "" ? `${noun ? `${noun} ` : ""}${party.age}` : "";
  return [age, party.city].filter(Boolean).join(" · ");
};

export const displayName = (party, reveal) => {
  if (reveal && party?.name) return party.name;
  if (party?.gender === "female") return "מועמדת";
  if (party?.gender === "male") return "מועמד";
  return "מועמד/ת";
};

// Yeshiva for a man, seminar for a woman. The other institution is not a fallback.
export const institutionLine = (profile) => {
  if (!profile) return "";
  if (profile.gender === "female") return profile.seminar || "";
  if (profile.gender === "male") return profile.yeshiva || "";
  return "";
};

export const EMPTY_NOTE = "הועבר לטיפול – שני הצדדים אישרו.";
