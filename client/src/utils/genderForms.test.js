import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPreferenceFields, buildProfileFields, normalizeIsraeliMobile } from "./genderForms.js";

describe("contact phone", () => {
  it("normalizes an Israeli mobile and rejects anything else", () => {
    assert.equal(normalizeIsraeliMobile("+972-52-123-4567"), "0521234567");
    assert.equal(normalizeIsraeliMobile("052 123 4567"), "0521234567");
    assert.equal(normalizeIsraeliMobile("(052)1234567"), "0521234567");
    assert.equal(normalizeIsraeliMobile("521234567"), "0521234567");
    assert.equal(normalizeIsraeliMobile("03-1234567"), "");
    assert.equal(normalizeIsraeliMobile("not-a-phone"), "");
    assert.equal(normalizeIsraeliMobile(""), "");
  });

  it("sends the phone for both genders and leaves the other gender's fields out", () => {
    const male = buildProfileFields({ gender: "male", age: 30, yeshiva: "חברון", phone: "052-111-2233", occupation: "מלמד" });
    assert.equal(male.phone, "052-111-2233");
    assert.equal(male.yeshiva, "חברון");
    assert.equal(Object.hasOwn(male, "occupation"), false);

    const female = buildProfileFields({
      gender: "female",
      age: 24,
      occupation: "הוראה",
      phone: "+972 54 222 3344",
      working: false,
      workplace: "גן",
    });
    assert.equal(female.phone, "+972 54 222 3344");
    assert.equal(female.occupation, "הוראה");
    assert.equal(female.workplace, "");
    assert.equal(Object.hasOwn(female, "yeshiva"), false);
  });

  it("does not send older preference fields the form no longer shows", () => {
    const fields = buildPreferenceFields(
      { ageMin: 20, ageMax: 30, preferredSeminar: ["ישיבת חברון", "חברון"], preferredEthnicity: "ashkenazi", financialMin: 5 },
      "male"
    );
    assert.deepEqual(fields.preferredSeminar, ["ישיבת חברון"]);
    assert.equal(Object.hasOwn(fields, "preferredEthnicity"), false);
    assert.equal(Object.hasOwn(fields, "financialMin"), false);
  });
});
