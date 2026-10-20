process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const { generateToken } = require("../src/config/jwt");
const { setStoredFileReader } = require("../src/services/storage.service");
const User = require("../src/models/user.model");
const Profile = require("../src/models/profile.model");
const Interest = require("../src/models/interest.model");
const AdminSettings = require("../src/models/adminSettings.model");

const PASSWORD = "AdminPass12";
const BOY_PHOTO = "secret-hide-photo-boy";
const GIRL_PHOTO = "secret-hide-photo-girl";
const BOY_RESUME = "secret-hide-resume-boy";
const GIRL_RESUME = "secret-hide-resume-girl";

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role);
const imagePath = (user) => `/api/files/${user._id}/image`;
const resumePath = (user) => `/api/files/${user._id}/resume`;

const fileBody = (response) =>
  Buffer.isBuffer(response.body) ? response.body.toString() : String(response.text || "");

describe("hide female photos", () => {
  let mongo;

  before(async () => {
    setStoredFileReader(async (kind, publicId) => ({
      body: Buffer.from(`${kind}:${publicId}`),
      contentType: kind === "image" ? "image/jpeg" : "application/pdf",
      filename: kind === "image" ? "photo.jpg" : "resume.pdf",
    }));
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
    const [admin, otherAdmin, boy, girl] = await Promise.all([
      User.create({
        name: "הרב חיים שטרן",
        email: "hide-admin@example.test",
        idNumber: "300000030",
        password: PASSWORD,
        role: "admin",
      }),
      User.create({
        name: "הרב אחר",
        email: "hide-other-admin@example.test",
        idNumber: "300000031",
        password: PASSWORD,
        role: "admin",
      }),
      User.create({
        name: "יוסי כהן",
        email: "hide-boy@example.test",
        idNumber: "300000032",
        password: PASSWORD,
        role: "user",
        phone: "0501111111",
      }),
      User.create({
        name: "שרה לוי",
        email: "hide-girl@example.test",
        idNumber: "300000033",
        password: PASSWORD,
        role: "user",
        phone: "0522222222",
      }),
    ]);

    await Profile.create([
      {
        user: boy._id,
        gender: "male",
        age: 27,
        city: "מודיעין עילית",
        yeshiva: "ישיבה גבוהה",
        image: BOY_PHOTO,
        resumePdf: BOY_RESUME,
      },
      {
        user: girl._id,
        gender: "female",
        age: 24,
        city: "ירושלים",
        seminar: "סמינר",
        image: GIRL_PHOTO,
        resumePdf: GIRL_RESUME,
      },
    ]);

    const interest = await Interest.create({
      sender: boy._id,
      receiver: girl._id,
      status: "accepted",
      senderApprovedToManager: true,
      receiverApprovedToManager: true,
    });

    return { admin, otherAdmin, boy, girl, interest };
  };

  const openFile = async (user, kind, headers) =>
    request(app).get(`/api/files/${user._id}/${kind}`).set(headers);

  it("keeps female photos visible until this admin turns the setting on", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));

    const before = await request(app).get("/api/admin/settings").set(headers);
    assert.equal(before.status, 200);
    assert.equal(before.body.settings.hideFemalePhotos, false);
    assert.equal(await AdminSettings.countDocuments({ user: fixture.admin._id }), 0);

    const users = await request(app).get("/api/admin/users").set(headers);
    const girl = users.body.users.find((user) => String(user._id) === String(fixture.girl._id));
    const boy = users.body.users.find((user) => String(user._id) === String(fixture.boy._id));
    assert.equal(girl.profile.image, imagePath(fixture.girl));
    assert.equal(boy.profile.image, imagePath(fixture.boy));

    const photo = await openFile(fixture.girl, "image", headers);
    assert.equal(photo.status, 200);
    assert.equal(fileBody(photo), `image:${GIRL_PHOTO}`);
  });

  it("hides female photo urls and files for that admin only, and keeps everyone else unchanged", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));
    const otherHeaders = auth(tokenFor(fixture.otherAdmin));
    const boyHeaders = auth(tokenFor(fixture.boy));
    const girlHeaders = auth(tokenFor(fixture.girl));
    const girlImage = imagePath(fixture.girl);
    const boyImage = imagePath(fixture.boy);

    const saved = await request(app).patch("/api/admin/settings").set(headers).send({ hideFemalePhotos: true });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.settings.hideFemalePhotos, true);

    const again = await request(app).get("/api/admin/settings").set(headers);
    assert.equal(again.body.settings.hideFemalePhotos, true);
    const stored = await AdminSettings.findOne({ user: fixture.admin._id }).lean();
    assert.equal(stored.hideFemalePhotos, true);
    assert.equal(await AdminSettings.countDocuments({ user: fixture.otherAdmin._id }), 0);

    const otherSettings = await request(app).get("/api/admin/settings").set(otherHeaders);
    assert.equal(otherSettings.body.settings.hideFemalePhotos, false);

    const rejected = await request(app)
      .patch("/api/admin/settings")
      .set(headers)
      .send({ hideFemalePhotos: "yes" });
    assert.equal(rejected.status, 400);
    assert.equal((await AdminSettings.findOne({ user: fixture.admin._id }).lean()).hideFemalePhotos, true);

    const containsGirlPhoto = (body) => {
      const serialized = JSON.stringify(body);
      return serialized.includes(girlImage) || serialized.includes(GIRL_PHOTO);
    };
    const containsBoyPhoto = (body) => JSON.stringify(body).includes(boyImage);

    const users = await request(app).get("/api/admin/users").set(headers);
    const girlRow = users.body.users.find((user) => String(user._id) === String(fixture.girl._id));
    const boyRow = users.body.users.find((user) => String(user._id) === String(fixture.boy._id));
    assert.equal(girlRow.profile.image, null);
    assert.equal(girlRow.profile.resumePdf, resumePath(fixture.girl));
    assert.equal(boyRow.profile.image, boyImage);
    assert.equal(containsGirlPhoto(users.body), false);
    assert.equal(containsBoyPhoto(users.body), true);

    const otherUsers = await request(app).get("/api/admin/users").set(otherHeaders);
    const otherGirl = otherUsers.body.users.find((user) => String(user._id) === String(fixture.girl._id));
    assert.equal(otherGirl.profile.image, girlImage);

    const girlProfile = await request(app).get(`/api/admin/users/${fixture.girl._id}/profile`).set(headers);
    assert.equal(girlProfile.status, 200);
    assert.equal(girlProfile.body.profile.image, null);
    assert.equal(girlProfile.body.profile.resumePdf, resumePath(fixture.girl));
    assert.equal(girlProfile.body.profile.gender, "female");
    assert.equal(containsGirlPhoto(girlProfile.body), false);

    const boyProfile = await request(app).get(`/api/admin/users/${fixture.boy._id}/profile`).set(headers);
    assert.equal(boyProfile.body.profile.image, boyImage);

    const suggestions = await request(app).get("/api/admin/suggestions").set(headers);
    assert.equal(suggestions.status, 200);
    assert.equal(containsGirlPhoto(suggestions.body), false);
    assert.equal(containsBoyPhoto(suggestions.body), true);

    const cases = await request(app).get("/api/admin/cases").set(headers);
    assert.equal(cases.status, 200);
    assert.equal(containsGirlPhoto(cases.body), false);
    assert.equal(containsBoyPhoto(cases.body), true);
    const stageCase = cases.body.cases[0];
    assert.equal(stageCase.sender.gender === "female" ? stageCase.sender.image : stageCase.receiver.image, null);
    assert.equal(stageCase.sender.gender === "male" ? stageCase.sender.image : stageCase.receiver.image, boyImage);

    const summary = await request(app).get("/api/admin/summary").set(headers);
    assert.equal(summary.status, 200);
    assert.equal(containsGirlPhoto(summary.body), false);
    assert.equal(containsBoyPhoto(summary.body), true);

    const pending = await request(app).get("/api/admin/pending-matches").set(headers);
    assert.equal(pending.status, 200);
    assert.equal(containsGirlPhoto(pending.body), false);
    assert.equal(containsBoyPhoto(pending.body), true);

    const search = await request(app).get("/api/admin/search").query({ q: "שרה" }).set(headers);
    assert.equal(search.status, 200);
    assert.equal(search.body.candidates.length, 1);
    assert.equal(search.body.candidates[0].gender, "female");
    assert.equal(search.body.candidates[0].image, "");
    assert.equal(containsGirlPhoto(search.body), false);

    const updated = await request(app)
      .patch(`/api/admin/cases/${fixture.interest._id}`)
      .set(headers)
      .send({ action: "coordinating" });
    assert.equal(updated.status, 200);
    assert.equal(containsGirlPhoto(updated.body), false);
    assert.equal(containsBoyPhoto(updated.body), true);

    const hiddenPhoto = await openFile(fixture.girl, "image", headers);
    assert.equal(hiddenPhoto.status, 404);
    assert.equal(hiddenPhoto.body.message, "הקובץ לא נמצא");
    const hiddenResume = await openFile(fixture.girl, "resume", headers);
    assert.equal(hiddenResume.status, 200);
    assert.equal(fileBody(hiddenResume), `resumePdf:${GIRL_RESUME}`);
    const malePhoto = await openFile(fixture.boy, "image", headers);
    assert.equal(malePhoto.status, 200);
    assert.equal(fileBody(malePhoto), `image:${BOY_PHOTO}`);

    const otherPhoto = await openFile(fixture.girl, "image", otherHeaders);
    assert.equal(otherPhoto.status, 200);
    assert.equal(fileBody(otherPhoto), `image:${GIRL_PHOTO}`);

    const memberPhoto = await openFile(fixture.girl, "image", boyHeaders);
    assert.equal(memberPhoto.status, 200);
    assert.equal(fileBody(memberPhoto), `image:${GIRL_PHOTO}`);
    const ownPhoto = await openFile(fixture.girl, "image", girlHeaders);
    assert.equal(ownPhoto.status, 200);
    assert.equal(fileBody(ownPhoto), `image:${GIRL_PHOTO}`);

    const memberProfile = await request(app).get(`/api/profile/${fixture.girl._id}`).set(boyHeaders);
    assert.equal(memberProfile.status, 200);
    assert.equal(memberProfile.body.profile.image, girlImage);
    const ownProfile = await request(app).get("/api/profile/me").set(girlHeaders);
    assert.equal(ownProfile.status, 200);
    assert.equal(ownProfile.body.profile.image, girlImage);

    const memberSuggestions = await request(app).get("/api/suggestions").set(boyHeaders);
    assert.equal(memberSuggestions.status, 200);
    assert.equal(JSON.stringify(memberSuggestions.body).includes(girlImage), true);

    const restored = await request(app).patch("/api/admin/settings").set(headers).send({ hideFemalePhotos: false });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.settings.hideFemalePhotos, false);
    const visibleAgain = await request(app).get("/api/admin/users").set(headers);
    const restoredGirl = visibleAgain.body.users.find((user) => String(user._id) === String(fixture.girl._id));
    assert.equal(restoredGirl.profile.image, girlImage);
    const openedAgain = await openFile(fixture.girl, "image", headers);
    assert.equal(openedAgain.status, 200);
    assert.equal(fileBody(openedAgain), `image:${GIRL_PHOTO}`);
  });
});
