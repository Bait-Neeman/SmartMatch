import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPreferenceFields,
  buildProfileFields,
  EXCLUDE_INCOMPLETE_HELP,
  EXCLUDE_INCOMPLETE_LABEL,
  EXCLUDE_INCOMPLETE_WARNING,
  normalizeIsraeliMobile,
} from "./genderForms.js";

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

  it("sends community as a list and leaves the financial range untouched", () => {
    const fields = buildPreferenceFields(
      {
        ageMin: 20,
        ageMax: 30,
        preferredSeminar: ["ישיבת חברון", "חברון"],
        preferredEthnicity: "ashkenazi",
        financialMin: 5,
        excludeIncomplete: "yes",
      },
      "male"
    );
    assert.deepEqual(fields.preferredSeminar, ["ישיבת חברון"]);
    assert.deepEqual(fields.preferredEthnicity, ["ashkenazi"]);
    assert.equal(fields.excludeIncomplete, false);
    assert.equal(Object.hasOwn(fields, "financialMin"), false);
  });

  it("keeps the incomplete-details copy, with the box off unless it is exactly true", () => {
    assert.equal(EXCLUDE_INCOMPLETE_LABEL, "אני לא רוצה שיוצגו לי הצעות שחסרים בהן פרטים");
    assert.equal(EXCLUDE_INCOMPLETE_HELP, "כברירת מחדל מוצגות גם הצעות שלא מולאו בהן כל הפרטים.");
    assert.equal(EXCLUDE_INCOMPLETE_WARNING, "שימו לב: ייתכן שתפספסו הצעות מתאימות. הפרטים החסרים עשויים להתאים לכם.");
    assert.equal(buildPreferenceFields({ excludeIncomplete: true }, "female").excludeIncomplete, true);
    assert.equal(buildPreferenceFields({}, "female").excludeIncomplete, false);
  });
});
