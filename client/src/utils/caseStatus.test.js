import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CASE_WORK_TABS,
  DIRECTORY_TABS,
  adminStatusLabel,
  isOpenCase,
  matchesCaseWorkTab,
  matchesDirectoryTab,
  meetingLabel,
  normalizeCaseStatus,
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
