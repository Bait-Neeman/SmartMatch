import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  greetingLine,
  hebrewDateLine,
  hebrewNumeral,
  homeCounts,
  toHomeCard,
  toHomeCards,
  weeklyNewLine,
} from "./homeDashboard.js";

const secretPerson = {
  _id: "candidate-1",
  age: 26,
  gender: "male",
  height: 180,
  city: "ירושלים",
  ethnicity: "ashkenazi",
  occupation: "לומד",
  maritalStatus: "single",
  financialDemand: 40,
  financialParticipation: 80,
  financialStatus: 4,
  matchPercent: 91,
  yeshiva: "ישיבת-סוד",
  seminar: "סמינר-סוד",
  description: "תיאור סודי",
  lookingFor: "מחפש סודי",
  name: "שם-סודי",
  email: "secret@example.test",
  phone: "0500000000",
  image: "/api/files/candidate-1/image",
  resumePdf: "/api/files/candidate-1/resume",
  contact: "0500000000",
  idNumber: "123456782",
};

describe("home dashboard", () => {
  it("writes the Hebrew date with letters", () => {
    assert.equal(hebrewNumeral(22), "כ\u05F4ב");
    assert.equal(hebrewNumeral(15), "טו");
    assert.equal(hebrewNumeral(16), "טז");
    assert.equal(hebrewNumeral(7), "ז\u05F3");
    assert.equal(hebrewDateLine(new Date("2026-10-03T09:00:00.000Z")), "יום שבת · כ\u05F4ב בתשרי");
    assert.equal(hebrewDateLine(new Date("2026-10-18T09:00:00.000Z")), "יום ראשון · ז\u05F3 בחשוון");
  });

  it("greets with the first name and a weekly count", () => {
    assert.equal(greetingLine("שרה לוי"), "שלום שרה,");
    assert.equal(greetingLine(""), "שלום,");
    assert.equal(weeklyNewLine(6), "6 הצעות חדשות נבחרו עבורך השבוע, בהתאם להעדפות שלך.");
    assert.equal(weeklyNewLine(1), "הצעה חדשה אחת נבחרה עבורך השבוע, בהתאם להעדפות שלך.");
    assert.equal(weeklyNewLine(0), "אין הצעות חדשות השבוע. הצעות חדשות נבחרות בהתאם להעדפות שלך.");
  });

  it("counts the lists returned by GET /suggestions", () => {
    const counts = homeCounts({
      newSuggestions: [{ _id: "a" }, { _id: "b" }],
      received: [{ _id: "c" }],
      active: [{ _id: "d" }, { _id: "e" }],
      matchmaker: [{ _id: "f" }],
    });
    assert.deepEqual(counts, { fresh: 2, received: 1, active: 2, matchmaker: 1, weekly: 2 });
  });

  it("keeps a new suggestion card to the public fields", () => {
    const card = toHomeCard(secretPerson);
    const blob = JSON.stringify(card);

    assert.equal(card.title, "בן 26");
    assert.equal(card.city, "ירושלים");
    assert.equal(card.percent, null);
    assert.deepEqual(
      card.lines.map((line) => line.key),
      ["community", "occupation", "height", "maritalStatus", "financialDemand", "financialParticipation", "financialStatus"]
    );
    assert.equal(card.lines.find((line) => line.key === "community").value, "אשכנזי");
    assert.equal(card.lines.find((line) => line.key === "height").value, '180 ס"מ');
    assert.equal(card.lines.find((line) => line.key === "occupation").value, "לומד");

    for (const secret of ["שם-סודי", "secret@example.test", "0500000000", "123456782", "ישיבת-סוד", "סמינר-סוד", "תיאור סודי", "מחפש סודי"]) {
      assert.equal(blob.includes(secret), false, secret);
    }
    for (const key of ["name", "email", "phone", "image", "resumePdf", "photo", "resume", "contact", "idNumber", "yeshiva", "seminar", "description", "lookingFor"]) {
      assert.equal(Object.hasOwn(card, key), false, key);
    }

    const cards = toHomeCards([secretPerson, { age: 20 }]);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].id, "candidate-1");
    assert.equal(JSON.stringify(cards[0]).includes("שם-סודי"), false);
  });
});
