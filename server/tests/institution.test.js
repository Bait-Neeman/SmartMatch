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
const Preference = require("../src/models/preference.model");

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
        city: "תל-אביב",
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
        yeshiva: "  ישיבת   חברון ",
        seminar: "סמינר של בחור",
        occupation: "נהג",
        city: "עיר-לבדיקה",
      },
    ]);

    const response = await request(app).get("/api/institutions").set(auth(tokenFor(woman)));
    assert.equal(response.status, 200, JSON.stringify(response.body));

    const { yeshivas, seminars, professions, cities } = response.body;
    assert.equal(yeshivas.includes("חברון"), true);
    assert.equal(seminars.includes("אור החיים"), true);
    assert.equal(seminars.includes("סמינר לבדיקה"), true);
    assert.equal(seminars.filter((name) => name === "אור החיים").length, 1);
    assert.equal(seminars.includes("סמינר של בחור"), false);
    assert.equal(yeshivas.includes("ישיבה לבדיקה"), false);
    assert.equal(yeshivas.filter((name) => name === "חברון").length, 1);
    assert.equal(yeshivas.includes("ישיבת חברון"), false);
    assert.equal(seminars.includes("סמינר אור החיים"), false);
    assert.equal(yeshivas.includes("ישיבה של בחורה"), false);
    assert.equal(yeshivas.includes("חברון"), true);
    assert.equal(new Set(yeshivas).size, yeshivas.length);
    assert.equal(new Set(seminars).size, seminars.length);
    assert.equal(professions.includes("הוראה"), true);
    assert.equal(professions.includes("מורה"), true);
    assert.equal(professions.includes("מורה לחינוך"), true);
    assert.equal(professions.includes("נהג"), false);
    assert.equal(new Set(professions).size, professions.length);
    assert.equal(cities.includes("תל אביב"), true);
    assert.equal(cities.includes("תל-אביב"), false);
    assert.equal(cities.filter((name) => name === "תל אביב").length, 1);
    assert.equal(cities.includes("עיר-לבדיקה"), true);
    assert.equal(cities.includes("ירושלים"), true);
    assert.equal(new Set(cities).size, cities.length);

    const duplicate = await request(app).get("/api/institutions").set(auth(tokenFor(man)));
    assert.deepEqual(duplicate.body.yeshivas, yeshivas);
    assert.deepEqual(duplicate.body.seminars, seminars);
    assert.deepEqual(duplicate.body.professions, professions);
    assert.deepEqual(duplicate.body.cities, cities);
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

  it("stores a normalized contact phone and still lets an account without one sign in", async () => {
    const woman = await createUser(8);
    const headers = auth(tokenFor(woman));

    const created = await request(app).post("/api/profile").set(headers).send({
      gender: "female",
      age: 22,
      phone: "+972-52-123-4567",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.profile.phone, "0521234567");
    assert.equal((await User.findById(woman._id).lean()).phone, "0521234567");

    const spaced = await request(app).put("/api/profile").set(headers).send({ phone: "052 987 6543" });
    assert.equal(spaced.status, 200, JSON.stringify(spaced.body));
    assert.equal(spaced.body.profile.phone, "0529876543");

    const untouched = await request(app).put("/api/profile").set(headers).send({ city: "חיפה" });
    assert.equal(untouched.status, 200, JSON.stringify(untouched.body));
    assert.equal(untouched.body.profile.phone, "0529876543");
    assert.equal(untouched.body.profile.city, "חיפה");

    const missing = await request(app).put("/api/profile").set(headers).send({ phone: "  " });
    assert.equal(missing.status, 400);
    assert.match(missing.body.message, /טלפון/);
    const landline = await request(app).put("/api/profile").set(headers).send({ phone: "03-1234567" });
    assert.equal(landline.status, 400);
    assert.equal((await User.findById(woman._id).lean()).phone, "0529876543");

    const man = await createUser(9);
    const manHeaders = auth(tokenFor(man));
    const withoutPhone = await request(app).post("/api/profile").set(manHeaders).send({ gender: "male", age: 29 });
    assert.equal(withoutPhone.status, 201, JSON.stringify(withoutPhone.body));
    assert.equal(withoutPhone.body.profile.phone, null);

    const login = await request(app).post("/api/auth/login").send({
      email: man.email,
      password: PASSWORD,
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));
    const mine = await request(app).get("/api/profile/me").set(auth(login.body.token));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.profile.phone, null);
  });

  it("does not clear a stored occupation or older preference fields the form omits", async () => {
    const man = await createUser(10);
    const headers = auth(tokenFor(man));
    const created = await request(app).post("/api/profile").set(headers).send({
      gender: "male",
      age: 30,
      occupation: "מלמד",
      yeshiva: "חברון",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const saved = await request(app).put("/api/profile").set(headers).send({
      gender: "male",
      age: 31,
      yeshiva: "חברון",
      city: "ירושלים",
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.profile.occupation, "מלמד");
    assert.equal(saved.body.profile.yeshiva, "חברון");
    assert.equal(saved.body.profile.age, 31);

    await Preference.create({
      user: man._id,
      preferredEthnicity: "ashkenazi",
      financialMin: 1000,
      financialMax: 5000,
      ageMin: 20,
      ageMax: 30,
    });
    const prefs = await request(app).put("/api/preference").set(headers).send({
      ageMin: 22,
      ageMax: 32,
      preferredSeminar: ["חברון"],
      onlyWorking: false,
    });
    assert.equal(prefs.status, 200, JSON.stringify(prefs.body));
    assert.deepEqual(prefs.body.preferences.preferredEthnicity, ["ashkenazi"]);
    assert.equal(prefs.body.preferences.excludeIncomplete, false);
    assert.equal(prefs.body.preferences.financialMin, 1000);
    assert.equal(prefs.body.preferences.financialMax, 5000);
    assert.equal(prefs.body.preferences.ageMin, 22);
    assert.deepEqual(prefs.body.preferences.preferredSeminar, ["חברון"]);
  });
});
