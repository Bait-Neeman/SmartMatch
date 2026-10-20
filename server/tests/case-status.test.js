process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const { generateToken } = require("../src/config/jwt");
const User = require("../src/models/user.model");
const Profile = require("../src/models/profile.model");
const Interest = require("../src/models/interest.model");
const AdminCase = require("../src/models/adminCase.model");

const PASSWORD = "AdminPass12";
const NOTE = "SECRET-ADMIN-NOTE";
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role);

const idsOf = (list) => new Set((list || []).map((item) => String(item._id)));

describe("matchmaker case statuses", () => {
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

  const seed = async () => {
    const [admin, boy, girl, other] = await Promise.all([
      User.create({ name: "הרב חיים שטרן", email: "admin@example.test", password: PASSWORD, role: "admin" }),
      User.create({ name: "יוסי כהן", email: "yossi@example.test", password: PASSWORD, phone: "0501111111" }),
      User.create({ name: "שרה לוי", email: "sara@example.test", password: PASSWORD, phone: "0502222222" }),
      User.create({ name: "רחל כהן", email: "rachel@example.test", password: PASSWORD, phone: "0503333333" }),
    ]);
    await Profile.create([
      { user: boy._id, gender: "male", age: 27, city: "מודיעין עילית", yeshiva: "ישיבה גבוהה" },
      { user: girl._id, gender: "female", age: 24, city: "ירושלים", seminar: "סמינר" },
      { user: other._id, gender: "female", age: 25, city: "בני ברק", seminar: "סמינר אחר" },
    ]);
    const interest = await Interest.create({
      sender: boy._id,
      receiver: girl._id,
      status: "accepted",
      senderApprovedToManager: true,
      receiverApprovedToManager: true,
    });
    return { admin, boy, girl, other, interest };
  };

  const suggestions = (user) => request(app).get("/api/suggestions").set(auth(tokenFor(user)));

  it("starts a forwarded case at הועבר לשדכן and records each change", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));
    const id = String(fixture.interest._id);

    const opened = await request(app).get("/api/admin/cases").set(headers);
    assert.equal(opened.status, 200);
    assert.equal(opened.body.cases[0].status, "new");
    assert.equal(opened.body.cases[0].label, "הועבר לשדכן");
    assert.deepEqual(opened.body.cases[0].history, []);

    const coordinating = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({ action: "coordinating" });
    assert.equal(coordinating.status, 200);
    assert.equal(coordinating.body.case.status, "coordinating");
    assert.equal(coordinating.body.case.history.length, 1);
    assert.equal(coordinating.body.case.history[0].changedBy.name, "הרב חיים שטרן");
    assert.equal(coordinating.body.case.history[0].source, "admin");

    const labels = ["פגישה ראשונה", "פגישה שנייה", "פגישה שלישית", "פגישה 4"];
    for (let step = 1; step <= 4; step += 1) {
      const meeting = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({ action: "nextMeeting" });
      assert.equal(meeting.status, 200, JSON.stringify(meeting.body));
      assert.equal(meeting.body.case.status, "meeting");
      assert.equal(meeting.body.case.meetingNumber, step);
      assert.equal(typeof meeting.body.case.meetingNumber, "number");
      assert.equal(meeting.body.case.label, labels[step - 1]);
    }

    for (const meetingNumber of [0, -1, 1.5, 100]) {
      const rejected = await request(app)
        .patch(`/api/admin/cases/${id}`)
        .set(headers)
        .send({ status: "meeting", meetingNumber });
      assert.equal(rejected.status, 400, String(meetingNumber));
    }
    for (const status of ["closed", "in_progress", "active"]) {
      const rejected = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({ status });
      assert.equal(rejected.status, 400, status);
    }
    const missingNumber = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({ status: "meeting" });
    assert.equal(missingNumber.status, 400);
    const endedWithNumber = await request(app)
      .patch(`/api/admin/cases/${id}`)
      .set(headers)
      .send({ status: "ended", meetingNumber: 2 });
    assert.equal(endedWithNumber.status, 400);
  });

  it("returns people to new suggestions after השידוך ירד, except the same pair", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));
    const id = String(fixture.interest._id);

    const blocked = await suggestions(fixture.boy);
    assert.equal(blocked.status, 200);
    assert.equal(blocked.body.newSuggestions.length, 0);
    const hiddenFromOther = await suggestions(fixture.other);
    assert.equal(idsOf(hiddenFromOther.body.newSuggestions).has(String(fixture.boy._id)), false);

    const ended = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({ action: "ended" });
    assert.equal(ended.body.case.status, "ended");
    const users = await request(app).get("/api/admin/users").set(headers);
    const boy = users.body.users.find((user) => String(user._id) === String(fixture.boy._id));
    assert.equal(boy.status, "ended");
    assert.notEqual(boy.status, "engaged");

    const after = await suggestions(fixture.boy);
    const afterIds = idsOf(after.body.newSuggestions);
    assert.equal(afterIds.has(String(fixture.other._id)), true);
    assert.equal(afterIds.has(String(fixture.girl._id)), false);
    const otherSees = idsOf((await suggestions(fixture.other)).body.newSuggestions);
    assert.equal(otherSees.has(String(fixture.boy._id)), true);

    const engaged = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({ action: "engaged" });
    assert.equal(engaged.body.case.status, "engaged");
    assert.equal(engaged.body.case.label, "התארסו");
    assert.equal((await suggestions(fixture.boy)).body.newSuggestions.length, 0);
    assert.equal((await suggestions(fixture.girl)).body.newSuggestions.length, 0);
    assert.equal(idsOf((await suggestions(fixture.other)).body.newSuggestions).has(String(fixture.boy._id)), false);

    const summary = await request(app).get("/api/admin/summary").set(headers);
    assert.equal(summary.body.engaged.total, 1);
    assert.equal(summary.body.ended.total, 0);
  });

  it("maps old closed and in_progress rows without treating closed as engaged", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));
    const second = await Interest.create({
      sender: fixture.boy._id,
      receiver: fixture.other._id,
      status: "accepted",
      senderApprovedToManager: true,
      receiverApprovedToManager: true,
    });
    await AdminCase.collection.insertMany([
      { interest: fixture.interest._id, status: "closed", note: NOTE, history: [], createdAt: new Date(), updatedAt: new Date() },
      { interest: second._id, status: "in_progress", history: [], createdAt: new Date(), updatedAt: new Date() },
    ]);

    const cases = await request(app).get("/api/admin/cases").set(headers);
    const byId = new Map(cases.body.cases.map((item) => [String(item._id), item]));
    const closed = byId.get(String(fixture.interest._id));
    const progress = byId.get(String(second._id));
    assert.equal(closed.status, "ended");
    assert.notEqual(closed.status, "engaged");
    assert.equal(closed.history[0].source, "migration");
    assert.equal(closed.history[0].legacyStatus, "closed");
    assert.equal(progress.status, "coordinating");
    assert.equal(progress.history[0].legacyStatus, "in_progress");

    const users = await request(app).get("/api/admin/users").set(headers);
    const boy = users.body.users.find((user) => String(user._id) === String(fixture.boy._id));
    assert.equal(boy.status, "in_process");

    const couple = await suggestions(fixture.boy);
    const row = couple.body.matchmaker.find((item) => item.name === "שרה לוי");
    assert.equal(row.caseStageLabel, "השידוך ירד");
    assert.equal(JSON.stringify(couple.body).includes(NOTE), false);
    assert.equal(JSON.stringify(couple.body).includes("0502222222"), false);
  });
});
