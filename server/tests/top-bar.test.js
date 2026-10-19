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

const PASSWORD = "Password1";
const RIVKA_NAME = "SECRET-RIVKA-NAME";
const RIVKA_EMAIL = "leak-rivka@private.test";
const RIVKA_PHONE = "0509998877";
const RIVKA_ID = "123456782";
const RIVKA_IMAGE = "leak-image-rivka";
const RIVKA_RESUME = "leak-resume-rivka";
const OTHER_NAME = "SECRET-OTHER-NAME";
const OTHER_CITY = "עיר-אחרת";
const PUBLIC_CITY = "עיר-גלויה";

const SECRETS = [RIVKA_NAME, RIVKA_EMAIL, RIVKA_PHONE, RIVKA_ID, RIVKA_IMAGE, RIVKA_RESUME, OTHER_NAME, PASSWORD];
const IDENTITY_KEYS = ["name", "email", "phone", "idNumber", "password", "image", "resumePdf", "photo", "resume", "contact"];

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role || "user", user.tokenVersion || 0);

const assertNoSecrets = (body, markers = SECRETS) => {
  const serialized = JSON.stringify(body);
  for (const marker of markers) {
    assert.equal(serialized.includes(marker), false, `response leaked ${marker}: ${serialized}`);
  }
  const keys = new Set();
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      walk(child);
    }
  };
  walk(body);
  for (const key of IDENTITY_KEYS) {
    assert.equal(keys.has(key), false, `identifying key ${key} present`);
  }
};

describe("top bar search and notifications", { timeout: 180000 }, () => {
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
    const [viewer, rivka, other, admin] = await Promise.all([
      User.create({ name: "VIEWER-SECRET-NAME", email: "viewer@private.test", password: PASSWORD, role: "user" }),
      User.create({
        name: RIVKA_NAME,
        email: RIVKA_EMAIL,
        phone: RIVKA_PHONE,
        idNumber: RIVKA_ID,
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: OTHER_NAME,
        email: "other@private.test",
        idNumber: "109876543",
        password: PASSWORD,
        role: "user",
      }),
      User.create({ name: "ADMIN-NAME", email: "admin@private.test", password: PASSWORD, role: "admin" }),
    ]);

    await Profile.create([
      { user: viewer._id, gender: "male", age: 28, city: "תל אביב", occupation: "מהנדס" },
      {
        user: rivka._id,
        gender: "female",
        age: 24,
        city: PUBLIC_CITY,
        occupation: "מורה",
        description: "public about text",
        image: RIVKA_IMAGE,
        resumePdf: RIVKA_RESUME,
      },
      { user: other._id, gender: "male", age: 30, city: OTHER_CITY, occupation: "נגר" },
    ]);

    return { viewer, rivka, other, admin };
  };

  const search = (token, q) => request(app).get("/api/search").query({ q }).set(auth(token));

  it("requires a login", async () => {
    const response = await request(app).get("/api/search").query({ q: PUBLIC_CITY });
    assert.equal(response.status, 401);
    const notes = await request(app).get("/api/notifications");
    assert.equal(notes.status, 401);
  });

  it("searches visible fields and hides identity until mutual approval", async () => {
    const { viewer, rivka, admin } = await seed();
    const viewerToken = tokenFor(viewer);
    const adminToken = tokenFor(admin);

    const byCity = await search(viewerToken, PUBLIC_CITY);
    assert.equal(byCity.status, 200);
    assert.equal(byCity.body.results.length, 1);
    assert.equal(byCity.body.results[0].title, "בת 24");
    assert.equal(byCity.body.results[0].subtitle.includes(PUBLIC_CITY), true);
    assert.equal(byCity.body.results[0].href, `/suggestions/new/${rivka._id}`);
    assertNoSecrets(byCity.body);

    for (const secret of [RIVKA_NAME, RIVKA_EMAIL, RIVKA_PHONE, RIVKA_ID, RIVKA_IMAGE, OTHER_NAME, OTHER_CITY]) {
      const hidden = await search(viewerToken, secret);
      assert.equal(hidden.status, 200, secret);
      assert.deepEqual(hidden.body.results, [], secret);
      assertNoSecrets(hidden.body);
    }

    const asAdmin = await search(adminToken, OTHER_NAME);
    assert.equal(asAdmin.status, 200);
    assert.equal(asAdmin.body.results.length, 1);
    assert.equal(asAdmin.body.results[0].title, OTHER_NAME);
    assert.equal(asAdmin.body.results[0].href, "/admin/users");
    assert.equal(JSON.stringify(asAdmin.body).includes("109876543"), false);
    assert.equal(JSON.stringify(asAdmin.body).includes(RIVKA_EMAIL), false);

    const adminId = await search(adminToken, RIVKA_ID);
    assert.deepEqual(adminId.body.results, []);
    assert.equal(JSON.stringify(adminId.body).includes(RIVKA_ID), false);

    await Interest.create({ sender: rivka._id, receiver: viewer._id, status: "pending" });

    const pendingNotes = await request(app).get("/api/notifications").set(auth(viewerToken));
    assert.equal(pendingNotes.status, 200);
    assert.equal(pendingNotes.body.notifications.length, 1);
    assert.equal(pendingNotes.body.notifications[0].type, "interestReceived");
    assert.equal(pendingNotes.body.notifications[0].title, "התקבלה התעניינות");
    assert.equal(pendingNotes.body.unreadCount, 1);
    assert.equal(pendingNotes.body.mailCount, 1);
    assertNoSecrets(pendingNotes.body);

    const noticeId = pendingNotes.body.notifications[0].id;
    const outsider = await request(app).post(`/api/notifications/${noticeId}/read`).set(auth(tokenFor(rivka)));
    assert.equal(outsider.status, 404);

    const marked = await request(app).post(`/api/notifications/${noticeId}/read`).set(auth(viewerToken));
    assert.equal(marked.status, 204);
    const afterRead = await request(app).get("/api/notifications").set(auth(viewerToken));
    assert.equal(afterRead.body.unreadCount, 0);
    assert.equal(afterRead.body.mailCount, 0);
    assertNoSecrets(afterRead.body);

    await User.updateOne({ _id: viewer._id }, { $set: { "notifications.interestReceived": false } });
    const muted = await request(app).get("/api/notifications").set(auth(viewerToken));
    assert.deepEqual(muted.body.notifications, []);
    assertNoSecrets(muted.body);

    await User.updateOne({ _id: viewer._id }, { $set: { "notifications.interestReceived": true } });
    await Interest.updateOne({ sender: rivka._id, receiver: viewer._id }, { $set: { status: "accepted" } });

    const byName = await search(viewerToken, RIVKA_NAME);
    assert.equal(byName.status, 200);
    assert.equal(byName.body.results.length, 1);
    assert.equal(byName.body.results[0].title, RIVKA_NAME);
    assert.equal(byName.body.results[0].href, `/active/${rivka._id}`);
    assert.equal(JSON.stringify(byName.body).includes(RIVKA_EMAIL), false);
    assert.equal(JSON.stringify(byName.body).includes(RIVKA_PHONE), false);
    assert.equal(JSON.stringify(byName.body).includes(RIVKA_ID), false);
    assert.equal(JSON.stringify(byName.body).includes(RIVKA_IMAGE), false);

    const byEmail = await search(viewerToken, RIVKA_EMAIL);
    assert.equal(byEmail.body.results.length, 1);
    assert.equal(byEmail.body.results[0].title, RIVKA_NAME);
    assert.equal(JSON.stringify(byEmail.body).includes(RIVKA_EMAIL), false);

    const byPhone = await search(viewerToken, RIVKA_PHONE);
    assert.deepEqual(byPhone.body.results, []);
    assert.equal(JSON.stringify(byPhone.body).includes(RIVKA_PHONE), false);

    const byImage = await search(viewerToken, RIVKA_IMAGE);
    assert.deepEqual(byImage.body.results, []);
    assert.equal(JSON.stringify(byImage.body).includes(RIVKA_IMAGE), false);

    const revealed = await request(app).get("/api/notifications").set(auth(viewerToken));
    assert.equal(revealed.body.notifications.length, 1);
    assert.equal(revealed.body.notifications[0].type, "activeSuggestion");
    assert.equal(revealed.body.notifications[0].detail.includes(RIVKA_NAME), true);
    assert.equal(JSON.stringify(revealed.body).includes(RIVKA_EMAIL), false);
    assert.equal(JSON.stringify(revealed.body).includes(RIVKA_PHONE), false);

    await Interest.updateOne(
      { sender: rivka._id, receiver: viewer._id },
      { $set: { senderApprovedToManager: true, receiverApprovedToManager: true } }
    );
    const handled = await search(viewerToken, RIVKA_NAME);
    assert.equal(handled.body.results.length, 1);
    assert.equal(handled.body.results[0].href, `/matchmaker/${rivka._id}`);
    assert.equal(JSON.stringify(handled.body).includes(RIVKA_EMAIL), false);
    assert.equal(JSON.stringify(handled.body).includes(RIVKA_PHONE), false);
    assert.equal(JSON.stringify(handled.body).includes(RIVKA_ID), false);
    const started = await request(app).get("/api/notifications").set(auth(viewerToken));
    const matchmakerNote = started.body.notifications.find((item) => item.type === "matchmakerStarted");
    assert.ok(matchmakerNote);
    assert.equal(matchmakerNote.href, `/matchmaker/${rivka._id}`);
    assert.equal(JSON.stringify(started.body).includes(RIVKA_EMAIL), false);
    assert.equal(JSON.stringify(started.body).includes(RIVKA_PHONE), false);
    assert.equal(JSON.stringify(started.body).includes(RIVKA_ID), false);
    const adminNotes = await request(app).get("/api/notifications").set(auth(adminToken));
    assert.equal(adminNotes.body.notifications.length, 1);
    assert.equal(adminNotes.body.notifications[0].type, "adminCase");
    assert.equal(adminNotes.body.notifications[0].detail.includes(RIVKA_NAME), true);
    assert.equal(adminNotes.body.mailCount, 1);
    assert.equal(JSON.stringify(adminNotes.body).includes(RIVKA_ID), false);
    assert.equal(JSON.stringify(adminNotes.body).includes(RIVKA_EMAIL), false);

    await request(app).post("/api/notifications/read-all").set(auth(adminToken));
    const adminRead = await request(app).get("/api/notifications").set(auth(adminToken));
    assert.equal(adminRead.body.unreadCount, 0);
    assert.equal(adminRead.body.mailCount, 1);

    await Interest.updateOne({ sender: rivka._id, receiver: viewer._id }, { $set: { status: "rejected" } });
    const cleared = await request(app).get("/api/notifications").set(auth(viewerToken));
    assert.deepEqual(cleared.body.notifications, []);
    const hiddenAgain = await search(viewerToken, RIVKA_NAME);
    assert.deepEqual(hiddenAgain.body.results, []);
    assertNoSecrets(hiddenAgain.body);
  });
});
