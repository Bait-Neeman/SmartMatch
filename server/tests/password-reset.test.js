process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";
if (!process.env.NODE_ENV) process.env.NODE_ENV = "test";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const User = require("../src/models/user.model");
const PasswordReset = require("../src/models/passwordReset.model");
const { generateToken } = require("../src/config/jwt");
const { comparePassword, hashPassword } = require("../src/utils/hash");
const { setMailTransport } = require("../src/services/mail.service");

const GENERIC = "אם קיים חשבון עם הכתובת הזו, נשלח אליו קישור לאיפוס הסיסמה. הקישור תקף לשעה אחת.";
const INVALID_LINK = "הקישור לאיפוס הסיסמה אינו תקין או שפג תוקפו. אפשר לבקש קישור חדש.";
const UPDATED = "הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.";
const TOO_LONG = "הסיסמה ארוכה מדי. אפשר עד 72 בתים";
const RESET_LIMIT = "יותר מדי בקשות לאיפוס סיסמה. נסו שוב מאוחר יותר.";

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const withConsole = async (fn) => {
  const info = [];
  const warn = [];
  const error = [];
  const original = {
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  console.info = (...args) => info.push(args.map(String).join(" "));
  console.warn = (...args) => warn.push(args.map(String).join(" "));
  console.error = (...args) => error.push(args.map(String).join(" "));
  try {
    const result = await fn();
    return { result, info, warn, error };
  } finally {
    console.info = original.info;
    console.warn = original.warn;
    console.error = original.error;
  }
};

const tokenFromLogs = (lines) => {
  const line = lines.find((entry) => entry.includes("Password reset link"));
  assert.ok(line);
  const url = line.slice(line.indexOf("http"));
  return { url, token: new URL(url).searchParams.get("token") };
};

const ask = async (email) => {
  const { result, info, warn, error } = await withConsole(() =>
    request(app).post("/api/auth/forgot-password").send({ email })
  );
  const logged = info.some((line) => line.includes("Password reset link"))
    ? tokenFromLogs(info)
    : { url: "", token: null };
  return {
    status: result.status,
    body: result.body,
    text: JSON.stringify(result.body),
    info,
    warn,
    error,
    ...logged,
  };
};

const reset = (token, password) =>
  request(app).post("/api/auth/reset-password").send({ token, password });

describe("password reset", { concurrency: 1, timeout: 180000 }, () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
  });

  after(async () => {
    setMailTransport(null);
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    setMailTransport(null);
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;
    delete process.env.CLIENT_URL;
    for (const collection of Object.values(mongoose.connection.collections)) {
      await collection.deleteMany({});
    }
  });

  const createUser = (overrides = {}) =>
    User.create({
      name: overrides.name || "משתמש",
      email: overrides.email || "user@example.test",
      password: overrides.password || "secret",
      role: overrides.role || "user",
      ...(overrides.tokenVersion != null ? { tokenVersion: overrides.tokenVersion } : {}),
    });

  it("stores only a hash, emails nothing in the response, and accepts a new password once", async () => {
    const user = await createUser({ role: "admin", tokenVersion: 4, password: "old-secret" });
    const oldSession = generateToken(user._id, "admin", 4);

    const sent = await ask(" User@Example.test ");
    assert.equal(sent.status, 200);
    assert.deepEqual(sent.body, { message: GENERIC });
    assert.equal(typeof sent.token, "string");
    assert.ok(sent.token.length >= 40);
    assert.equal(sent.text.includes(sent.token), false);
    assert.equal(sent.url.startsWith("http://localhost:5173/reset-password?token="), true);

    const stored = await PasswordReset.findOne({ user: user._id }).select("+tokenHash");
    assert.equal(stored.tokenHash, hashToken(sent.token));
    assert.equal(JSON.stringify(stored.toObject()).includes(sent.token), false);
    assert.ok(stored.expiresAt.getTime() > Date.now() + 55 * 60 * 1000);
    assert.ok(stored.expiresAt.getTime() < Date.now() + 65 * 60 * 1000);
    assert.equal(stored.usedAt, null);

    const empty = await reset(sent.token, "");
    assert.equal(empty.status, 400);
    assert.equal(empty.body.message, "יש להזין סיסמה");

    const nul = await reset(sent.token, "bad\0pass");
    assert.equal(nul.status, 400);
    assert.equal(nul.body.message, "הסיסמה אינה תקינה");

    const tooLong = await reset(sent.token, "א".repeat(37));
    assert.equal(tooLong.status, 400);
    assert.equal(tooLong.body.message, TOO_LONG);

    const updated = await reset(sent.token, "א".repeat(36));
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body, { message: UPDATED });
    assert.equal(JSON.stringify(updated.body).includes(sent.token), false);

    const again = await reset(sent.token, "other-password");
    assert.equal(again.status, 400);
    assert.equal(again.body.message, INVALID_LINK);

    const saved = await User.findById(user._id).select("+password +tokenVersion");
    assert.equal(saved.tokenVersion, 5);
    assert.notEqual(saved.password, "א".repeat(36));
    assert.equal(await comparePassword("א".repeat(36), saved.password), true);
    assert.equal(await comparePassword("other-password", saved.password), false);

    const stale = await request(app).get("/api/auth/me").set(auth(oldSession));
    assert.equal(stale.status, 401);

    const oldPassword = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "old-secret",
    });
    assert.equal(oldPassword.status, 401);

    const loggedIn = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "א".repeat(36),
    });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    const fresh = await request(app).get("/api/auth/me").set(auth(loggedIn.body.token));
    assert.equal(fresh.status, 200);
    assert.equal(fresh.body.user.role, "admin");
  });

  it("answers the same way when the account does not exist and does not log a link", async () => {
    const blank = await request(app).post("/api/auth/forgot-password").send({ email: "  " });
    assert.equal(blank.status, 400);
    assert.equal(blank.body.message, "יש להזין כתובת אימייל");
    const malformed = await request(app).post("/api/auth/forgot-password").send({ email: "not-an-email" });
    assert.equal(malformed.status, 400);
    assert.equal(malformed.body.message, "כתובת האימייל אינה תקינה");

    await createUser({ email: "known@example.test" });
    await User.collection.insertOne({
      name: "Old Account",
      email: "Old.User@Example.test",
      password: await hashPassword("secret"),
      role: "user",
      tokenVersion: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const known = await ask("known@example.test");
    const mixed = await ask("old.user@example.test");
    assert.equal(mixed.status, 200);
    assert.deepEqual(mixed.body, { message: GENERIC });
    assert.equal(typeof mixed.token, "string");
    assert.equal(mixed.text.includes(mixed.token), false);
    const missing = await ask("missing@example.test");
    const alsoMissing = await ask("other@example.test");

    assert.equal(known.status, 200);
    assert.equal(missing.status, 200);
    assert.deepEqual(known.body, missing.body);
    assert.deepEqual(missing.body, alsoMissing.body);
    assert.equal(known.body.message, GENERIC);
    assert.equal(missing.token, null);
    assert.equal(alsoMissing.info.some((line) => line.includes("reset-password")), false);
    assert.equal(await PasswordReset.countDocuments(), 2);
    assert.equal(missing.text.includes("known@example.test"), false);
    assert.equal(missing.text.includes("missing@example.test"), false);
  });

  it("rejects an expired link and a link replaced by a newer request", async () => {
    const user = await createUser({ email: "expire@example.test", password: "before" });
    const first = await ask(user.email);
    const second = await ask(user.email);

    assert.notEqual(first.token, second.token);
    const replaced = await reset(first.token, "after-first");
    assert.equal(replaced.status, 400);
    assert.equal(replaced.body.message, INVALID_LINK);

    await PasswordReset.updateOne({ user: user._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await reset(second.token, "after-second");
    assert.equal(expired.status, 400);
    assert.equal(expired.body.message, INVALID_LINK);

    const saved = await User.findById(user._id).select("+password +tokenVersion");
    assert.equal(saved.tokenVersion, 0);
    assert.equal(await comparePassword("before", saved.password), true);

    const garbage = await reset("this-token-does-not-exist-anywhere", "x");
    assert.equal(garbage.status, 400);
    assert.equal(garbage.body.message, INVALID_LINK);
  });

  it("sends one Hebrew email when SMTP is configured and does not log the token", async () => {
    process.env.SMTP_HOST = "smtp.example.test";
    process.env.SMTP_PORT = "587";
    process.env.MAIL_FROM = "בית נאמן <no-reply@example.test>";
    process.env.CLIENT_URL = "https://bait.example";

    const sentMails = [];
    setMailTransport({
      sendMail: async (message) => {
        sentMails.push(message);
      },
    });

    const user = await createUser({ email: "mail@example.test" });
    const { result, info, warn, error } = await withConsole(() =>
      request(app).post("/api/auth/forgot-password").send({ email: "mail@example.test" })
    );
    const missing = await withConsole(() =>
      request(app).post("/api/auth/forgot-password").send({ email: "nobody@example.test" })
    );

    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { message: GENERIC });
    assert.equal(sentMails.length, 1);
    assert.equal(sentMails[0].to, user.email);
    assert.equal(sentMails[0].from, process.env.MAIL_FROM);
    assert.equal(sentMails[0].subject, "איפוס סיסמה · בית נאמן");
    assert.match(sentMails[0].text, /קיבלנו בקשה לאיפוס הסיסמה/);
    assert.match(sentMails[0].text, /תקף לשעה אחת/);
    assert.match(sentMails[0].html, /לבחירת סיסמה חדשה/);

    const token = new URL(sentMails[0].text.match(/https:\/\/bait\.example\/reset-password\?token=\S+/)[0]).searchParams.get("token");
    assert.ok(token);
    assert.equal(JSON.stringify(result.body).includes(token), false);
    assert.equal([...info, ...warn, ...error].join("\n").includes(token), false);
    assert.equal(missing.result.status, 200);
    assert.deepEqual(missing.result.body, result.body);
    assert.equal(sentMails.length, 1);

    const updated = await reset(token, "1");
    assert.equal(updated.status, 200);
    const loggedIn = await request(app).post("/api/auth/login").send({
      email: "mail@example.test",
      password: "1",
    });
    assert.equal(loggedIn.status, 200);
  });

  it("keeps the reset link out of production logs and limits repeated requests", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.CLIENT_URL = "https://bait.example";
    const logs = [];
    const original = {
      info: console.info,
      warn: console.warn,
      error: console.error,
      log: console.log,
    };
    console.info = (...args) => logs.push(args.map(String).join(" "));
    console.warn = (...args) => logs.push(args.map(String).join(" "));
    console.error = (...args) => logs.push(args.map(String).join(" "));
    console.log = (...args) => logs.push(args.map(String).join(" "));

    try {
      await createUser({ email: "limited@example.test" });

      for (let i = 0; i < 5; i += 1) {
        const response = await request(app).post("/api/auth/forgot-password").send({
          email: i % 2 === 0 ? "limited@example.test" : "missing@example.test",
        });
        assert.equal(response.status, 200, `request ${i}: ${response.status}`);
        assert.deepEqual(response.body, { message: GENERIC });
      }

      const blocked = await request(app).post("/api/auth/forgot-password").send({
        email: "limited@example.test",
      });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.message, RESET_LIMIT);

      const output = logs.join("\n");
      assert.match(output, /SMTP is not configured/);
      assert.equal(output.includes("reset-password"), false);
      assert.equal(output.includes("token="), false);
      assert.equal(await PasswordReset.countDocuments(), 1);
    } finally {
      console.info = original.info;
      console.warn = original.warn;
      console.error = original.error;
      console.log = original.log;
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
});
