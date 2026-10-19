import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSuggestionList, identityLeak } from "./suggestionView.js";

describe("suggestion list", () => {
  it("keeps a declined row without a name, photo, or contact", () => {
    const items = buildSuggestionList({
      newSuggestions: [{ _id: "a", age: 26, city: "ירושלים", gender: "male", matchPercent: 95, name: "סודי" }],
      sent: [],
      received: [],
      declined: [
        {
          status: "rejected",
          stage: "declined",
          declinedByViewer: true,
          sender: "viewer",
          receiver: {
            _id: "b",
            age: 28,
            gender: "male",
            city: "אלעד",
            maritalStatus: "single",
            financialDemand: 40,
            matchPercent: 88,
            name: "שם סודי",
            email: "secret@example.test",
            phone: "0500000000",
            image: "/api/files/b/image",
          },
        },
      ],
    });

    const declined = items.filter((item) => item.kind === "declined");
    assert.equal(declined.length, 1);
    assert.equal(declined[0].view.kind, "declined-self");
    assert.equal(declined[0].view.title, "בן 28");
    assert.equal(declined[0].view.percent, null);
    assert.equal(declined[0].view.city, "אלעד");
    assert.equal(identityLeak(declined[0].view, declined[0].interest.receiver), "");
    assert.equal(JSON.stringify(declined[0].view).includes("שם סודי"), false);
    assert.equal(JSON.stringify(declined[0].view).includes("secret@example.test"), false);

    const fresh = items.find((item) => item.kind === "new");
    assert.equal(fresh.view.percent, null);
    assert.equal(fresh.view.title, "בן 26");
    assert.equal(JSON.stringify(fresh.view).includes("סודי"), false);
  });
});
