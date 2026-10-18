import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hiddenPreferenceEmptyText, hiddenPreferenceSummary } from "./hiddenByPreference.js";

describe("hidden preference copy", () => {
  it("stays quiet when nobody was hidden", () => {
    assert.equal(hiddenPreferenceSummary(null), "");
    assert.equal(hiddenPreferenceSummary({ total: 0, age: 2 }), "");
    assert.equal(hiddenPreferenceEmptyText({ total: 0 }), "");
  });

  it("names the filters that hid people, and nothing else", () => {
    const hidden = { total: 1, age: 1, city: 0, height: 0 };
    assert.equal(hiddenPreferenceSummary(hidden), "ההעדפות שלך הסתירו אדם אחד (גיל 1).");
    assert.equal(
      hiddenPreferenceEmptyText(hidden),
      "ההעדפות שלך הסתירו אדם אחד (גיל 1). אפשר לעדכן את ההעדפות כדי לראות אותו."
    );
    assert.equal(
      hiddenPreferenceSummary({ total: 4, age: 2, city: 3, financialDemand: 1 }),
      "ההעדפות שלך הסתירו 4 אנשים (גיל 2, עיר 3, דרישה כספית 1)."
    );
  });
});
