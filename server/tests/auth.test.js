process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const User = require("../src/models/user.model");
const { comparePassword, hashPassword } = require("../src/utils/hash");

const TOO_LONG = "הסיסמה ארוכה מדי. אפשר עד 72 בתים";
const WRONG = "אימייל או סיסמה שגויים";
const DUPLICATE = "לא ניתן להירשם עם הפרטים האלה. אם כבר יש לך חשבון, יש להתחבר.";
const ACCOUNT_LIMIT = "יותר מדי ניסיונות התחברות לחשבון זה. נסו שוב בעוד 15 דקות.";
const REGISTER_LIMIT = "יותר מדי ניסיונות הרשמה. נסו שוב מאוחר יותר.";
const MISSING_ENV = "השרת לא הוגדר כראוי ולכן אי אפשר להתחבר. בדקו את משתני הסביבה.";

const auth = (token) => ({ Authorization: `Bearer ${token}` });
// Rate-limit refunds for a rejected form run after the response. Give them a turn.
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const startWithoutEnv = (env) =>
  spawnSync(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME || "",
      DOTENV_CONFIG_PATH: "/tmp/smartmatch-missing.env",
      ...env,
    },
    encoding: "utf8",
    timeout: 5000,
  });

describe("server refuses to start without required env", () => {
  it("names every missing variable", () => {
    const both = startWithoutEnv({});
    assert.notEqual(both.status, 0);
    assert.match(both.stderr, /MONGO_URI/);
    assert.match(both.stderr, /JWT_SECRET/);

    const secret = startWithoutEnv({ MONGO_URI: "mongodb://127.0.0.1:9/unused" });
    assert.notEqual(secret.status, 0);
    assert.match(secret.stderr, /JWT_SECRET/);
    assert.doesNotMatch(secret.stderr, /MONGO_URI/);

    const mongo = startWithoutEnv({ JWT_SECRET: "present" });
    assert.notEqual(mongo.status, 0);
    assert.match(mongo.stderr, /MONGO_URI/);
    assert.doesNotMatch(mongo.stderr, /JWT_SECRET/);
  });
});

describe("auth", { concurrency: 1, timeout: 180000 }, () => {
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

  it("registers and logs in with email and password, including a short or Hebrew password", async () => {
    const created = await request(app).post("/api/auth/register").send({
      email: "  New.User@Example.TEST ",
      password: "1",
      idNumber: "123456789",
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.user.email, "new.user@example.test");
    assert.equal(created.body.user.name, "");
    assert.equal(created.body.user.gender, "");
    assert.equal(created.body.user.idNumber, undefined);
    assert.equal(JSON.stringify(created.body).includes("123456789"), false);
    assert.equal(typeof created.body.token, "string");

    const me = await request(app).get("/api/auth/me").set(auth(created.body.token));
    assert.equal(me.status, 200, JSON.stringify(me.body));
    assert.equal(me.body.user.email, "new.user@example.test");

    const loggedIn = await request(app).post("/api/auth/login").send({
      email: " NEW.USER@example.test ",
      password: "1",
    });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    assert.equal(loggedIn.body.user.role, "user");

    const hebrew = await request(app).post("/api/auth/register").send({
      email: "hebrew@example.test",
      password: "שלום",
    });
    assert.equal(hebrew.status, 201, JSON.stringify(hebrew.body));
    const hebrewLogin = await request(app).post("/api/auth/login").send({
      email: "hebrew@example.test",
      password: "שלום",
    });
    assert.equal(hebrewLogin.status, 200);

    const exact = await request(app).post("/api/auth/register").send({
      email: "bytes@example.test",
      password: "a".repeat(72),
    });
    assert.equal(exact.status, 201, JSON.stringify(exact.body));

    const second = await request(app).post("/api/auth/register").send({
      email: "second@example.test",
      password: "  secret  ",
    });
    assert.equal(second.status, 201, JSON.stringify(second.body));
    const spaced = await request(app).post("/api/auth/login").send({
      email: "second@example.test",
      password: "  secret  ",
    });
    assert.equal(spaced.status, 200);
    const trimmed = await request(app).post("/api/auth/login").send({
      email: "second@example.test",
      password: "secret",
    });
    assert.equal(trimmed.status, 401);
    assert.equal(trimmed.body.message, WRONG);
  });

  it("never stores or returns the password as a name or any other user field", async () => {
    const password = "PlainPasswordNotAName";
    const created = await request(app).post("/api/auth/register").send({
      email: "named@example.test",
      password,
      name: password,
      fullName: password,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.user.name, "");
    assert.equal(JSON.stringify(created.body).includes(password), false);

    const token = created.body.token;
    const me = await request(app).get("/api/auth/me").set(auth(token));
    assert.equal(me.status, 200);
    assert.equal(JSON.stringify(me.body).includes(password), false);

    const logged = await request(app).post("/api/auth/login").send({
      email: "named@example.test",
      password,
    });
    assert.equal(logged.status, 200, JSON.stringify(logged.body));
    assert.equal(logged.body.user.name, "");
    assert.equal(JSON.stringify(logged.body).includes(password), false);

    const settings = await request(app).get("/api/settings").set(auth(token));
    assert.equal(settings.status, 200);
    assert.equal(JSON.stringify(settings.body).includes(password), false);

    const stored = await User.findById(created.body.user._id).select("+password +tokenVersion").lean();
    for (const [key, value] of Object.entries(stored)) {
      if (key === "password") {
        assert.equal(await comparePassword(password, value), true);
        assert.equal(String(value).includes(password), false);
        continue;
      }
      assert.equal(JSON.stringify(value ?? "").includes(password), false, key);
    }

    const blocked = await request(app).post("/api/profile").set(auth(token)).send({
      gender: "female",
      age: 22,
      phone: "0521234567",
      name: password,
    });
    assert.equal(blocked.status, 400);

    const asPassword = await request(app).post("/api/auth/identity").set(auth(token)).send({
      name: password,
      gender: "female",
    });
    assert.equal(asPassword.status, 400);
    assert.equal(asPassword.body.message, "יש להזין שם מלא");

    const saved = await request(app).post("/api/auth/identity").set(auth(token)).send({
      name: "רבקה לוי",
      gender: "female",
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.user.name, "רבקה לוי");
    assert.equal(saved.body.user.gender, "female");
    assert.equal(JSON.stringify(saved.body).includes(password), false);

    const tooSoon = await User.findById(created.body.user._id).select("+password").lean();
    assert.equal(tooSoon.name, "רבקה לוי");
    assert.notEqual(tooSoon.name, password);
    assert.equal(String(tooSoon.password).includes(password), false);

    const profile = await request(app).post("/api/profile").set(auth(token)).send({
      gender: "male",
      age: 24,
      phone: "0521234567",
      name: "רבקה כהן",
    });
    assert.equal(profile.status, 201, JSON.stringify(profile.body));
    assert.equal(profile.body.profile.gender, "female");
    assert.equal(profile.body.profile.name, "רבקה כהן");
    assert.equal(JSON.stringify(profile.body).includes(password), false);

    const renamed = await User.findById(created.body.user._id).lean();
    assert.equal(renamed.name, "רבקה כהן");
    assert.equal(renamed.gender, "female");
  });

  it("keeps wrong-password and duplicate-email responses from revealing which part failed", async () => {
    await request(app).post("/api/auth/register").send({
      email: "taken@example.test",
      password: "secret",
    });

    const wrong = await request(app).post("/api/auth/login").send({
      email: "taken@example.test",
      password: "other",
    });
    const unknown = await request(app).post("/api/auth/login").send({
      email: "missing@example.test",
      password: "secret",
    });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.body.message, WRONG);
    assert.equal(unknown.body.message, WRONG);

    const retry = await request(app).post("/api/auth/register").send({
      email: "Taken@Example.test",
      password: "secret",
    });
    assert.equal(retry.status, 201);
    assert.equal(retry.body.user.email, "taken@example.test");

    const clash = await request(app).post("/api/auth/register").send({
      email: "taken@example.test",
      password: "different",
    });
    assert.equal(clash.status, 409);
    assert.equal(clash.body.message, DUPLICATE);

    const byId = await request(app).post("/api/auth/login").send({ idNumber: "123456789", password: "secret" });
    assert.equal(byId.status, 400);
    assert.equal(byId.body.message, "יש להזין אימייל וסיסמה");
  });

  it("registers two email-only users, then rejects a duplicate email", async () => {
    const first = await request(app).post("/api/auth/register").send({
      email: "one@example.test",
      password: "secret",
    });
    assert.equal(first.status, 201, JSON.stringify(first.body));

    const second = await request(app).post("/api/auth/register").send({
      email: "two@example.test",
      password: "secret",
    });
    assert.equal(second.status, 201, JSON.stringify(second.body));

    const duplicate = await request(app).post("/api/auth/register").send({
      email: "one@example.test",
      password: "different",
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, DUPLICATE);
  });

  it("returns 500 for a duplicate key that is not the email", async () => {
    await User.init();
    await User.collection.dropIndex("idNumber_1");
    await User.collection.createIndex({ idNumber: 1 }, { unique: true, name: "idNumber_1" });

    const logged = [];
    const originalError = console.error;
    console.error = (...args) => {
      logged.push(args);
    };

    try {
      const first = await request(app).post("/api/auth/register").send({
        email: "index-one@example.test",
        password: "secret",
      });
      assert.equal(first.status, 201, JSON.stringify(first.body));

      const second = await request(app).post("/api/auth/register").send({
        email: "index-two@example.test",
        password: "secret",
      });
      assert.equal(second.status, 500, JSON.stringify(second.body));
      assert.equal(second.body.message, "אירעה שגיאה בשרת. נסו שוב מאוחר יותר.");
      assert.notEqual(second.body.message, DUPLICATE);

      const text = JSON.stringify(logged);
      assert.equal(text.includes("index-two@example.test"), false);
      assert.equal(text.includes("11000"), true);
      assert.equal(text.includes("idNumber"), true);
      for (const args of logged) {
        for (const arg of args) {
          assert.equal(arg instanceof Error, false);
          if (arg && typeof arg === "object") {
            assert.equal(Object.prototype.hasOwnProperty.call(arg, "keyValue"), false);
          }
        }
      }
    } finally {
      console.error = originalError;
      const indexes = await User.collection.indexes();
      if (indexes.some((index) => index.name === "idNumber_1")) {
        await User.collection.dropIndex("idNumber_1");
      }
      await User.collection.createIndex(
        { idNumber: 1 },
        { unique: true, sparse: true, name: "idNumber_1" }
      );
    }
  });

  it("explains an empty, invalid, or too-long password on register, login, and password change", async () => {
    const empty = await request(app).post("/api/auth/register").send({
      email: "empty@example.test",
      password: "",
    });
    assert.equal(empty.status, 400);
    assert.equal(empty.body.message, "יש להזין סיסמה");

    const invalid = await request(app).post("/api/auth/register").send({
      email: "null@example.test",
      password: "ab\0c",
    });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.message, "הסיסמה אינה תקינה");

    const tooLong = await request(app).post("/api/auth/register").send({
      email: "long@example.test",
      password: "a".repeat(73),
    });
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.body.message, TOO_LONG);

    const created = await request(app).post("/api/auth/register").send({
      email: "owner@example.test",
      password: "secret",
    });
    const headers = auth(created.body.token);

    const longLogin = await request(app).post("/api/auth/login").send({
      email: "owner@example.test",
      password: "א".repeat(37),
    });
    assert.equal(longLogin.status, 400);
    assert.equal(longLogin.body.message, TOO_LONG);

    const changed = await request(app).post("/api/settings/password").set(headers).send({
      currentPassword: "secret",
      newPassword: "א",
    });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));

    const stale = await request(app).get("/api/auth/me").set(headers);
    assert.equal(stale.status, 401);
    assert.equal(stale.body.message, "פג תוקף ההתחברות, יש להתחבר מחדש");

    const oldPassword = await request(app).post("/api/auth/login").send({
      email: "owner@example.test",
      password: "secret",
    });
    assert.equal(oldPassword.status, 401);

    const next = await request(app).post("/api/auth/login").send({
      email: "owner@example.test",
      password: "א",
    });
    assert.equal(next.status, 200, JSON.stringify(next.body));

    const changeTooLong = await request(app)
      .post("/api/settings/password")
      .set(auth(next.body.token))
      .send({ currentPassword: "א", newPassword: "a".repeat(73) });
    assert.equal(changeTooLong.status, 400);
    assert.equal(changeTooLong.body.message, TOO_LONG);
  });

  it("logs an admin in with email and password and lets an admin set a short password", async () => {
    const admin = await User.create({
      name: "מנהל",
      email: "admin@example.test",
      password: "secret",
      role: "admin",
    });
    assert.equal(await comparePassword("secret", (await User.findById(admin._id).select("+password")).password), true);

    const loggedIn = await request(app).post("/api/auth/login").send({
      email: " Admin@Example.test ",
      password: "secret",
    });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    assert.equal(loggedIn.body.user.role, "admin");

    const summary = await request(app).get("/api/admin/summary").set(auth(loggedIn.body.token));
    assert.equal(summary.status, 200);

    const user = await request(app).post("/api/auth/register").send({
      email: "member@example.test",
      password: "secret",
    });
    const forbidden = await request(app).get("/api/admin/summary").set(auth(user.body.token));
    assert.equal(forbidden.status, 403);

    const added = await request(app).post("/api/admin/candidates").set(auth(loggedIn.body.token)).send({
      name: "לאה",
      idNumber: "200000001",
      email: " Lea@Example.test ",
      password: "1",
      gender: "female",
      age: 23,
    });
    assert.equal(added.status, 201, JSON.stringify(added.body));
    assert.equal(added.body.user.password, undefined);

    const candidate = await request(app).post("/api/auth/login").send({
      email: "lea@example.test",
      password: "1",
    });
    assert.equal(candidate.status, 200, JSON.stringify(candidate.body));
    assert.equal(candidate.body.user.role, "user");

    const matchmaker = await request(app).post("/api/admin/matchmakers").set(auth(loggedIn.body.token)).send({
      name: "מרים",
      idNumber: "200000002",
      email: "miriam@example.test",
      password: "",
    });
    assert.equal(matchmaker.status, 400);
    assert.equal(matchmaker.body.message, "יש להזין סיסמה");
  });

  it("does not lock a user out for rapid retries in development", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      await request(app).post("/api/auth/register").send({
        email: "retry@example.test",
        password: "secret",
      });

      for (let i = 0; i < 15; i += 1) {
        const failed = await request(app).post("/api/auth/login").send({
          email: "retry@example.test",
          password: `wrong-${i}`,
        });
        assert.equal(failed.status, 401, `attempt ${i}: ${failed.body.message}`);
      }

      const loggedIn = await request(app).post("/api/auth/login").send({
        email: "retry@example.test",
        password: "secret",
      });
      assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it("logs in when the stored email still has mixed case", async () => {
    const passwordHash = await hashPassword("secret");
    await User.collection.insertOne({
      name: "Old Account",
      email: "A+B@Example.test",
      password: passwordHash,
      role: "user",
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const lower = await request(app).post("/api/auth/login").send({
      email: "a+b@example.test",
      password: "secret",
    });
    assert.equal(lower.status, 200, JSON.stringify(lower.body));
    assert.equal(lower.body.user.email, "A+B@Example.test");

    const mixed = await request(app).post("/api/auth/login").send({
      email: "  A+B@EXAMPLE.TEST ",
      password: "secret",
    });
    assert.equal(mixed.status, 200, JSON.stringify(mixed.body));

    const wrong = await request(app).post("/api/auth/login").send({
      email: "a+b@example.test",
      password: "other",
    });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.message, WRONG);

    const again = await request(app).post("/api/auth/register").send({
      email: "a+b@example.test",
      password: "secret",
    });
    assert.equal(again.status, 201, JSON.stringify(again.body));
    assert.equal(again.body.user.email, "A+B@Example.test");
    assert.equal(await User.countDocuments({ email: /^a\+b@example\.test$/i }), 1);
  });

  it("locks only in production, and says so in Hebrew, without counting invalid forms", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      for (let i = 0; i < 12; i += 1) {
        const rejected = await request(app).post("/api/auth/register").send({
          email: "form@example.test",
          password: "",
        });
        assert.equal(rejected.status, 400, `register ${i}: ${rejected.status} ${rejected.body.message}`);
        await settle();
      }

      const created = await request(app).post("/api/auth/register").send({
        email: "limited@example.test",
        password: "secret",
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));

      for (let i = 0; i < 12; i += 1) {
        const incomplete = await request(app).post("/api/auth/login").send({ password: "secret" });
        assert.equal(incomplete.status, 400, `login form ${i}: ${incomplete.body.message}`);
        await settle();
      }

      for (let i = 0; i < 10; i += 1) {
        const failed = await request(app).post("/api/auth/login").send({
          email: i % 2 === 0 ? "limited@example.test" : " Limited@Example.test ",
          password: `wrong-${i}`,
        });
        assert.equal(failed.status, 401, `wrong ${i}: ${failed.status} ${failed.body.message}`);
      }

      const blocked = await request(app).post("/api/auth/login").send({
        email: "limited@example.test",
        password: "secret",
      });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.message, ACCOUNT_LIMIT);

      for (let i = 0; i < 9; i += 1) {
        const clash = await request(app).post("/api/auth/register").send({
          email: "limited@example.test",
          password: `other-${i}`,
        });
        assert.equal(clash.status, 409, `clash ${i}: ${clash.status} ${clash.body.message}`);
      }
      const registerBlocked = await request(app).post("/api/auth/register").send({
        email: "someone-else@example.test",
        password: "secret",
      });
      assert.equal(registerBlocked.status, 429);
      assert.equal(registerBlocked.body.message, REGISTER_LIMIT);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it("tells the client when JWT_SECRET disappears", async () => {
    const created = await request(app).post("/api/auth/register").send({
      email: "jwt@example.test",
      password: "secret",
    });
    assert.equal(created.status, 201);

    const previous = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const loggedIn = await request(app).post("/api/auth/login").send({
        email: "jwt@example.test",
        password: "secret",
      });
      assert.equal(loggedIn.status, 500);
      assert.equal(loggedIn.body.message, MISSING_ENV);
    } finally {
      process.env.JWT_SECRET = previous;
    }
  });
});
