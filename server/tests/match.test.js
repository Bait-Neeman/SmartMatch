process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const { generateToken } = require("../src/config/jwt");
const { computeMatchPercent } = require("../src/services/match.service");
const Profile = require("../src/models/profile.model");
const Preference = require("../src/models/preference.model");
const User = require("../src/models/user.model");

const PASSWORD = "Password1";
const HIDDEN_KEYS = [
  "total",
  "age",
  "height",
  "city",
  "style",
  "appearance",
  "maritalStatus",
  "ethnicity",
  "institution",
  "profession",
  "working",
  "workingInProfession",
  "financialStatus",
  "financialDemand",
];

const traits = {
  city: "Haifa",
  style: "modern",
  appearance: "average",
  ethnicity: "ashkenazi",
  maritalStatus: "single",
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role || "user");

const baseProfile = (overrides) => ({
  gender: "female",
  age: 25,
  height: 165,
  occupation: "teacher",
  yeshiva: "yeshiva-name",
  seminar: "seminar-name",
  ...traits,
  ...overrides,
});

const idsOf = (body) => body.candidates.map((card) => String(card._id));

const assertSorted = (candidates) => {
  for (let index = 1; index < candidates.length; index += 1) {
    const previous = candidates[index - 1].matchPercent;
    const current = candidates[index].matchPercent;
    if (previous == null) assert.equal(current, null);
    else if (current != null) assert.ok(previous >= current);
  }
};

const assertCountsOnly = (hidden, secrets) => {
  assert.deepEqual(Object.keys(hidden).sort(), [...HIDDEN_KEYS].sort());
  for (const key of HIDDEN_KEYS) assert.equal(typeof hidden[key], "number", key);
  const blob = JSON.stringify(hidden);
  for (const secret of secrets) assert.equal(blob.includes(secret), false, secret);
};

describe("match percent formula", () => {
  it("indexes profile gender for the suggestion query", () => {
    const indexed = Profile.schema.indexes().some(([fields]) => fields.gender === 1);
    assert.equal(indexed, true);
  });

  it("skips unknown checks and does not call an empty comparison 100", () => {
    assert.equal(computeMatchPercent({}, {}, {}, {}), null);
    assert.equal(
      computeMatchPercent(
        { description: "about one", lookingFor: "someone kind" },
        {},
        { description: "about two", lookingFor: "a home" },
        {}
      ),
      null
    );

    const missingAge = computeMatchPercent({ ...traits, age: 25 }, { ageMin: 20, ageMax: 30 }, { ...traits }, {});
    const tooOld = computeMatchPercent({ ...traits, age: 25 }, { ageMin: 20, ageMax: 30 }, { ...traits, age: 40 }, {});
    assert.equal(missingAge, 100);
    assert.ok(missingAge > tooOld);

    const plain = computeMatchPercent(traits, {}, traits, {});
    const withFreeText = computeMatchPercent(
      { ...traits, description: "one", lookingFor: "alpha", financialRequirement: "text", financialCapabilities: "text" },
      {},
      { ...traits, description: "two", lookingFor: "beta", financialRequirement: "other", financialCapabilities: "other" },
      {}
    );
    assert.equal(plain, 100);
    assert.equal(plain, withFreeText);
  });

  it("treats city hyphen, space, and case variants as the same city", () => {
    const left = { ...traits, city: "Tel-Aviv" };
    const right = { ...traits, city: "tel aviv" };
    const other = { ...traits, city: "Jerusalem" };
    assert.equal(computeMatchPercent(left, {}, right, {}), 100);
    assert.equal(computeMatchPercent(right, {}, left, {}), 100);
    assert.equal(computeMatchPercent(left, {}, { ...traits, city: "  TEL–AVIV " }, {}), 100);
    assert.equal(computeMatchPercent(left, {}, other, {}), 92);
  });

  it("scores both finance shapes and skips a missing number", () => {
    const skipped = computeMatchPercent(
      { ...traits, financialDemand: 100, financialParticipation: 100 },
      {},
      { ...traits, financialDemand: 100 },
      {}
    );
    // Five shared traits at 100, one finance check at 70, the missing side skipped. 570/6 = 95.
    assert.equal(skipped, 95);

    const below = computeMatchPercent(
      { ...traits, financialDemand: 100, financialParticipation: 100 },
      {},
      { ...traits, financialDemand: 100, financialParticipation: 40 },
      {}
    );
    // The low side scores 0 and the equal side scores 70. 570/7 = 81.
    assert.equal(below, 81);

    const twice = computeMatchPercent(
      { ...traits, financialDemand: 100, financialParticipation: 200 },
      {},
      { ...traits, financialDemand: 80, financialParticipation: 200 },
      {}
    );
    assert.equal(twice, 100);

    const edge = computeMatchPercent(
      { ...traits, financialStatus: 4 },
      { financialMin: 0, financialMax: 10 },
      { ...traits, financialStatus: 0 },
      {}
    );
    // Status 0 is the bottom of 0–10, so that check is 70. 570/6 = 95.
    assert.equal(edge, 95);

    const missingStatus = computeMatchPercent({ ...traits }, { financialMin: 0, financialMax: 10 }, { ...traits }, {});
    assert.equal(missingStatus, 100);
  });

  it("is the same in either direction", () => {
    const personA = {
      ...traits,
      age: 30,
      height: 170,
      city: "Tel-Aviv",
      financialDemand: 100,
      financialParticipation: 80,
      financialStatus: 4,
      yeshiva: "חברון",
      seminar: "אור-החיים",
    };
    const personB = {
      ...traits,
      age: 22,
      height: 160,
      city: "tel aviv",
      style: "classic",
      ethnicity: "sephardic",
      financialDemand: 50,
      financialParticipation: 200,
      financialStatus: 9,
      yeshiva: "חברון",
      seminar: "אחר",
    };
    const preferenceA = {
      ageMin: 20,
      ageMax: 40,
      city: "Tel Aviv",
      financialMin: 1,
      financialMax: 10,
      preferredYeshiva: "חברון",
    };
    const preferenceB = {
      heightMin: 150,
      heightMax: 190,
      financialMin: 0,
      financialMax: 8,
      preferredEthnicity: "ashkenazi",
      preferredSeminar: "אור החיים",
    };
    const forward = computeMatchPercent(personA, preferenceA, personB, preferenceB);
    const backward = computeMatchPercent(personB, preferenceB, personA, preferenceA);
    assert.equal(typeof forward, "number");
    assert.equal(forward, backward);
  });

  it("scores a selected institution and skips a blank one", () => {
    const selected = { preferredYeshiva: ["חברון", "מיר"] };
    assert.equal(computeMatchPercent({}, selected, { yeshiva: "מיר" }, {}), 100);
    assert.equal(computeMatchPercent({}, selected, { yeshiva: "פוניבז" }, {}), 0);
    assert.equal(computeMatchPercent({}, selected, {}, {}), null);
    assert.equal(computeMatchPercent({}, {}, { yeshiva: "פוניבז" }, {}), null);
    assert.equal(computeMatchPercent({}, { preferredSeminar: "אור-החיים" }, { seminar: "אור החיים" }, {}), 100);
    assert.equal(computeMatchPercent({}, { preferredYeshiva: ["חברון"] }, { yeshiva: "ישיבת חברון" }, {}), 100);
    assert.equal(computeMatchPercent({}, { preferredSeminar: ["אור החיים"] }, { seminar: "סמינר אור החיים" }, {}), 100);
    assert.equal(computeMatchPercent({}, { preferredYeshiva: ["אין העדפת ישיבה"] }, { yeshiva: "פוניבז" }, {}), null);
    assert.equal(computeMatchPercent({}, { preferredOccupation: ["הוראה"] }, { occupation: "הוראה" }, {}), 100);
    assert.equal(computeMatchPercent({}, { preferredOccupation: ["הוראה"] }, { occupation: "סיעוד" }, {}), 0);
    assert.equal(computeMatchPercent({}, { preferredOccupation: ["הוראה"] }, {}, {}), null);
    assert.equal(computeMatchPercent({}, { preferredOccupation: ["אין העדפת מקצוע"] }, { occupation: "סיעוד" }, {}), null);
    assert.equal(computeMatchPercent({}, { onlyWorking: true }, { working: true }, {}), 100);
    assert.equal(computeMatchPercent({}, { onlyWorking: true }, {}, {}), 0);
    assert.equal(computeMatchPercent({}, { onlyWorkingInProfession: true }, { working: true, workingInProfession: true }, {}), 100);
    assert.equal(computeMatchPercent({}, { onlyWorkingInProfession: true }, { working: true }, {}), 50);
    assert.equal(computeMatchPercent({}, {}, { working: true, workingInProfession: true }, {}), null);
  });
});

describe("candidate matching", { concurrency: 1, timeout: 180000 }, () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    for (const collection of Object.values(mongoose.connection.collections)) {
      await collection.deleteMany({});
    }
  });

  const createUser = async (overrides = {}) => {
    const n = overrides.n ?? Math.floor(Math.random() * 800000) + 100000;
    const idNumber = overrides.idNumber || String(200000000 + n).slice(0, 9);
    return User.create({
      name: overrides.name || `User ${idNumber}`,
      email: overrides.email || `user-${idNumber}@example.test`,
      idNumber,
      password: overrides.password || PASSWORD,
      role: overrides.role || "user",
      pauseSuggestions: overrides.pauseSuggestions,
      minMatchPercent: overrides.minMatchPercent,
    });
  };

  const listed = (user) => request(app).get("/api/match/candidates").set(auth(tokenFor(user)));

  it("keeps a candidate with empty fields and explains who the viewer's filters hid", async () => {
    const viewer = await createUser({ n: 501, name: "SECRET-VIEWER" });
    const ageless = await createUser({ n: 502, name: "SECRET-AGELESS" });
    const blankCity = await createUser({ n: 503, name: "SECRET-NO-CITY" });
    const tooOld = await createUser({ n: 504, name: "SECRET-TOO-OLD" });
    const wrongCity = await createUser({ n: 505, name: "SECRET-WRONG-CITY" });
    const ready = await createUser({ n: 506, name: "SECRET-READY" });

    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "female", age: 25 }) },
      {
        user: blankCity._id,
        gender: "male",
        age: 28,
        height: 170,
        description: "long private description",
        lookingFor: "a specific sentence",
      },
      { user: tooOld._id, ...baseProfile({ gender: "male", age: 50 }) },
      { user: wrongCity._id, ...baseProfile({ gender: "male", age: 28, city: "Jerusalem" }) },
      { user: ready._id, ...baseProfile({ gender: "male", age: 28, description: "different words", lookingFor: "different hope" }) },
    ]);
    await Profile.collection.insertOne({
      user: ageless._id,
      gender: "male",
      description: "only free text",
      lookingFor: "also free text",
    });

    await request(app)
      .post("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ ageMin: 20, ageMax: 40, city: "Haifa", style: "modern", heightMin: 150, preferredMaritalStatus: "single" });

    const response = await listed(viewer);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const ids = idsOf(response.body);
    assert.equal(ids.includes(String(ageless._id)), true);
    assert.equal(ids.includes(String(blankCity._id)), true);
    assert.equal(ids.includes(String(ready._id)), true);
    assert.equal(ids.includes(String(tooOld._id)), false);
    assert.equal(ids.includes(String(wrongCity._id)), false);

    const agelessCard = response.body.candidates.find((card) => String(card._id) === String(ageless._id));
    assert.equal(agelessCard.matchPercent, null);
    assert.equal(agelessCard.name, undefined);
    assert.equal(agelessCard.email, undefined);
    assert.equal(agelessCard.phone, undefined);
    assertSorted(response.body.candidates);
    assert.equal(String(response.body.candidates.at(-1)._id), String(ageless._id));

    const readyCard = response.body.candidates.find((card) => String(card._id) === String(ready._id));
    const blankCard = response.body.candidates.find((card) => String(card._id) === String(blankCity._id));
    assert.ok(readyCard.matchPercent > blankCard.matchPercent);

    assert.equal(response.body.hiddenByPreference.total, 2);
    assert.equal(response.body.hiddenByPreference.age, 1);
    assert.equal(response.body.hiddenByPreference.city, 1);
    assertCountsOnly(response.body.hiddenByPreference, ["SECRET-TOO-OLD", "SECRET-WRONG-CITY", "Jerusalem"]);
    assert.equal(JSON.stringify(response.body).includes("SECRET-READY"), false);

    const suggestions = await request(app).get("/api/suggestions").set(auth(tokenFor(viewer)));
    assert.equal(suggestions.status, 200);
    assert.equal(suggestions.body.newSuggestions.length, response.body.candidates.length);
    assert.deepEqual(suggestions.body.hiddenByPreference, response.body.hiddenByPreference);

    await User.updateOne({ _id: viewer._id }, { minMatchPercent: 50 });
    const floored = await listed(viewer);
    assert.equal(idsOf(floored.body).includes(String(ageless._id)), false);
    assert.equal(floored.body.hiddenByPreference.total, 2);
  });

  it("matches city text after trim, case, and hyphen normalisation", async () => {
    const viewer = await createUser({ n: 511, name: "SECRET-CITY" });
    const spaced = await createUser({ n: 512, name: "SECRET-SPACED" });
    const maqaf = await createUser({ n: 513, name: "SECRET-MAQAF" });
    const padded = await createUser({ n: 514, name: "SECRET-PADDED" });
    const other = await createUser({ n: 515, name: "SECRET-OTHER-CITY" });
    const missing = await createUser({ n: 516, name: "SECRET-MISSING-CITY" });

    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "female", city: "תל אביב" }) },
      { user: spaced._id, ...baseProfile({ gender: "male", city: "תל אביב" }) },
      { user: maqaf._id, ...baseProfile({ gender: "male", city: "תל־אביב" }) },
      { user: padded._id, ...baseProfile({ gender: "male", city: "  תל  אביב " }) },
      { user: other._id, ...baseProfile({ gender: "male", city: "ירושלים" }) },
      { user: missing._id, ...baseProfile({ gender: "male" }) },
    ]);
    await Profile.updateOne({ user: missing._id }, { $unset: { city: 1 } });
    await request(app).post("/api/preference").set(auth(tokenFor(viewer))).send({ city: "תל-אביב" });

    const response = await listed(viewer);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const ids = idsOf(response.body).sort();
    assert.deepEqual(ids, [String(spaced._id), String(maqaf._id), String(padded._id), String(missing._id)].sort());
    assert.equal(response.body.hiddenByPreference.city, 1);
    assert.equal(response.body.hiddenByPreference.total, 1);
    assertCountsOnly(response.body.hiddenByPreference, ["SECRET-OTHER-CITY", "ירושלים"]);
  });

  it("applies both finance shapes and does not exclude a missing number", async () => {
    const viewer = await createUser({ n: 521, name: "SECRET-MONEY" });
    const fits = await createUser({ n: 522, name: "SECRET-FITS" });
    const noParticipation = await createUser({ n: 523, name: "SECRET-NO-PART" });
    const lowParticipation = await createUser({ n: 524, name: "SECRET-LOW-PART" });
    const noStatus = await createUser({ n: 525, name: "SECRET-NO-STATUS" });
    const lowStatus = await createUser({ n: 526, name: "SECRET-LOW-STATUS" });
    const bothLow = await createUser({ n: 527, name: "SECRET-BOTH-LOW" });
    const sameText = await createUser({ n: 528, name: "SECRET-TEXT" });

    const money = { financialDemand: 80, financialParticipation: 150, financialStatus: 6 };
    await Profile.create([
      {
        user: viewer._id,
        ...baseProfile({
          gender: "female",
          financialDemand: 100,
          financialParticipation: 200,
          financialStatus: 6,
          financialRequirement: "viewer text",
          financialCapabilities: "viewer ability",
        }),
      },
      { user: fits._id, ...baseProfile({ gender: "male", ...money, financialRequirement: "one", financialCapabilities: "one" }) },
      { user: noParticipation._id, ...baseProfile({ gender: "male", financialDemand: 80, financialStatus: 6 }) },
      { user: lowParticipation._id, ...baseProfile({ gender: "male", ...money, financialParticipation: 40 }) },
      { user: noStatus._id, ...baseProfile({ gender: "male", financialDemand: 80, financialParticipation: 150 }) },
      { user: lowStatus._id, ...baseProfile({ gender: "male", ...money, financialStatus: 2 }) },
      { user: bothLow._id, ...baseProfile({ gender: "male", ...money, financialParticipation: 40, financialStatus: 2 }) },
      { user: sameText._id, ...baseProfile({ gender: "male", ...money, financialRequirement: "totally different", financialCapabilities: "other" }) },
    ]);
    await request(app)
      .post("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ financialMin: 4, financialMax: 10 });

    const response = await listed(viewer);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const ids = idsOf(response.body);
    for (const user of [fits, noParticipation, noStatus, sameText]) {
      assert.equal(ids.includes(String(user._id)), true, user.name);
    }
    for (const user of [lowParticipation, lowStatus, bothLow]) {
      assert.equal(ids.includes(String(user._id)), false, user.name);
    }

    const fitCard = response.body.candidates.find((card) => String(card._id) === String(fits._id));
    const textCard = response.body.candidates.find((card) => String(card._id) === String(sameText._id));
    assert.equal(fitCard.matchPercent, textCard.matchPercent);
    assert.equal(response.body.hiddenByPreference.financialDemand, 2);
    assert.equal(response.body.hiddenByPreference.financialStatus, 2);
    assert.equal(response.body.hiddenByPreference.total, 3);
    assertCountsOnly(response.body.hiddenByPreference, ["SECRET-LOW-PART", "SECRET-BOTH-LOW"]);
    assertSorted(response.body.candidates);
  });

  it("filters institution and community only when the preference and the value are both set", async () => {
    const viewer = await createUser({ n: 531, name: "SECRET-SCHOOL" });
    const match = await createUser({ n: 532, name: "SECRET-SCHOOL-MATCH" });
    const unknown = await createUser({ n: 533, name: "SECRET-SCHOOL-UNKNOWN" });
    const otherSchool = await createUser({ n: 534, name: "SECRET-OTHER-SCHOOL" });
    const otherSeminar = await createUser({ n: 535, name: "SECRET-OTHER-SEMINAR" });
    const otherCommunity = await createUser({ n: 536, name: "SECRET-OTHER-COMMUNITY" });

    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "female" }) },
      { user: match._id, ...baseProfile({ gender: "male", yeshiva: "חברון", seminar: "אור החיים", ethnicity: "sephardic" }) },
      { user: unknown._id, ...baseProfile({ gender: "male", ethnicity: "sephardic" }) },
      { user: otherSchool._id, ...baseProfile({ gender: "male", yeshiva: "פוניבז", seminar: "אור החיים", ethnicity: "sephardic" }) },
      { user: otherSeminar._id, ...baseProfile({ gender: "male", yeshiva: "חברון", seminar: "אחר", ethnicity: "sephardic" }) },
      { user: otherCommunity._id, ...baseProfile({ gender: "male", yeshiva: "חברון", seminar: "אור החיים", ethnicity: "ashkenazi" }) },
    ]);
    await Profile.updateOne({ user: unknown._id }, { $unset: { yeshiva: 1, seminar: 1 } });

    const saved = await request(app).post("/api/preference").set(auth(tokenFor(viewer))).send({
      preferredEthnicity: "sephardic",
      preferredYeshiva: "חברון",
      preferredSeminar: "אור-החיים",
    });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.equal(saved.body.preferences.preferredEthnicity, "sephardic");
    assert.deepEqual(saved.body.preferences.preferredYeshiva, ["חברון"]);
    assert.deepEqual(saved.body.preferences.preferredSeminar, ["אור-החיים"]);

    const invalid = await request(app)
      .put("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ preferredEthnicity: "nope" });
    assert.equal(invalid.status, 400);

    const response = await listed(viewer);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    const ids = idsOf(response.body).sort();
    assert.deepEqual(ids, [String(match._id), String(unknown._id)].sort());
    assert.equal(response.body.hiddenByPreference.institution, 2);
    assert.equal(response.body.hiddenByPreference.ethnicity, 1);
    assert.equal(response.body.hiddenByPreference.total, 3);
    assertCountsOnly(response.body.hiddenByPreference, ["SECRET-OTHER-SCHOOL", "פוניבז"]);
  });

  it("hides a known mismatch both ways and does not hide an unknown the other way", async () => {
    const left = await createUser({ n: 541, name: "SECRET-LEFT" });
    const right = await createUser({ n: 542, name: "SECRET-RIGHT" });
    await Profile.create([
      { user: left._id, ...baseProfile({ gender: "female", age: 30, city: "Tel-Aviv" }) },
      { user: right._id, ...baseProfile({ gender: "male", age: 28, city: "tel aviv" }) },
    ]);

    const leftSees = await listed(left);
    const rightSees = await listed(right);
    assert.deepEqual(idsOf(leftSees.body), [String(right._id)]);
    assert.deepEqual(idsOf(rightSees.body), [String(left._id)]);
    assert.equal(leftSees.body.candidates[0].matchPercent, rightSees.body.candidates[0].matchPercent);
    assert.equal(leftSees.body.hiddenByPreference.total, 0);

    await request(app).post("/api/preference").set(auth(tokenFor(left))).send({ ageMin: 40, ageMax: 50 });
    const leftAfter = await listed(left);
    const rightAfter = await listed(right);
    assert.deepEqual(idsOf(leftAfter.body), []);
    assert.deepEqual(idsOf(rightAfter.body), []);
    assert.equal(leftAfter.body.hiddenByPreference.age, 1);
    assert.equal(leftAfter.body.hiddenByPreference.total, 1);
    assert.equal(rightAfter.body.hiddenByPreference.total, 0);
    assertCountsOnly(leftAfter.body.hiddenByPreference, ["SECRET-RIGHT"]);

    await request(app).put("/api/preference").set(auth(tokenFor(left))).send({ ageMin: "", ageMax: "", city: "Haifa" });
    await Profile.updateOne({ user: right._id }, { $unset: { city: 1 } });
    const leftUnknown = await listed(left);
    const rightUnknown = await listed(right);
    assert.deepEqual(idsOf(leftUnknown.body), [String(right._id)]);
    assert.deepEqual(idsOf(rightUnknown.body), [String(left._id)]);
    assert.equal(leftUnknown.body.hiddenByPreference.total, 0);
    assert.equal(leftUnknown.body.candidates[0].name, undefined);
  });

  it("filters by a multi-select institution list and still reads a single stored name", async () => {
    const viewer = await createUser({ n: 551, name: "SECRET-MULTI" });
    const hebron = await createUser({ n: 552, name: "SECRET-HEBRON" });
    const mir = await createUser({ n: 553, name: "SECRET-MIR" });
    const other = await createUser({ n: 554, name: "SECRET-OTHER-YESHIVA" });
    const blank = await createUser({ n: 555, name: "SECRET-BLANK-YESHIVA" });
    const man = await createUser({ n: 561, name: "SECRET-MAN" });
    const seminarMatch = await createUser({ n: 562, name: "SECRET-SEMINAR-MATCH" });
    const seminarOther = await createUser({ n: 563, name: "SECRET-SEMINAR-OTHER" });
    const seminarBlank = await createUser({ n: 564, name: "SECRET-SEMINAR-BLANK" });

    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "female" }) },
      { user: hebron._id, ...baseProfile({ gender: "male", yeshiva: "חברון" }) },
      { user: mir._id, ...baseProfile({ gender: "male", yeshiva: "מיר" }) },
      { user: other._id, ...baseProfile({ gender: "male", yeshiva: "פוניבז'" }) },
      { user: blank._id, ...baseProfile({ gender: "male" }) },
      { user: man._id, ...baseProfile({ gender: "male" }) },
      { user: seminarMatch._id, ...baseProfile({ gender: "female", seminar: "אור-החיים" }) },
      { user: seminarOther._id, ...baseProfile({ gender: "female", seminar: "נעם" }) },
      { user: seminarBlank._id, ...baseProfile({ gender: "female" }) },
    ]);
    await Profile.updateOne({ user: blank._id }, { $unset: { yeshiva: 1 } });
    await Profile.updateOne({ user: seminarBlank._id }, { $unset: { seminar: 1 } });

    const saved = await request(app)
      .post("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ preferredYeshiva: ["חברון", " מיר ", "חברון", "אין העדפת ישיבה"] });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.preferences.preferredYeshiva, ["חברון", "מיר"]);

    const response = await listed(viewer);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(
      idsOf(response.body).sort(),
      [String(hebron._id), String(mir._id), String(blank._id)].sort()
    );
    assert.equal(response.body.hiddenByPreference.institution, 2);
    assert.equal(response.body.hiddenByPreference.total, 2);
    assertCountsOnly(response.body.hiddenByPreference, ["SECRET-OTHER-YESHIVA", "פוניבז'"]);

    const cleared = await request(app)
      .put("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ preferredYeshiva: ["אין העדפת ישיבה"] });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
    assert.equal(cleared.body.preferences.preferredYeshiva, null);
    const open = await listed(viewer);
    assert.equal(idsOf(open.body).includes(String(other._id)), true);
    assert.equal(open.body.hiddenByPreference.total, 0);

    await Preference.updateOne({ user: viewer._id }, { $set: { preferredYeshiva: "חברון" } });
    const legacy = await listed(viewer);
    assert.deepEqual(idsOf(legacy.body).sort(), [String(hebron._id), String(blank._id)].sort());
    assert.equal(legacy.body.hiddenByPreference.institution, 3);

    const seminars = await request(app)
      .post("/api/preference")
      .set(auth(tokenFor(man)))
      .send({ preferredSeminar: ["אור החיים", "וולף"] });
    assert.equal(seminars.status, 201, JSON.stringify(seminars.body));
    assert.deepEqual(seminars.body.preferences.preferredSeminar, ["אור החיים", "וולף"]);

    const seminarList = await listed(man);
    assert.equal(seminarList.status, 200, JSON.stringify(seminarList.body));
    assert.deepEqual(
      idsOf(seminarList.body).sort(),
      [String(seminarMatch._id), String(seminarBlank._id)].sort()
    );
    // The female viewer also fails the seminar list, but she already filters this
    // man out by yeshiva, so she is not part of the viewer's hidden count.
    assert.equal(seminarList.body.hiddenByPreference.institution, 1);

    const bad = await request(app)
      .put("/api/preference")
      .set(auth(tokenFor(man)))
      .send({ preferredSeminar: ["אור החיים", 4] });
    assert.equal(bad.status, 400);
  });

  it("filters by profession like a seminar list and keeps a blank profession", async () => {
    const viewer = await createUser({ n: 571, name: "SECRET-PROFESSION-VIEWER" });
    const teacher = await createUser({ n: 572, name: "SECRET-TEACHER" });
    const ganenet = await createUser({ n: 573, name: "SECRET-GANENET" });
    const nurse = await createUser({ n: 574, name: "SECRET-NURSE" });
    const blank = await createUser({ n: 575, name: "SECRET-BLANK-PROFESSION" });

    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "male" }) },
      { user: teacher._id, ...baseProfile({ gender: "female", occupation: "הוראה" }) },
      { user: ganenet._id, ...baseProfile({ gender: "female", occupation: "גננת" }) },
      { user: nurse._id, ...baseProfile({ gender: "female", occupation: "סיעוד" }) },
      { user: blank._id, ...baseProfile({ gender: "female" }) },
    ]);
    await Profile.updateOne({ user: blank._id }, { $unset: { occupation: 1 } });

    const saved = await request(app)
      .post("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ preferredOccupation: ["הוראה", " גננת ", "הוראה", "אין העדפת מקצוע"] });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.preferences.preferredOccupation, ["הוראה", "גננת"]);

    const response = await listed(viewer);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.deepEqual(
      idsOf(response.body).sort(),
      [String(teacher._id), String(ganenet._id), String(blank._id)].sort()
    );
    assert.equal(response.body.hiddenByPreference.profession, 1);
    assert.equal(response.body.hiddenByPreference.total, 1);
    assertCountsOnly(response.body.hiddenByPreference, ["SECRET-NURSE", "סיעוד"]);

    await Preference.updateOne({ user: viewer._id }, { $set: { preferredOccupation: "הוראה" } });
    const legacy = await listed(viewer);
    assert.deepEqual(idsOf(legacy.body).sort(), [String(teacher._id), String(blank._id)].sort());
    assert.equal(legacy.body.hiddenByPreference.profession, 2);

    const cleared = await request(app)
      .put("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ preferredOccupation: ["אין העדפת מקצוע"] });
    assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
    assert.equal(cleared.body.preferences.preferredOccupation, null);
    const open = await listed(viewer);
    assert.equal(open.body.hiddenByPreference.total, 0);
    assert.equal(idsOf(open.body).includes(String(nurse._id)), true);
  });

  it("treats the work checkboxes as hard filters and excludes an unanswered woman", async () => {
    const viewer = await createUser({ n: 581, name: "SECRET-WORK-VIEWER" });
    const working = await createUser({ n: 582, name: "SECRET-WORKING" });
    const studied = await createUser({ n: 583, name: "SECRET-STUDIED" });
    const stopped = await createUser({ n: 584, name: "SECRET-STOPPED" });
    const silent = await createUser({ n: 585, name: "SECRET-SILENT" });

    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "male" }) },
      { user: working._id, ...baseProfile({ gender: "female", working: true, workingInProfession: false }) },
      { user: studied._id, ...baseProfile({ gender: "female", working: true, workingInProfession: true }) },
      { user: stopped._id, ...baseProfile({ gender: "female", working: false }) },
      { user: silent._id, ...baseProfile({ gender: "female" }) },
    ]);
    await Profile.updateOne({ user: silent._id }, { $unset: { working: 1, workingInProfession: 1 } });

    const onlyWorking = await request(app)
      .post("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ onlyWorking: true });
    assert.equal(onlyWorking.status, 201, JSON.stringify(onlyWorking.body));
    assert.equal(onlyWorking.body.preferences.onlyWorking, true);
    assert.equal(onlyWorking.body.preferences.onlyWorkingInProfession, false);

    const workingList = await listed(viewer);
    assert.deepEqual(idsOf(workingList.body).sort(), [String(working._id), String(studied._id)].sort());
    assert.equal(workingList.body.hiddenByPreference.working, 2);
    assert.equal(workingList.body.hiddenByPreference.workingInProfession, 0);
    assert.equal(workingList.body.hiddenByPreference.total, 2);
    assertCountsOnly(workingList.body.hiddenByPreference, ["SECRET-STOPPED", "SECRET-SILENT"]);

    const implied = await request(app)
      .put("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ onlyWorking: false, onlyWorkingInProfession: true });
    assert.equal(implied.status, 200, JSON.stringify(implied.body));
    assert.equal(implied.body.preferences.onlyWorking, true);
    assert.equal(implied.body.preferences.onlyWorkingInProfession, true);

    const studiedList = await listed(viewer);
    assert.deepEqual(idsOf(studiedList.body), [String(studied._id)]);
    assert.equal(studiedList.body.hiddenByPreference.working, 2);
    assert.equal(studiedList.body.hiddenByPreference.workingInProfession, 3);
    assert.equal(studiedList.body.hiddenByPreference.total, 3);

    const invalid = await request(app)
      .put("/api/preference")
      .set(auth(tokenFor(viewer)))
      .send({ onlyWorking: "maybe" });
    assert.equal(invalid.status, 400);
  });
});
