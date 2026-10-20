// Labels for a matchmaker case. Meetings 1–3 are words; from 4 on, "פגישה N".
// Old stored values are accepted here so a stale payload still reads clearly:
// in_progress → coordinating, closed → ended (not engaged).

export const MAX_MEETING = 99;

export const meetingLabel = (meetingNumber) => {
  const n = Number(meetingNumber);
  if (n === 1) return "פגישה ראשונה";
  if (n === 2) return "פגישה שנייה";
  if (n === 3) return "פגישה שלישית";
  if (Number.isInteger(n) && n > 3) return `פגישה ${n}`;
  return "";
};

export const normalizeCaseStatus = (status) => {
  if (status === "in_progress") return "coordinating";
  if (status === "closed") return "ended";
  if (
    status === "new" ||
    status === "coordinating" ||
    status === "meeting" ||
    status === "ended" ||
    status === "engaged"
  ) {
    return status;
  }
  return "";
};

export const adminStatusLabel = (status, meetingNumber) => {
  const normalized = normalizeCaseStatus(status);
  if (normalized === "new") return "הועבר לשדכן";
  if (normalized === "coordinating") return "בתיאום פגישה";
  if (normalized === "meeting") return meetingLabel(meetingNumber) || "פגישה";
  if (normalized === "ended") return "השידוך ירד";
  if (normalized === "engaged") return "התארסו";
  return "";
};

export const userStageLabel = (status, meetingNumber) => {
  if (normalizeCaseStatus(status) === "engaged") return "מזל טוב, התארסתם";
  return adminStatusLabel(status, meetingNumber);
};

export const userStageTone = (status) => {
  const normalized = normalizeCaseStatus(status);
  if (normalized === "ended") return "neutral";
  if (normalized === "engaged") return "pending";
  if (normalized === "coordinating" || normalized === "meeting") return "progress";
  if (normalized === "new") return "received";
  return "";
};

export const isFinalCase = (status) => {
  const normalized = normalizeCaseStatus(status);
  return normalized === "ended" || normalized === "engaged";
};

export const isOpenCase = (status) => {
  const normalized = normalizeCaseStatus(status);
  return normalized === "new" || normalized === "coordinating" || normalized === "meeting";
};

export const nextMeetingCaption = (status, meetingNumber) => {
  const normalized = normalizeCaseStatus(status);
  if (normalized === "meeting" && Number(meetingNumber) >= 1) return "פגישה הבאה";
  return "פגישה ראשונה";
};

export const DIRECTORY_TABS = [
  { value: "", label: "הכל" },
  { value: "in_process", label: "בטיפול שדכן" },
  { value: "ended", label: "שידוכים שירדו" },
  { value: "engaged", label: "מאורסים" },
];

export const matchesDirectoryTab = (userStatus, tab) => {
  if (!tab) return true;
  return userStatus === tab;
};

export const CASE_WORK_TABS = [
  { value: "", label: "כל התיקים" },
  { value: "new", label: "הועבר לשדכן" },
  { value: "coordinating", label: "בתיאום פגישה" },
  { value: "meeting", label: "פגישות" },
  { value: "ended", label: "שידוכים שירדו" },
  { value: "engaged", label: "מאורסים" },
];

export const matchesCaseWorkTab = (status, tab) => {
  if (!tab) return true;
  return normalizeCaseStatus(status) === tab;
};

// One group per row. A matchmaker case is never also counted as an earlier stage.
// Open cases (הועבר לשדכן, בתיאום פגישה, פגישה N, and a legacy in_progress) share
// בטיפול שדכן. Ended, including a legacy closed, is only שידוכים שירדו.
const PRE_MATCHMAKER_GROUPS = new Set(["new", "interest", "active", "forwarded", "declined"]);

export const ADMIN_CASE_TABS = [
  { value: "", label: "הכל" },
  { value: "new", label: "הצעה חדשה" },
  { value: "interest", label: "התעניינות" },
  { value: "active", label: "אושרה הדדית" },
  { value: "forwarded", label: "ממתין לצד השני" },
  { value: "in_process", label: "בטיפול שדכן" },
  { value: "ended", label: "שידוכים שירדו" },
  { value: "engaged", label: "מאורסים" },
  { value: "declined", label: "נדחה" },
];

export const MATCHMAKER_CASE_TABS = [
  { value: "", label: "הכל" },
  { value: "in_process", label: "בטיפול שדכן" },
  { value: "ended", label: "שידוכים שירדו" },
  { value: "engaged", label: "מאורסים" },
];

export const suggestionGroup = (item) => {
  if (!item || typeof item !== "object") return "";
  const matchmaker = item.stage === "matchmaker" || item.manageable === true;
  if (matchmaker) {
    const status = normalizeCaseStatus(item.status);
    if (status === "ended") return "ended";
    if (status === "engaged") return "engaged";
    return "in_process";
  }
  return PRE_MATCHMAKER_GROUPS.has(item.stage) ? item.stage : "";
};

export const matchesAdminCaseTab = (item, tab) => {
  if (!tab) return true;
  return suggestionGroup(item) === tab;
};

export const matchesMatchmakerTab = (item, tab) => {
  if (!tab) return true;
  return suggestionGroup({ ...item, stage: "matchmaker", manageable: true }) === tab;
};

export const countByTab = (items, tabs, matches) => {
  const counts = {};
  for (const tab of tabs) {
    counts[tab.value] = items.filter((item) => matches(item, tab.value)).length;
  }
  return counts;
};

// Old links used ?status=new for a fresh matchmaker case and ?stage= for the interest stage.
export const groupFromCaseQuery = ({ group, stage, status } = {}) => {
  if (group) return group;
  const normalized = normalizeCaseStatus(status);
  if (normalized === "ended") return "ended";
  if (normalized === "engaged") return "engaged";
  if (normalized) return "in_process";
  if (stage === "matchmaker") return "in_process";
  if (PRE_MATCHMAKER_GROUPS.has(stage)) return stage;
  return "";
};
