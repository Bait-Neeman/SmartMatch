import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_CASE_TABS,
  CASE_WORK_TABS,
  DIRECTORY_TABS,
  MATCHMAKER_CASE_TABS,
  adminStatusLabel,
  countByTab,
  groupFromCaseQuery,
  isOpenCase,
  matchesAdminCaseTab,
  matchesCaseWorkTab,
  matchesDirectoryTab,
  matchesMatchmakerTab,
  meetingLabel,
  normalizeCaseStatus,
  suggestionGroup,
  userStageLabel,
} from "./caseStatus.js";

describe("case status labels", () => {
  it("names the first meetings in words and later meetings by number", () => {
    assert.equal(meetingLabel(1), "פגישה ראשונה");
    assert.equal(meetingLabel(2), "פגישה שנייה");
    assert.equal(meetingLabel(3), "פגישה שלישית");
    assert.equal(meetingLabel(4), "פגישה 4");
    assert.equal(meetingLabel(12), "פגישה 12");
    assert.equal(adminStatusLabel("meeting", 2), "פגישה שנייה");
    assert.equal(adminStatusLabel("new"), "הועבר לשדכן");
    assert.equal(adminStatusLabel("coordinating"), "בתיאום פגישה");
    assert.equal(adminStatusLabel("ended"), "השידוך ירד");
    assert.equal(adminStatusLabel("engaged"), "התארסו");
  });

  it("shows the couple a short stage line, and congratulations when engaged", () => {
    assert.equal(userStageLabel("new"), "הועבר לשדכן");
    assert.equal(userStageLabel("meeting", 2), "פגישה שנייה");
    assert.equal(userStageLabel("ended"), "השידוך ירד");
    assert.equal(userStageLabel("engaged"), "מזל טוב, התארסתם");
  });

  it("reads old stored statuses without calling a closed case engaged", () => {
    assert.equal(normalizeCaseStatus("in_progress"), "coordinating");
    assert.equal(normalizeCaseStatus("closed"), "ended");
    assert.equal(adminStatusLabel("closed"), "השידוך ירד");
    assert.equal(adminStatusLabel("in_progress"), "בתיאום פגישה");
    assert.equal(isOpenCase("new"), true);
    assert.equal(isOpenCase("meeting"), true);
    assert.equal(isOpenCase("closed"), false);
    assert.equal(isOpenCase("engaged"), false);
  });
});

describe("directory and case tabs", () => {
  it("drops the active tab and keeps the four matchmaker tabs", () => {
    assert.deepEqual(
      DIRECTORY_TABS.map((tab) => tab.label),
      ["הכל", "בטיפול שדכן", "שידוכים שירדו", "מאורסים"]
    );
    assert.equal(
      DIRECTORY_TABS.some((tab) => tab.value === "active" || tab.label.includes("פעיל")),
      false
    );
  });

  it("filters people by the case they are in now", () => {
    assert.equal(matchesDirectoryTab("none", ""), true);
    assert.equal(matchesDirectoryTab("none", "in_process"), false);
    assert.equal(matchesDirectoryTab("none", "engaged"), false);
    assert.equal(matchesDirectoryTab("in_process", "in_process"), true);
    assert.equal(matchesDirectoryTab("ended", "ended"), true);
    assert.equal(matchesDirectoryTab("ended", "engaged"), false);
    assert.equal(matchesDirectoryTab("engaged", "engaged"), true);
    assert.equal(matchesDirectoryTab("engaged", "in_process"), false);
  });

  it("filters matchmaker cases by phase, including every meeting number", () => {
    assert.deepEqual(
      CASE_WORK_TABS.map((tab) => tab.value),
      ["", "new", "coordinating", "meeting", "ended", "engaged"]
    );
    assert.equal(matchesCaseWorkTab("meeting", "meeting"), true);
    assert.equal(matchesCaseWorkTab("coordinating", "meeting"), false);
    assert.equal(matchesCaseWorkTab("closed", "ended"), true);
    assert.equal(matchesCaseWorkTab("in_progress", "coordinating"), true);
    assert.equal(matchesCaseWorkTab("ended", "engaged"), false);
    assert.equal(matchesCaseWorkTab("new", ""), true);
  });
});

describe("admin suggestion grouping", () => {
  const rows = [
    { stage: "new", status: null },
    { stage: "interest", status: null },
    { stage: "active", status: null },
    { stage: "forwarded", status: null },
    { stage: "declined", status: null },
    { stage: "matchmaker", status: "new" },
    { stage: "matchmaker", status: "coordinating" },
    { stage: "matchmaker", status: "meeting", meetingNumber: 2 },
    { stage: "matchmaker", status: "in_progress" },
    { stage: "matchmaker", status: null },
    { stage: "matchmaker", status: "ended" },
    { stage: "matchmaker", status: "closed" },
    { stage: "matchmaker", status: "engaged" },
  ];

  it("keeps pre-matchmaker stages, and groups matchmaker cases by the new status", () => {
    assert.deepEqual(
      ADMIN_CASE_TABS.map((tab) => tab.label),
      [
        "הכל",
        "הצעה חדשה",
        "התעניינות",
        "אושרה הדדית",
        "ממתין לצד השני",
        "בטיפול שדכן",
        "שידוכים שירדו",
        "מאורסים",
        "נדחה",
      ]
    );
    assert.equal(ADMIN_CASE_TABS.some((tab) => tab.label.includes("פעיל")), false);
    assert.deepEqual(rows.map(suggestionGroup), [
      "new",
      "interest",
      "active",
      "forwarded",
      "declined",
      "in_process",
      "in_process",
      "in_process",
      "in_process",
      "in_process",
      "ended",
      "ended",
      "engaged",
    ]);
  });

  it("puts every row in one group, with ended and engaged out of בטיפול שדכן", () => {
    for (const row of rows) {
      const hits = ADMIN_CASE_TABS.filter((tab) => tab.value && matchesAdminCaseTab(row, tab.value));
      assert.equal(hits.length, 1, suggestionGroup(row));
    }
    const counts = countByTab(rows, ADMIN_CASE_TABS, matchesAdminCaseTab);
    assert.equal(counts[""], rows.length);
    assert.equal(counts.in_process, 5);
    assert.equal(counts.ended, 2);
    assert.equal(counts.engaged, 1);
    assert.equal(counts.forwarded, 1);
    assert.equal(matchesAdminCaseTab(rows[10], "in_process"), false);
    assert.equal(matchesAdminCaseTab(rows[11], "ended"), true);
    assert.equal(matchesAdminCaseTab(rows[11], "engaged"), false);
  });

  it("counts the matchmaker page by open, ended, and engaged", () => {
    assert.deepEqual(
      MATCHMAKER_CASE_TABS.map((tab) => tab.label),
      ["הכל", "בטיפול שדכן", "שידוכים שירדו", "מאורסים"]
    );
    assert.equal(MATCHMAKER_CASE_TABS.some((tab) => tab.label.includes("פעיל")), false);
    const cases = rows.filter((row) => row.stage === "matchmaker");
    const counts = countByTab(cases, MATCHMAKER_CASE_TABS, matchesMatchmakerTab);
    assert.equal(counts[""], cases.length);
    assert.equal(counts.in_process, 5);
    assert.equal(counts.ended, 2);
    assert.equal(counts.engaged, 1);
    assert.equal(matchesMatchmakerTab({ status: "closed" }, "in_process"), false);
    assert.equal(matchesMatchmakerTab({ status: "closed" }, "ended"), true);
  });

  it("reads an older cases link as the group that now holds that status", () => {
    assert.equal(groupFromCaseQuery({ status: "new" }), "in_process");
    assert.equal(groupFromCaseQuery({ status: "in_progress" }), "in_process");
    assert.equal(groupFromCaseQuery({ status: "closed" }), "ended");
    assert.equal(groupFromCaseQuery({ stage: "matchmaker", status: "engaged" }), "engaged");
    assert.equal(groupFromCaseQuery({ stage: "forwarded" }), "forwarded");
    assert.equal(groupFromCaseQuery({ group: "declined", status: "ended" }), "declined");
    assert.equal(groupFromCaseQuery({}), "");
  });
});
