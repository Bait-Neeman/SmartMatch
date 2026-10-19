process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const { generateToken } = require("../src/config/jwt");
const { setStoredFileReader, setProfileFileUploader, setProfileFileDeleter } = require("../src/services/storage.service");
const { computeMatchPercent } = require("../src/services/match.service");
const User = require("../src/models/user.model");
const Profile = require("../src/models/profile.model");
const Preference = require("../src/models/preference.model");
const Interest = require("../src/models/interest.model");

const PASSWORD = "Password1";
const IDENTITY_KEYS = ["name", "email", "phone", "image", "resumePdf", "idNumber", "password", "contact", "resumeSize", "resumeUploadedAt"];

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role || "user");

const baseProfile = (overrides) => ({
  gender: "female",
  age: 25,
  height: 165,
  city: "Haifa",
  ethnicity: "ashkenazi",
  style: "modern",
  appearance: "average",
  occupation: "teacher",
  description: "about text",
  yeshiva: "yeshiva-name",
  seminar: "seminar-name",
  ...overrides,
});

describe("match percent formula", () => {
  it("averages only the checks that have data", () => {
    const shared = {
      city: "Haifa",
      style: "modern",
      appearance: "average",
      ethnicity: "ashkenazi",
      maritalStatus: "single",
    };
    assert.equal(computeMatchPercent(shared, {}, shared, {}), 100);

    const otherCity = { ...shared, city: "Elad" };
    // City differs (60). The other four shared traits stay 100. (60+400)/5 = 92.
    assert.equal(computeMatchPercent(shared, {}, otherCity, {}), 92);

    const divorced = { ...shared, maritalStatus: "divorced" };
    // Marital status differs (60). The other four shared traits stay 100. (60+400)/5 = 92.
    assert.equal(computeMatchPercent(shared, {}, divorced, {}), 92);

    const withMoney = {
      ...shared,
      financialDemand: 100,
      financialParticipation: 100,
    };
    // Five traits at 100 and two finance checks at the exact minimum (70). 640/7 = 91.
    assert.equal(computeMatchPercent(withMoney, {}, withMoney, {}), 91);

    const surplus = {
      ...shared,
      financialDemand: 100,
      financialParticipation: 200,
    };
    assert.equal(computeMatchPercent(surplus, {}, surplus, {}), 100);

    const ranged = computeMatchPercent(
      { ...shared, age: 30 },
      { ageMin: 20, ageMax: 40 },
      { ...shared, age: 24 },
      {}
    );
    // Age 24 sits 0.6 of the way from the middle to the edge: 70 + 30 * 0.4 = 82.
    // The other direction has no range. Traits are all 100. (82+500)/6 = 97.
    assert.equal(ranged, 97);
  });
});

describe("server logic", { concurrency: 1, timeout: 180000 }, () => {
  let mongo;

  before(async () => {
    setStoredFileReader(async (kind, publicId) => ({
      body: Buffer.from(`${kind}:${publicId}`),
      contentType: kind === "image" ? "image/jpeg" : "application/pdf",
    }));
    setProfileFileUploader(async (kind) => `stored-${kind}`);
    setProfileFileDeleter(async () => {});
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  after(async () => {
    setProfileFileUploader(null);
    setProfileFileDeleter(null);
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
      phone: overrides.phone,
      pauseSuggestions: overrides.pauseSuggestions,
      minMatchPercent: overrides.minMatchPercent,
    });
  };

  const ownProfile = async (token, body, file) => {
    const payload = { phone: "0521234567", ...body };
    const call = request(app).post("/api/profile").set(auth(token));
    if (file) {
      Object.entries(payload).forEach(([key, value]) => call.field(key, String(value)));
      return call.attach("resumePdf", file.buffer, { filename: file.name, contentType: "application/pdf" });
    }
    return call.send(payload);
  };

  it("saves profile fields, age range, and resume metadata on create, update, and get-me", async () => {
    const user = await createUser({ n: 11, name: "Owner Name" });
    const token = tokenFor(user);
    const pdf = Buffer.from("%PDF-1.4\nresume");

    const created = await ownProfile(token, {
      ...baseProfile({ lookingFor: "a kind person", maritalStatus: "single", financialDemand: 100, financialParticipation: 80 }),
      ageMin: 22,
      ageMax: 30,
      preferredMaritalStatus: "single",
    }, { buffer: pdf, name: "cv.pdf" });

    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.profile.lookingFor, "a kind person");
    assert.equal(created.body.profile.maritalStatus, "single");
    assert.equal(created.body.profile.financialDemand, 100);
    assert.equal(created.body.profile.financialParticipation, 80);
    assert.equal(created.body.profile.ageMin, 22);
    assert.equal(created.body.profile.ageMax, 30);
    assert.deepEqual(created.body.profile.preferredMaritalStatus, ["single"]);
    assert.equal(created.body.profile.resumeSize, pdf.length);
    assert.ok(created.body.profile.resumeUploadedAt);
    assert.equal(created.body.profile.idNumber, undefined);
    assert.equal(created.body.profile.password, undefined);

    const negative = await request(app)
      .put("/api/profile")
      .set(auth(token))
      .send({ financialDemand: -5, financialParticipation: -1 });
    assert.equal(negative.status, 400);
    assert.match(negative.body.message, /דרישה כספית/);

    const badStatus = await request(app).put("/api/profile").set(auth(token)).send({ maritalStatus: "married" });
    assert.equal(badStatus.status, 400);
    assert.equal(badStatus.body.message, "ערך לא תקין בשדה סטטוס משפחתי");

    const badRange = await request(app).put("/api/profile").set(auth(token)).send({ ageMin: 40, ageMax: 20 });
    assert.equal(badRange.status, 400);
    assert.match(badRange.body.message, /גיל/);

    const updated = await request(app)
      .put("/api/profile")
      .set(auth(token))
      .send({ lookingFor: "updated text", financialParticipation: 0, ageMin: 21, ageMax: 32 });
    assert.equal(updated.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.profile.lookingFor, "updated text");
    assert.equal(updated.body.profile.financialParticipation, 0);
    assert.equal(updated.body.profile.ageMin, 21);
    assert.equal(updated.body.profile.ageMax, 32);
    assert.equal(updated.body.profile.resumeSize, pdf.length);

    const mine = await request(app).get("/api/profile/me").set(auth(token));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.profile.lookingFor, "updated text");
    assert.equal(mine.body.profile.financialDemand, 100);
    assert.equal(mine.body.profile.maritalStatus, "single");
    assert.equal(mine.body.profile.ageMin, 21);
    assert.equal(mine.body.profile.resumeSize, pdf.length);
    assert.equal(JSON.stringify(mine.body).includes("idNumber"), false);
  });

  it("shows the new public fields before approval and never shows identity", async () => {
    const viewer = await createUser({ n: 21, name: "SECRET-VIEWER", phone: "0501111111", email: "secret-viewer@example.test" });
    const other = await createUser({ n: 22, name: "SECRET-OTHER", phone: "0502222222", email: "secret-other@example.test" });
    await Profile.create([
      {
        user: viewer._id,
        ...baseProfile({ gender: "male", age: 28, lookingFor: "viewer looking", financialDemand: 10, financialParticipation: 80, maritalStatus: "single" }),
        image: "secret-image-viewer",
        resumePdf: "secret-resume-viewer",
        resumeSize: 10,
      },
      {
        user: other._id,
        ...baseProfile({
          lookingFor: "other looking",
          financialDemand: 40,
          financialParticipation: 50,
          maritalStatus: "divorced",
        }),
        image: "secret-image-other",
        resumePdf: "secret-resume-other",
        resumeSize: 184,
        resumeUploadedAt: new Date("2026-10-12"),
      },
    ]);
    await Preference.create({ user: viewer._id, ageMin: 20, ageMax: 40 });

    const headers = auth(tokenFor(viewer));
    const candidates = await request(app).get("/api/match/candidates").set(headers);
    assert.equal(candidates.status, 200, JSON.stringify(candidates.body));
    assert.equal(candidates.body.candidates.length, 1);
    const card = candidates.body.candidates[0];
    assert.equal(card.lookingFor, "other looking");
    assert.equal(card.financialDemand, 40);
    assert.equal(card.financialParticipation, 50);
    assert.equal(card.age, 25);
    assert.equal(card.height, 165);
    assert.equal(card.city, "Haifa");
    assert.equal(card.ethnicity, "ashkenazi");
    assert.equal(card.occupation, "teacher");
    assert.equal(card.description, "about text");
    assert.equal(card.seminar, "seminar-name");
    assert.equal(card.maritalStatus, "divorced");
    assert.equal(typeof card.matchPercent, "number");
    for (const key of IDENTITY_KEYS) {
      assert.equal(Object.hasOwn(card, key), false, key);
    }

    const lists = await request(app).get("/api/suggestions").set(headers);
    assert.equal(lists.status, 200, JSON.stringify(lists.body));
    assert.equal(lists.body.newSuggestions[0].maritalStatus, "divorced");
    assert.equal(lists.body.newSuggestions[0].name, undefined);
    assert.equal(lists.body.newSuggestions[0].resumeSize, undefined);

    const preview = await request(app).get(`/api/profile/${other._id}`).set(headers);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.profile.maritalStatus, "divorced");
    assert.equal(preview.body.profile.name, undefined);
    assert.equal(preview.body.profile.email, undefined);
    assert.equal(preview.body.profile.phone, undefined);
    assert.equal(preview.body.profile.image, undefined);
    assert.equal(preview.body.profile.resumePdf, undefined);
    assert.equal(preview.body.profile.resumeSize, undefined);
    const blob = JSON.stringify(candidates.body);
    for (const secret of ["SECRET-OTHER", "SECRET-VIEWER", "0502222222", "0501111111", "secret-other@example.test", "secret-image-other", "secret-resume-other", other.idNumber]) {
      assert.equal(blob.includes(secret), false, secret);
    }

    const sent = await request(app).post("/api/interest").set(headers).send({ receiverId: String(other._id) });
    assert.equal(sent.status, 201);
    const incoming = await request(app).get("/api/interest/incoming").set(auth(tokenFor(other)));
    const person = incoming.body.interests[0].sender;
    assert.equal(person.lookingFor, "viewer looking");
    assert.equal(person.maritalStatus, "single");
    assert.equal(person.financialDemand, 10);
    assert.equal(person.financialParticipation, 80);
    assert.equal(typeof person.matchPercent, "number");
    assert.equal(incoming.body.interests[0].stage, "received");
    for (const key of IDENTITY_KEYS) assert.equal(Object.hasOwn(person, key), false, key);

    const accepted = await request(app)
      .put("/api/interest/respond")
      .set(auth(tokenFor(other)))
      .send({ senderId: String(viewer._id), status: "accepted" });
    assert.equal(accepted.status, 200);

    const revealed = await request(app).get(`/api/profile/${viewer._id}`).set(auth(tokenFor(other)));
    assert.equal(revealed.status, 200);
    assert.equal(revealed.body.profile.name, "SECRET-VIEWER");
    assert.equal(revealed.body.profile.phone, undefined);
    assert.equal(JSON.stringify(revealed.body).includes("0501111111"), false);
    assert.equal(revealed.body.profile.email, "secret-viewer@example.test");
    assert.equal(revealed.body.profile.maritalStatus, "single");
    assert.equal(revealed.body.profile.lookingFor, "viewer looking");
    assert.equal(revealed.body.profile.image, `/api/files/${viewer._id}/image`);
    assert.equal(revealed.body.profile.resumePdf, `/api/files/${viewer._id}/resume`);
    assert.equal(revealed.body.profile.resumeSize, 10);
    assert.equal(revealed.body.profile.idNumber, undefined);
    assert.equal(JSON.stringify(revealed.body).includes(viewer.idNumber), false);
    assert.equal(JSON.stringify(revealed.body).includes(PASSWORD), false);
  });

  it("matches on finance, age range, and marital status, and filters by percent", async () => {
    const viewer = await createUser({ n: 31, minMatchPercent: 95 });
    const good = await createUser({ n: 32, name: "GOOD-MATCH" });
    const poor = await createUser({ n: 33, name: "POOR-MONEY" });
    const older = await createUser({ n: 34, name: "TOO-OLD" });
    const divorced = await createUser({ n: 35, name: "DIVORCED-PERSON" });
    const wantsWidow = await createUser({ n: 36, name: "WANTS-WIDOW" });
    const openMoney = await createUser({ n: 37, name: "OPEN-MONEY" });
    const paused = await createUser({ n: 38, name: "PAUSED-PERSON", pauseSuggestions: true });

    const traits = { city: "Haifa", style: "modern", appearance: "average", ethnicity: "ashkenazi" };
    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "female", age: 25, maritalStatus: "single", financialDemand: 100, financialParticipation: 200, ...traits }) },
      { user: good._id, ...baseProfile({ gender: "male", age: 28, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
      { user: poor._id, ...baseProfile({ gender: "male", age: 27, maritalStatus: "single", financialDemand: 10, financialParticipation: 40, ...traits }) },
      { user: older._id, ...baseProfile({ gender: "male", age: 45, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
      { user: divorced._id, ...baseProfile({ gender: "male", age: 29, maritalStatus: "divorced", financialDemand: 50, financialParticipation: 150, ...traits }) },
      { user: wantsWidow._id, ...baseProfile({ gender: "male", age: 28, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
      { user: openMoney._id, ...baseProfile({ gender: "male", age: 26, maritalStatus: "single", city: "Elad", ...traits, city: "Elad" }) },
      { user: paused._id, ...baseProfile({ gender: "male", age: 28, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
    ]);
    await Preference.create([
      { user: viewer._id, ageMin: 20, ageMax: 40, preferredMaritalStatus: "single" },
      { user: wantsWidow._id, preferredMaritalStatus: "widowed" },
    ]);

    const headers = auth(tokenFor(viewer));
    const listed = await request(app).get("/api/match/candidates").set(headers);
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    const ids = listed.body.candidates.map((card) => String(card._id));
    assert.deepEqual(ids, [String(good._id)]);
    assert.equal(listed.body.candidates[0].matchPercent, 97);

    await User.updateOne({ _id: viewer._id }, { $unset: { minMatchPercent: 1 } });
    const wider = await request(app).get("/api/match/candidates").set(headers);
    const widerIds = wider.body.candidates.map((card) => String(card._id)).sort();
    assert.deepEqual(widerIds, [String(good._id), String(openMoney._id)].sort());
    const openCard = wider.body.candidates.find((card) => String(card._id) === String(openMoney._id));
    assert.ok(openCard.matchPercent < 95);

    const filtered = await request(app).get("/api/match/candidates?percent=95").set(headers);
    assert.deepEqual(
      filtered.body.candidates.map((card) => String(card._id)),
      [String(good._id)]
    );
    const badPercent = await request(app).get("/api/match/candidates?percent=101").set(headers);
    assert.equal(badPercent.status, 400);
    assert.match(badPercent.body.message, /אחוז התאמה/);

    await User.updateOne({ _id: viewer._id }, { pauseSuggestions: true });
    const pausedViewer = await request(app).get("/api/match/candidates").set(headers);
    assert.deepEqual(pausedViewer.body.candidates, []);

    const fromGood = await request(app).get("/api/match/candidates").set(auth(tokenFor(good)));
    assert.equal(
      fromGood.body.candidates.some((card) => String(card._id) === String(viewer._id)),
      false
    );
    assert.equal(
      fromGood.body.candidates.some((card) => String(card._id) === String(paused._id)),
      false
    );
  });

  it("runs interest, approval, forward, and decline, and closes access", async () => {
    const registeredA = await request(app).post("/api/auth/register").send({
      name: "אבי כהן",
      idNumber: "311111111",
      email: "avi@example.test",
      password: PASSWORD,
    });
    const registeredB = await request(app).post("/api/auth/register").send({
      name: "רבקה לוי",
      idNumber: "311111112",
      email: "rivka@example.test",
      password: PASSWORD,
    });
    assert.equal(registeredA.status, 201, JSON.stringify(registeredA.body));
    assert.equal(registeredB.status, 201, JSON.stringify(registeredB.body));
    const tokenA = registeredA.body.token;
    const tokenB = registeredB.body.token;
    const idA = registeredA.body.user._id;
    const idB = registeredB.body.user._id;

    const profileA = await request(app).post("/api/profile").set(auth(tokenA)).send({
      ...baseProfile({ gender: "male", age: 28, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, lookingFor: "בית חם" }),
      phone: "0521111111",
    });
    const profileB = await request(app).post("/api/profile").set(auth(tokenB)).send({
      ...baseProfile({ gender: "female", age: 24, maritalStatus: "single", financialDemand: 100, financialParticipation: 200, lookingFor: "מידות טובות" }),
      phone: "0542222222",
    });
    assert.equal(profileA.status, 201, JSON.stringify(profileA.body));
    assert.equal(profileB.status, 201, JSON.stringify(profileB.body));
    await Profile.updateOne({ user: idB }, { image: "photo-b", resumePdf: "resume-b", resumeSize: 184, resumeUploadedAt: new Date("2026-10-12") });
    await User.updateOne({ _id: idB }, { phone: "0503333333" });

    const candidates = await request(app).get("/api/match/candidates").set(auth(tokenA));
    assert.equal(candidates.body.candidates.length, 1);
    assert.equal(String(candidates.body.candidates[0]._id), String(idB));
    assert.equal(candidates.body.candidates[0].lookingFor, "מידות טובות");
    assert.equal(candidates.body.candidates[0].financialDemand, 100);
    assert.equal(candidates.body.candidates[0].financialParticipation, 200);
    assert.equal(candidates.body.candidates[0].name, undefined);
    assert.equal(JSON.stringify(candidates.body).includes("רבקה לוי"), false);
    assert.equal(JSON.stringify(candidates.body).includes("0503333333"), false);

    const blocked = await request(app).post("/api/interest").set(auth(tokenA)).send({ receiverId: new mongoose.Types.ObjectId().toString() });
    assert.equal(blocked.status, 404);
    assert.equal(blocked.body.message, "המשתמש לא נמצא");

    const sent = await request(app).post("/api/interest").set(auth(tokenA)).send({ receiverId: idB });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.interest.status, "pending");

    const listsForB = await request(app).get("/api/suggestions").set(auth(tokenB));
    assert.equal(listsForB.status, 200);
    assert.equal(listsForB.body.received.length, 1);
    assert.equal(listsForB.body.received[0].stage, "received");
    assert.equal(listsForB.body.received[0].sender.name, undefined);
    assert.equal(listsForB.body.sent.length, 0);
    assert.equal(listsForB.body.active.length, 0);

    const approved = await request(app)
      .put("/api/interest/respond")
      .set(auth(tokenB))
      .send({ senderId: idA, status: "accepted" });
    assert.equal(approved.status, 200);

    const openFile = await request(app).get(`/api/files/${idB}/resume`).set(auth(tokenA));
    assert.equal(openFile.status, 200);
    const fileText = Buffer.isBuffer(openFile.body) ? openFile.body.toString() : String(openFile.text || "");
    assert.equal(fileText, "resumePdf:resume-b");
    const seen = await request(app).get(`/api/profile/${idB}`).set(auth(tokenA));
    assert.equal(seen.body.profile.name, "רבקה לוי");
    assert.equal(seen.body.profile.phone, undefined);
    assert.equal(JSON.stringify(seen.body).includes("0503333333"), false);
    assert.equal(seen.body.profile.resumeSize, 184);

    const forwardA = await request(app).post("/api/interest/send-to-manager").set(auth(tokenA)).send({ otherUserId: idB });
    assert.equal(forwardA.status, 200);

    const waiting = await request(app).get("/api/suggestions").set(auth(tokenB));
    assert.equal(waiting.body.active.length, 1);
    assert.equal(waiting.body.active[0].stage, "other-forwarded");
    assert.equal(waiting.body.active[0].otherForwarded, true);
    assert.equal(waiting.body.active[0].name, "אבי כהן");
    assert.equal(waiting.body.matchmaker.length, 0);
    const waitingA = await request(app).get("/api/suggestions").set(auth(tokenA));
    assert.equal(waitingA.body.active[0].stage, "forwarded");

    const forwardB = await request(app).post("/api/interest/send-to-manager").set(auth(tokenB)).send({ otherUserId: idA });
    assert.equal(forwardB.status, 200);
    const under = await request(app).get("/api/suggestions").set(auth(tokenA));
    assert.equal(under.body.matchmaker.length, 1);
    assert.equal(under.body.matchmaker[0].stage, "matchmaker");
    assert.equal(under.body.active.length, 0);
    assert.equal(JSON.stringify(under.body).includes("0503333333"), false);
    assert.equal(Object.hasOwn(under.body.matchmaker[0], "phone"), false);

    const admin = await createUser({ n: 39, role: "admin", idNumber: "311111119" });
    const pending = await request(app).get("/api/admin/pending-matches").set(auth(tokenFor(admin)));
    assert.equal(pending.status, 200);
    assert.equal(pending.body.matches.length, 1);
    assert.equal(pending.body.matches[0].stage, "matchmaker");
    assert.equal(JSON.stringify(pending.body).includes(PASSWORD), false);

    const declined = await request(app)
      .put("/api/interest/respond")
      .set(auth(tokenB))
      .send({ senderId: idA, status: "rejected" });
    assert.equal(declined.status, 200);

    const closedProfile = await request(app).get(`/api/profile/${idB}`).set(auth(tokenA));
    const closedFile = await request(app).get(`/api/files/${idB}/image`).set(auth(tokenA));
    assert.equal(closedProfile.status, 404);
    assert.equal(closedProfile.body.message, "הפרופיל לא נמצא");
    assert.equal(closedFile.status, 404);
    assert.equal(closedFile.body.message, "הקובץ לא נמצא");

    const after = await request(app).get("/api/suggestions").set(auth(tokenA));
    assert.equal(after.body.newSuggestions.length, 0);
    assert.equal(after.body.sent.length, 0);
    assert.equal(after.body.received.length, 0);
    assert.equal(after.body.active.length, 0);
    assert.equal(after.body.matchmaker.length, 0);
    const pendingAfter = await request(app).get("/api/admin/pending-matches").set(auth(tokenFor(admin)));
    assert.equal(pendingAfter.body.matches.length, 0);

    const legacy = await request(app).get("/api/interest/incoming").set(auth(tokenB));
    assert.equal(legacy.body.interests[0].status, "rejected");
    assert.equal(legacy.body.interests[0].sender.name, undefined);
    assert.equal(JSON.stringify(legacy.body).includes("אבי כהן"), false);
  });

  it("lets only the logged-in user change settings, and delete removes access", async () => {
    const owner = await createUser({ n: 41, name: "SETTINGS-OWNER", email: "owner@example.test", phone: "0504444444" });
    const other = await createUser({ n: 42, name: "SETTINGS-OTHER", email: "other@example.test" });
    const token = tokenFor(owner);
    const otherToken = tokenFor(other);
    await Profile.create([
      { user: owner._id, ...baseProfile({ gender: "male", age: 30 }), image: "owner-photo", resumePdf: "owner-resume" },
      { user: other._id, ...baseProfile({ gender: "female", age: 27 }) },
    ]);
    await request(app).post("/api/interest").set(auth(otherToken)).send({ receiverId: String(owner._id) });
    await request(app).put("/api/interest/respond").set(auth(token)).send({ senderId: String(other._id), status: "accepted" });
    const beforeDelete = await request(app).get(`/api/files/${owner._id}/image`).set(auth(otherToken));
    assert.equal(beforeDelete.status, 200);

    const anon = await request(app).get("/api/settings");
    assert.equal(anon.status, 401);

    const initial = await request(app).get("/api/settings").set(auth(token));
    assert.equal(initial.status, 200);
    assert.equal(initial.body.settings.email, "owner@example.test");
    assert.equal(initial.body.settings.phone, "0504444444");
    assert.equal(initial.body.settings.language, "he");
    assert.equal(initial.body.settings.pauseSuggestions, false);
    assert.equal(initial.body.settings.notifications.newSuggestion, true);
    assert.equal(initial.body.settings.notifications.emailDigest, false);
    const settingsBlob = JSON.stringify(initial.body);
    assert.equal(settingsBlob.includes("idNumber"), false);
    assert.equal(settingsBlob.includes("password"), false);
    assert.equal(settingsBlob.includes("token"), false);

    const saved = await request(app).patch("/api/settings").set(auth(token)).send({
      userId: String(other._id),
      phone: "0505555555",
      language: "en",
      pauseSuggestions: true,
      showMatchPercent: false,
      minMatchPercent: 80,
      notifications: { emailDigest: true, newSuggestion: false },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.settings.phone, "0505555555");
    assert.equal(saved.body.settings.language, "en");
    assert.equal(saved.body.settings.pauseSuggestions, true);
    assert.equal(saved.body.settings.minMatchPercent, 80);
    assert.equal(saved.body.settings.notifications.emailDigest, true);
    assert.equal(saved.body.settings.notifications.newSuggestion, false);
    assert.equal(saved.body.settings.notifications.interestReceived, true);

    const otherSettings = await request(app).get("/api/settings").set(auth(otherToken));
    assert.equal(otherSettings.body.settings.phone, null);
    assert.equal(otherSettings.body.settings.language, "he");
    assert.equal(otherSettings.body.settings.pauseSuggestions, false);

    const badPhone = await request(app).patch("/api/settings").set(auth(token)).send({ phone: "12" });
    assert.equal(badPhone.status, 400);
    assert.equal(badPhone.body.message, "מספר הטלפון אינו תקין");
    const badLanguage = await request(app).patch("/api/settings").set(auth(token)).send({ language: "fr" });
    assert.equal(badLanguage.status, 400);
    assert.match(badLanguage.body.message, /שפה/);
    const badPercent = await request(app).patch("/api/settings").set(auth(token)).send({ minMatchPercent: -1 });
    assert.equal(badPercent.status, 400);
    assert.match(badPercent.body.message, /אחוז התאמה/);

    const wrongPassword = await request(app)
      .post("/api/settings/password")
      .set(auth(token))
      .send({ currentPassword: "Wrongpass1", newPassword: "Newpass12" });
    assert.equal(wrongPassword.status, 400);
    assert.equal(wrongPassword.body.message, "הסיסמה הנוכחית שגויה");

    const changed = await request(app)
      .post("/api/settings/password")
      .set(auth(token))
      .send({ currentPassword: PASSWORD, newPassword: "Newpass12" });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.token, undefined);
    const oldLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: PASSWORD });
    assert.equal(oldLogin.status, 401);
    const newLogin = await request(app).post("/api/auth/login").send({ email: owner.email, password: "Newpass12" });
    assert.equal(newLogin.status, 200);

    const staleToken = await request(app).get("/api/settings").set(auth(token));
    assert.equal(staleToken.status, 401);
    assert.equal(staleToken.body.message, "פג תוקף ההתחברות, יש להתחבר מחדש");

    const removed = await request(app)
      .delete("/api/settings")
      .set(auth(newLogin.body.token))
      .send({ currentPassword: "Newpass12" });
    assert.equal(removed.status, 200);
    assert.equal(removed.body.message, "החשבון נמחק");
    assert.equal(await User.countDocuments({ _id: owner._id }), 0);
    assert.equal(await Profile.countDocuments({ user: owner._id }), 0);
    assert.equal(await Interest.countDocuments({ $or: [{ sender: owner._id }, { receiver: owner._id }] }), 0);

    const afterToken = await request(app).get("/api/settings").set(auth(token));
    assert.equal(afterToken.status, 401);
    const afterFile = await request(app).get(`/api/files/${owner._id}/image`).set(auth(otherToken));
    assert.equal(afterFile.status, 404);
    const afterProfile = await request(app).get(`/api/profile/${owner._id}`).set(auth(otherToken));
    assert.equal(afterProfile.status, 404);
  });

  it("shows marital status before approval and lets it change the match percent", async () => {
    const viewer = await createUser({ n: 61 });
    const single = await createUser({ n: 62, name: "STATUS-SINGLE" });
    const divorced = await createUser({ n: 63, name: "STATUS-DIVORCED" });
    const traits = { city: "Haifa", style: "modern", appearance: "average", ethnicity: "ashkenazi" };
    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "female", age: 25, maritalStatus: "single", financialDemand: 100, financialParticipation: 200, ...traits }) },
      { user: single._id, ...baseProfile({ gender: "male", age: 28, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
      { user: divorced._id, ...baseProfile({ gender: "male", age: 28, maritalStatus: "divorced", financialDemand: 50, financialParticipation: 150, ...traits }) },
    ]);

    const listed = await request(app).get("/api/match/candidates").set(auth(tokenFor(viewer)));
    assert.equal(listed.status, 200, JSON.stringify(listed.body));
    const singleCard = listed.body.candidates.find((card) => String(card._id) === String(single._id));
    const divorcedCard = listed.body.candidates.find((card) => String(card._id) === String(divorced._id));
    assert.ok(singleCard);
    assert.ok(divorcedCard);
    assert.equal(singleCard.maritalStatus, "single");
    assert.equal(divorcedCard.maritalStatus, "divorced");
    assert.equal(singleCard.name, undefined);
    assert.ok(singleCard.matchPercent > divorcedCard.matchPercent);
  });

  it("tells a paused user why a new interest is blocked, and still accepts a reply", async () => {
    const paused = await createUser({ n: 71, name: "PAUSED-SENDER" });
    const target = await createUser({ n: 72, name: "OPEN-TARGET" });
    const stranger = await createUser({ n: 75, name: "OPEN-STRANGER" });
    const traits = { city: "Haifa", style: "modern", appearance: "average", ethnicity: "ashkenazi" };
    await Profile.create([
      { user: paused._id, ...baseProfile({ gender: "female", age: 25, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
      { user: target._id, ...baseProfile({ gender: "male", age: 28, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
      { user: stranger._id, ...baseProfile({ gender: "male", age: 27, maritalStatus: "single", financialDemand: 50, financialParticipation: 150, ...traits }) },
    ]);

    const incoming = await request(app)
      .post("/api/interest")
      .set(auth(tokenFor(target)))
      .send({ receiverId: String(paused._id) });
    assert.equal(incoming.status, 201, JSON.stringify(incoming.body));

    await User.updateOne({ _id: paused._id }, { pauseSuggestions: true });

    const blocked = await request(app)
      .post("/api/interest")
      .set(auth(tokenFor(paused)))
      .send({ receiverId: String(stranger._id) });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.message, "קבלת ההצעות מושהית. בטלו את ההשהיה כדי לשלוח התעניינות חדשה");
    assert.equal(await Interest.countDocuments({ sender: paused._id }), 0);

    const reply = await request(app)
      .post("/api/interest")
      .set(auth(tokenFor(paused)))
      .send({ receiverId: String(target._id) });
    assert.equal(reply.status, 201, JSON.stringify(reply.body));
    assert.equal(reply.body.interest.status, "accepted");

    const choosy = await createUser({ n: 73, minMatchPercent: 100 });
    const weak = await createUser({ n: 74, name: "WEAK-MATCH" });
    await Profile.create([
      { user: choosy._id, ...baseProfile({ gender: "female", age: 25, ...traits }) },
      { user: weak._id, ...baseProfile({ gender: "male", age: 28, city: "Elad", style: "conservative", appearance: "slim", ethnicity: "sephardic" }) },
    ]);
    const hidden = await request(app)
      .post("/api/interest")
      .set(auth(tokenFor(choosy)))
      .send({ receiverId: String(weak._id) });
    assert.equal(hidden.status, 404);
    assert.equal(hidden.body.message, "המשתמש לא נמצא");
  });

  it("requires the current password to change email or delete the account", async () => {
    const owner = await createUser({ n: 81, email: "keep-me@example.test" });
    const token = tokenFor(owner);

    const missing = await request(app).patch("/api/settings").set(auth(token)).send({ email: "next@example.test" });
    assert.equal(missing.status, 400);
    assert.equal(missing.body.message, "יש להזין את הסיסמה הנוכחית");

    const wrong = await request(app)
      .patch("/api/settings")
      .set(auth(token))
      .send({ email: "next@example.test", currentPassword: "Wrongpass1" });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.body.message, "הסיסמה הנוכחית שגויה");

    const cleared = await request(app).patch("/api/settings").set(auth(token)).send({ email: "" });
    assert.equal(cleared.status, 400);
    assert.equal(cleared.body.message, "לא ניתן למחוק את כתובת האימייל");
    const nulled = await request(app).patch("/api/settings").set(auth(token)).send({ email: null });
    assert.equal(nulled.status, 400);
    assert.equal(nulled.body.message, "לא ניתן למחוק את כתובת האימייל");

    const changed = await request(app)
      .patch("/api/settings")
      .set(auth(token))
      .send({ email: "next@example.test", currentPassword: PASSWORD });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    assert.equal(changed.body.settings.email, "next@example.test");

    const same = await request(app).patch("/api/settings").set(auth(token)).send({ email: "next@example.test", phone: "0506666666" });
    assert.equal(same.status, 200, JSON.stringify(same.body));
    assert.equal(same.body.settings.phone, "0506666666");

    const deleteMissing = await request(app).delete("/api/settings").set(auth(token));
    assert.equal(deleteMissing.status, 400);
    assert.equal(deleteMissing.body.message, "יש להזין את הסיסמה הנוכחית");
    const deleteWrong = await request(app).delete("/api/settings").set(auth(token)).send({ currentPassword: "Wrongpass1" });
    assert.equal(deleteWrong.status, 400);
    assert.equal(deleteWrong.body.message, "הסיסמה הנוכחית שגויה");
    assert.equal(await User.countDocuments({ _id: owner._id }), 1);

    const removed = await request(app).delete("/api/settings").set(auth(token)).send({ currentPassword: PASSWORD });
    assert.equal(removed.status, 200);
    assert.equal(await User.countDocuments({ _id: owner._id }), 0);
  });

  it("rejects money and age values outside their limits", async () => {
    const user = await createUser({ n: 91 });
    const token = tokenFor(user);
    const headers = auth(token);

    const tooMuch = await request(app)
      .post("/api/profile")
      .set(headers)
      .send(baseProfile({ financialDemand: 100000001, financialParticipation: 10 }));
    assert.equal(tooMuch.status, 400);
    assert.equal(tooMuch.body.message, "ערך לא תקין בשדה דרישה כספית");

    const negative = await request(app)
      .post("/api/profile")
      .set(headers)
      .send(baseProfile({ financialDemand: 10, financialParticipation: -1 }));
    assert.equal(negative.status, 400);
    assert.equal(negative.body.message, "ערך לא תקין בשדה השתתפות כספית");

    const saved = await request(app)
      .post("/api/profile")
      .set(headers)
      .send({ ...baseProfile({ financialDemand: 100000000, financialParticipation: 0 }), phone: "0521234567" });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.equal(saved.body.profile.financialDemand, 100000000);
    assert.equal(saved.body.profile.financialParticipation, 0);

    const young = await request(app).post("/api/preference").set(headers).send({ ageMin: 17, ageMax: 30 });
    assert.equal(young.status, 400);
    assert.equal(young.body.message, "ערך לא תקין בשדה גיל מינימלי");

    const old = await request(app).post("/api/preference").set(headers).send({ ageMin: 20, ageMax: 100 });
    assert.equal(old.status, 400);
    assert.equal(old.body.message, "ערך לא תקין בשדה גיל מקסימלי");

    const backwards = await request(app).post("/api/preference").set(headers).send({ ageMin: 40, ageMax: 30 });
    assert.equal(backwards.status, 400);
    assert.equal(backwards.body.message, "הערך המינימלי של הגיל גדול מהערך המקסימלי");

    const ages = await request(app).post("/api/preference").set(headers).send({ ageMin: 18, ageMax: 99 });
    assert.equal(ages.status, 201, JSON.stringify(ages.body));
    assert.equal(ages.body.preferences.ageMin, 18);
    assert.equal(ages.body.preferences.ageMax, 99);
  });

  it("registers and logs in with email and password, and does not use an ID number", async () => {
    const created = await request(app).post("/api/auth/register").send({
      email: "new-user@example.test",
      password: PASSWORD,
      idNumber: "123456789",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.user.email, "new-user@example.test");
    assert.equal(created.body.user.idNumber, undefined);
    assert.equal(JSON.stringify(created.body).includes("123456789"), false);
    assert.equal(created.body.user.name, "new user");

    const stored = await User.findById(created.body.user._id).lean();
    assert.equal(stored.idNumber, undefined);
    assert.equal(stored.email, "new-user@example.test");

    const again = await request(app).post("/api/auth/register").send({
      email: "new-user@example.test",
      password: PASSWORD,
    });
    assert.equal(again.status, 201);
    assert.equal(String(again.body.user._id), String(created.body.user._id));

    const clash = await request(app).post("/api/auth/register").send({
      email: "new-user@example.test",
      password: "Otherpass1",
    });
    assert.equal(clash.status, 409);

    const missing = await request(app).post("/api/auth/login").send({ password: PASSWORD });
    assert.equal(missing.status, 400);
    const byId = await request(app).post("/api/auth/login").send({ idNumber: "123456789", password: PASSWORD });
    assert.equal(byId.status, 400);
    const wrong = await request(app).post("/api/auth/login").send({ email: "new-user@example.test", password: "Otherpass1" });
    assert.equal(wrong.status, 401);

    const loggedIn = await request(app).post("/api/auth/login").send({
      email: "New-User@example.test",
      password: PASSWORD,
    });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    assert.equal(loggedIn.body.user.idNumber, undefined);
    const me = await request(app).get("/api/auth/me").set(auth(loggedIn.body.token));
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, "new-user@example.test");
    assert.equal(me.body.user.idNumber, undefined);
  });

  it("keeps a declined suggestion without identity, and re-checks approval on the next read", async () => {
    const viewer = await createUser({ n: 101, name: "DECLINE-VIEWER", email: "decline-viewer@example.test" });
    const other = await createUser({ n: 102, name: "DECLINE-OTHER", email: "decline-other@example.test", phone: "0507777777" });
    await Profile.create([
      { user: viewer._id, ...baseProfile({ gender: "female", age: 24, city: "Haifa" }) },
      {
        user: other._id,
        ...baseProfile({ gender: "male", age: 28, city: "Elad", maritalStatus: "single", financialDemand: 40, financialParticipation: 80 }),
        image: "secret-image",
        resumePdf: "secret-resume",
      },
    ]);

    const sent = await request(app)
      .post("/api/interest")
      .set(auth(tokenFor(viewer)))
      .send({ receiverId: String(other._id) });
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    const approved = await request(app)
      .put("/api/interest/respond")
      .set(auth(tokenFor(other)))
      .send({ senderId: String(viewer._id), status: "accepted" });
    assert.equal(approved.status, 200);

    const open = await request(app).get(`/api/profile/${other._id}`).set(auth(tokenFor(viewer)));
    assert.equal(open.status, 200);
    assert.equal(open.body.profile.name, "DECLINE-OTHER");

    const declined = await request(app)
      .put("/api/interest/respond")
      .set(auth(tokenFor(viewer)))
      .send({ senderId: String(other._id), status: "rejected" });
    assert.equal(declined.status, 200);

    const lists = await request(app).get("/api/suggestions").set(auth(tokenFor(viewer)));
    assert.equal(lists.status, 200);
    assert.equal(lists.body.declined.length, 1);
    assert.equal(lists.body.active.length, 0);
    assert.equal(lists.body.matchmaker.length, 0);
    assert.equal(lists.body.sent.length, 0);
    assert.equal(lists.body.received.length, 0);
    const row = lists.body.declined[0];
    assert.equal(row.stage, "declined");
    assert.equal(row.declinedByViewer, true);
    assert.equal(row.receiver.age, 28);
    assert.equal(row.receiver.city, "Elad");
    assert.equal(row.receiver.maritalStatus, "single");
    assert.equal(row.receiver.financialDemand, 40);
    assert.equal(row.receiver.matchPercent, undefined);
    const blob = JSON.stringify(lists.body.declined);
    for (const secret of ["DECLINE-OTHER", "decline-other@example.test", "0507777777", "secret-image", "secret-resume"]) {
      assert.equal(blob.includes(secret), false, secret);
    }

    const otherLists = await request(app).get("/api/suggestions").set(auth(tokenFor(other)));
    assert.equal(otherLists.body.declined.length, 1);
    assert.equal(otherLists.body.declined[0].declinedByViewer, false);
    assert.equal(JSON.stringify(otherLists.body.declined).includes("DECLINE-VIEWER"), false);

    const closed = await request(app).get(`/api/profile/${other._id}`).set(auth(tokenFor(viewer)));
    const closedFile = await request(app).get(`/api/files/${other._id}/image`).set(auth(tokenFor(viewer)));
    assert.equal(closed.status, 404);
    assert.equal(closedFile.status, 404);
    assert.equal(await Interest.countDocuments({ status: "rejected" }), 1);

    const again = await request(app).get("/api/suggestions").set(auth(tokenFor(viewer)));
    assert.equal(again.body.declined.length, 1);
    assert.equal(JSON.stringify(again.body.declined).includes("DECLINE-OTHER"), false);
  });
});
