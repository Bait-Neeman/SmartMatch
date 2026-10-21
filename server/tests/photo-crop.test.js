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
const { CROP_INVALID, CROP_REQUIRED, normalizePhotoCrop } = require("../src/utils/photoCrop");
const User = require("../src/models/user.model");
const Profile = require("../src/models/profile.model");
const Interest = require("../src/models/interest.model");

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const CROP = { x: 10, y: 20, width: 40, height: 50, zoom: 1.5 };
const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe("photo crop validation", () => {
  it("accepts a crop rect in percentages plus zoom", () => {
    assert.deepEqual(normalizePhotoCrop({ ...CROP, zoom: 1.234 }), { ...CROP, zoom: 1.23 });
    assert.deepEqual(normalizePhotoCrop(JSON.stringify(CROP)), CROP);
    assert.deepEqual(normalizePhotoCrop({ x: 0, y: 0, width: 100, height: 100, zoom: 1 }), {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      zoom: 1,
    });
    assert.deepEqual(normalizePhotoCrop({ x: "10", y: "20", width: "40", height: "50", zoom: "3" }), {
      x: 10,
      y: 20,
      width: 40,
      height: 50,
      zoom: 3,
    });
  });

  it("rejects crops outside the original image", () => {
    const bad = [
      null,
      "",
      "nope",
      [],
      { x: 10, y: 20, width: 40, height: 50 },
      { ...CROP, focal: 1 },
      { ...CROP, zoom: 0 },
      { ...CROP, zoom: 3.1 },
      { ...CROP, width: 0 },
      { ...CROP, x: -1 },
      { ...CROP, x: 80, width: 30 },
      { ...CROP, y: 90, height: 20 },
      { ...CROP, width: Number.NaN },
    ];
    for (const value of bad) {
      assert.throws(() => normalizePhotoCrop(value), (error) => error.statusCode === 400 && error.message === CROP_INVALID);
    }
  });
});

describe("photo crop profile", { concurrency: 1, timeout: 180000 }, () => {
  let mongo;
  let stored;

  before(async () => {
    setProfileFileUploader(async (kind, file) => {
      stored = { id: `stored-${kind}`, bytes: Buffer.from(file.buffer) };
      return stored.id;
    });
    setProfileFileDeleter(async () => {});
    setStoredFileReader(async (kind, publicId) => ({
      body: Buffer.from(`${kind}:${publicId}:${stored ? stored.bytes.length : 0}`),
      contentType: kind === "image" ? "image/jpeg" : "application/pdf",
    }));
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
    stored = null;
    for (const collection of Object.values(mongoose.connection.collections)) {
      await collection.deleteMany({});
    }
  });

  const member = async (n, gender = "female", role = "user") => {
    const user = await User.create({
      name: `Member ${n}`,
      email: `member-${n}@example.test`,
      password: "Password1",
      role,
      gender,
    });
    return { user, token: generateToken(user._id, role) };
  };

  const createProfile = async (token, gender = "female") => {
    const response = await request(app).post("/api/profile").set(auth(token)).send({
      gender,
      age: 25,
      phone: "0521234567",
      city: "Haifa",
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
    return response;
  };

  const upload = (token, crop, { file = true } = {}) => {
    const call = request(app).put("/api/profile").set(auth(token));
    if (crop !== undefined) call.field("photoCrop", typeof crop === "string" ? crop : JSON.stringify(crop));
    if (file) call.attach("image", JPEG, { filename: "photo.jpg", contentType: "image/jpeg" });
    return call;
  };

  it("stores crop metadata and keeps the original file", async () => {
    const owner = await member(1);
    await createProfile(owner.token);

    const missing = await upload(owner.token, undefined);
    assert.equal(missing.status, 400);
    assert.equal(missing.body.message, CROP_REQUIRED);
    assert.equal(stored, null);

    const invalid = await upload(owner.token, { ...CROP, zoom: 9 });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.message, CROP_INVALID);
    assert.equal(stored, null);

    const saved = await upload(owner.token, CROP);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.deepEqual(saved.body.profile.photoCrop, CROP);
    assert.equal(saved.body.profile.image, `/api/files/${owner.user._id}/image`);

    const row = await Profile.findOne({ user: owner.user._id }).lean();
    assert.equal(row.image, "stored-image");
    assert.deepEqual(row.photoCrop, CROP);
    const before = await request(app).get(`/api/files/${owner.user._id}/image`).set(auth(owner.token));
    assert.equal(before.status, 200);
    const fileText = (response) => (Buffer.isBuffer(response.body) ? response.body.toString() : String(response.text || ""));
    assert.equal(fileText(before), `image:stored-image:${JPEG.length}`);

    const edited = await request(app)
      .put("/api/profile")
      .set(auth(owner.token))
      .send({ photoCrop: { ...CROP, zoom: 2 } });
    assert.equal(edited.status, 200, JSON.stringify(edited.body));
    assert.equal(edited.body.profile.photoCrop.zoom, 2);
    assert.equal(edited.body.profile.image, `/api/files/${owner.user._id}/image`);
    const afterEdit = await Profile.findOne({ user: owner.user._id }).lean();
    assert.equal(afterEdit.image, "stored-image");

    const kept = await request(app).put("/api/profile").set(auth(owner.token)).send({ city: "Elad" });
    assert.equal(kept.status, 200);
    assert.equal(kept.body.profile.city, "Elad");
    assert.equal(kept.body.profile.photoCrop.zoom, 2);

    const fileAfter = await request(app).get(`/api/files/${owner.user._id}/image`).set(auth(owner.token));
    assert.equal(fileText(fileAfter), fileText(before));

    const noImage = await member(2);
    await createProfile(noImage.token);
    const early = await request(app).put("/api/profile").set(auth(noImage.token)).send({ photoCrop: CROP });
    assert.equal(early.status, 400);
    assert.equal(early.body.message, CROP_REQUIRED);
  });

  it("hides crop metadata until mutual approval and lets an admin edit it", async () => {
    const owner = await member(3, "female");
    const viewer = await member(4, "male");
    const admin = await member(5, "male", "admin");
    await createProfile(owner.token, "female");
    await createProfile(viewer.token, "male");
    await upload(owner.token, CROP);

    await Interest.create({ sender: viewer.user._id, receiver: owner.user._id, status: "pending" });
    const hidden = await request(app).get(`/api/profile/${owner.user._id}`).set(auth(viewer.token));
    assert.equal(hidden.status, 200);
    assert.equal(hidden.body.profile.image, undefined);
    assert.equal(hidden.body.profile.photoCrop, undefined);
    assert.equal(JSON.stringify(hidden.body).includes("stored-image"), false);

    await Interest.updateOne({ sender: viewer.user._id, receiver: owner.user._id }, { status: "accepted" });
    const shown = await request(app).get(`/api/profile/${owner.user._id}`).set(auth(viewer.token));
    assert.equal(shown.status, 200);
    assert.equal(shown.body.profile.image, `/api/files/${owner.user._id}/image`);
    assert.deepEqual(shown.body.profile.photoCrop, CROP);

    const forbidden = await request(app)
      .put(`/api/admin/users/${owner.user._id}/photo`)
      .set(auth(viewer.token))
      .send({ photoCrop: { ...CROP, zoom: 1 } });
    assert.equal(forbidden.status, 403);

    const adminEdit = await request(app)
      .put(`/api/admin/users/${owner.user._id}/photo`)
      .set(auth(admin.token))
      .send({ photoCrop: { ...CROP, x: 5, zoom: 1.2 } });
    assert.equal(adminEdit.status, 200, JSON.stringify(adminEdit.body));
    assert.equal(adminEdit.body.profile.photoCrop.x, 5);
    assert.equal(adminEdit.body.profile.photoCrop.zoom, 1.2);
    const stillOriginal = await Profile.findOne({ user: owner.user._id }).lean();
    assert.equal(stillOriginal.image, "stored-image");

    const replaced = await request(app)
      .put(`/api/admin/users/${owner.user._id}/photo`)
      .set(auth(admin.token))
      .field("photoCrop", JSON.stringify({ ...CROP, y: 4 }))
      .attach("image", JPEG, { filename: "photo.jpg", contentType: "image/jpeg" });
    assert.equal(replaced.status, 200, JSON.stringify(replaced.body));
    assert.equal(replaced.body.profile.photoCrop.y, 4);
    assert.equal(replaced.body.profile.image, `/api/files/${owner.user._id}/image`);
  });
});
