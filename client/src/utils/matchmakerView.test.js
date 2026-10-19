import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildActiveItems } from "./activeSuggestionView.js";
import { buildMatchmakerItems } from "./matchmakerView.js";

const revealed = {
  _id: "user-dan",
  stage: "matchmaker",
  viewerForwarded: true,
  otherForwarded: true,
  name: "דן לוי",
  age: 27,
  gender: "male",
  city: "בית שמש",
  occupation: "ישיבה גבוהה",
  phone: "058-333-9090",
  email: "dan@example.test",
  idNumber: "123456782",
  password: "secret-pass",
  image: "/api/files/user-dan/image",
  resumePdf: "/api/files/user-dan/resume",
  contact: "058-333-9090",
};

describe("matchmaker page rows", () => {
  it("keeps a row only when both sides forwarded", () => {
    const items = buildMatchmakerItems({
      active: [
        { ...revealed, _id: "still-active", stage: "active", viewerForwarded: false, otherForwarded: false },
        { ...revealed, _id: "waiting", stage: "forwarded", viewerForwarded: true, otherForwarded: false },
        { ...revealed, _id: "their-turn", stage: "other-forwarded", viewerForwarded: false, otherForwarded: true },
      ],
      matchmaker: [
        revealed,
        { ...revealed, _id: "user-dan" },
        { ...revealed, _id: "not-yet", viewerForwarded: false },
        { ...revealed, _id: "declined", stage: "declined" },
        { age: 20, stage: "matchmaker" },
      ],
    });

    assert.equal(items.length, 1);
    assert.equal(items[0].id, "user-dan");
    assert.equal(items[0].view.kind, "matchmaker");
    assert.equal(items[0].view.revealed, true);
    assert.equal(items[0].view.name, "דן לוי");
    assert.equal(items[0].view.title.includes("דן לוי"), true);
    assert.equal(items[0].view.image, "/api/files/user-dan/image");
    assert.equal(items[0].view.phone, undefined);
    assert.equal(JSON.stringify(items[0]).includes("058-333-9090"), false);
    assert.equal(items[0].view.resumePdf, "/api/files/user-dan/resume");
    assert.equal(Object.hasOwn(items[0].view, "phone"), false);
    assert.equal(items[0].view.fields.some((field) => field.key === "phone"), false);
  });

  it("does not copy identity the accepted view leaves out", () => {
    const [item] = buildMatchmakerItems({ matchmaker: [revealed] });
    const blob = JSON.stringify(item);

    assert.equal(blob.includes("dan@example.test"), false);
    assert.equal(blob.includes("058-333-9090"), false);
    assert.equal(blob.includes("123456782"), false);
    assert.equal(blob.includes("secret-pass"), false);
    assert.equal(Object.hasOwn(item.view, "email"), false);
    assert.equal(Object.hasOwn(item.view, "idNumber"), false);
    assert.equal(Object.hasOwn(item.view, "password"), false);
    assert.equal(Object.hasOwn(item.view, "contact"), false);
  });

  it("shows the current matchmaker stage and leaves the case note off the view", () => {
    const [meeting] = buildMatchmakerItems({
      matchmaker: [
        {
          ...revealed,
          caseStatus: "meeting",
          meetingNumber: 2,
          note: "SECRET-ADMIN-NOTE",
          history: [{ changedBy: "הרב", status: "meeting" }],
        },
      ],
    });
    assert.equal(meeting.view.statusLabel, "פגישה שנייה");
    assert.equal(meeting.view.caseStatus, "meeting");
    assert.equal(JSON.stringify(meeting).includes("SECRET-ADMIN-NOTE"), false);
    assert.equal(JSON.stringify(meeting).includes("history"), false);

    const [ended] = buildMatchmakerItems({
      matchmaker: [{ ...revealed, caseStatus: "ended" }],
    });
    assert.equal(ended.view.statusLabel, "השידוך ירד");

    const [engaged] = buildMatchmakerItems({
      matchmaker: [{ ...revealed, caseStatus: "engaged" }],
    });
    assert.equal(engaged.view.statusLabel, "מזל טוב, התארסתם");
    assert.equal(JSON.stringify(engaged).includes("dan@example.test"), false);
  });

  it("leaves matchmaker rows off the active suggestions list", () => {
    const items = buildActiveItems({
      active: [
        { ...revealed, _id: "open", stage: "active", name: "יוסי כהן", viewerForwarded: false, otherForwarded: false },
        { ...revealed, _id: "already-both", stage: "matchmaker" },
      ],
      matchmaker: [revealed],
    });

    assert.deepEqual(
      items.map((item) => item.id),
      ["open"]
    );
  });
});
