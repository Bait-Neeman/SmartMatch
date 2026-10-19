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

const PASSWORD = "Password1";
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role || "user");

describe("institution lists", { concurrency: 1, timeout: 180000 }, () => {
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

  const createUser = async (n) => {
    const idNumber = String(300000000 + n).slice(0, 9);
    return User.create({
      name: `User ${idNumber}`,
      email: `institutions-${idNumber}@example.test`,
      idNumber,
      password: PASSWORD,
      role: "user",
    });
  };

  it("requires a logged-in user", async () => {
    const response = await request(app).get("/api/institutions");
    assert.equal(response.status, 401);
  });

  it("returns the seed lists plus distinct institutions entered by the matching gender", async () => {
    const woman = await createUser(1);
    const man = await createUser(2);
    const otherWoman = await createUser(3);

    await Profile.create([
      {
        user: woman._id,
        gender: "female",
        age: 22,
        seminar: "  סמינר   לבדיקה ",
        yeshiva: "ישיבה של בחורה",
        occupation: "מורה",
        working: true,
        workplace: "בית ספר",
      },
      {
        user: otherWoman._id,
        gender: "female",
        age: 23,
        seminar: "  אור   החיים ",
        occupation: "  מורה   לחינוך ",
      },
      {
        user: man._id,
        gender: "male",
        age: 24,
        yeshiva: "  ישיבה   לבדיקה ",
        seminar: "סמינר של בחור",
        occupation: "נהג",
      },
    ]);

    const response = await request(app).get("/api/institutions").set(auth(tokenFor(woman)));
    assert.equal(response.status, 200, JSON.stringify(response.body));

    const { yeshivas, seminars, professions } = response.body;
    assert.equal(yeshivas.includes("חברון"), true);
    assert.equal(seminars.includes("אור החיים"), true);
    assert.equal(seminars.includes("סמינר לבדיקה"), true);
    assert.equal(seminars.filter((name) => name === "אור החיים").length, 1);
    assert.equal(seminars.includes("סמינר של בחור"), false);
    assert.equal(yeshivas.includes("ישיבה לבדיקה"), true);
    assert.equal(yeshivas.includes("ישיבה של בחורה"), false);
    assert.equal(yeshivas.includes("חברון"), true);
    assert.equal(new Set(yeshivas).size, yeshivas.length);
    assert.equal(new Set(seminars).size, seminars.length);
    assert.equal(professions.includes("הוראה"), true);
    assert.equal(professions.includes("מורה"), true);
    assert.equal(professions.includes("מורה לחינוך"), true);
    assert.equal(professions.includes("נהג"), false);
    assert.equal(new Set(professions).size, professions.length);

    const duplicate = await request(app).get("/api/institutions").set(auth(tokenFor(man)));
    assert.deepEqual(duplicate.body.yeshivas, yeshivas);
    assert.deepEqual(duplicate.body.seminars, seminars);
    assert.deepEqual(duplicate.body.professions, professions);
  });

  it("stores the female work fields and drops a workplace when she is not working", async () => {
    const woman = await createUser(4);
    const headers = auth(tokenFor(woman));

    const created = await request(app).post("/api/profile").set(headers).send({
      gender: "female",
      age: 21,
      occupation: "גננת",
      seminar: "נעם",
      working: true,
      workingInProfession: true,
      workplace: "גן ילדים",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.profile.working, true);
    assert.equal(created.body.profile.workingInProfession, true);
    assert.equal(created.body.profile.workplace, "גן ילדים");
    assert.equal(created.body.profile.occupation, "גננת");

    const stopped = await request(app).put("/api/profile").set(headers).send({
      working: false,
      workingInProfession: true,
      workplace: "עדיין כתוב",
    });
    assert.equal(stopped.status, 200, JSON.stringify(stopped.body));
    assert.equal(stopped.body.profile.working, false);
    assert.equal(stopped.body.profile.workplace ?? null, null);
    assert.equal(stopped.body.profile.workingInProfession ?? null, null);

    const invalid = await request(app).put("/api/profile").set(headers).send({ working: "maybe" });
    assert.equal(invalid.status, 400);
  });
});
