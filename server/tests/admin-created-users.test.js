process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";
delete process.env.ALLOW_CODE_LOGIN;

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const { generateToken } = require("../src/config/jwt");
const { comparePassword } = require("../src/utils/hash");
const {
  accessCodeLookup,
  ALPHABET,
  CODE_LENGTH,
  decryptAccessCode,
  encryptAccessCode,
} = require("../src/utils/accessCode");
const User = require("../src/models/user.model");
const Profile = require("../src/models/profile.model");
const Preference = require("../src/models/preference.model");

const PASSWORD = "AdminPass12";
const ADMIN_NAME = "שדכן יוצר ייחודי";
const PHONE = "0527654321";
const CODE_LIMIT = "יותר מדי ניסיונות עם קוד. נסו שוב בעוד 15 דקות.";
const SETUP_REQUIRED = "יש להגדיר אימייל וסיסמה";
const PHONE_REQUIRED = "טלפון נייד ליצירת קשר הוא שדה חובה";

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role, user.tokenVersion || 0);
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

const codePattern = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`);

describe("admin-created users", { concurrency: 1, timeout: 180000 }, () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await User.syncIndexes();
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  beforeEach(async () => {
    delete process.env.ALLOW_CODE_LOGIN;
    delete process.env.ACCESS_CODE_KEY;
    for (const collection of Object.values(mongoose.connection.collections)) {
      await collection.deleteMany({});
    }
  });

  const createAdmin = async () => {
    const admin = await User.create({
      name: ADMIN_NAME,
      email: "maker@example.test",
      password: PASSWORD,
      role: "admin",
    });
    return { admin, headers: auth(tokenFor(admin)) };
  };

  const createMember = (headers, body) => request(app).post("/api/admin/members").set(headers).send(body);

  it("stores the access code encrypted and shows it to an admin, not to a member", async () => {
    const { admin, headers } = await createAdmin();
    const created = await createMember(headers, {
      name: "דוד חדש",
      gender: "male",
      email: "should-be-ignored@example.test",
      password: "ShouldNotStick",
      phone: PHONE,
      createdBy: { id: "000000000000000000000099", name: "זיוף" },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.match(created.body.accessCode, codePattern);
    assert.equal(created.body.user.name, "דוד חדש");
    assert.equal(created.body.user.gender, "male");
    assert.equal(created.body.user.email, null);
    assert.equal(created.body.user.phone, null);
    assert.equal(created.body.user.credentialSetupRequired, true);
    assert.equal(String(created.body.user.createdBy._id), String(admin._id));
    assert.equal(created.body.user.createdBy.name, ADMIN_NAME);
    assert.equal(created.body.user.accessCode, created.body.accessCode);
    assert.equal(created.body.user.password, undefined);
    assert.equal(JSON.stringify(created.body.user).includes("זיוף"), false);
    assert.equal(JSON.stringify(created.body.user).includes("ShouldNotStick"), false);
    assert.equal(JSON.stringify(created.body).includes("should-be-ignored"), false);

    const stored = await User.findById(created.body.user._id).select("+password +accessCodeLookup +accessCodeCipher").lean();
    assert.equal(stored.email, undefined);
    assert.equal(stored.phone, undefined);
    assert.notEqual(stored.password, created.body.accessCode);
    assert.equal(await comparePassword(created.body.accessCode, stored.password), true);
    assert.equal(stored.accessCodeLookup, accessCodeLookup(created.body.accessCode));
    assert.notEqual(stored.accessCodeLookup, created.body.accessCode);
    assert.equal(typeof stored.accessCodeCipher, "string");
    assert.equal(stored.accessCodeCipher.includes(created.body.accessCode), false);
    assert.equal(decryptAccessCode(stored.accessCodeCipher), created.body.accessCode);
    assert.equal(stored.credentialSetupRequired, true);

    const hidden = await User.findById(created.body.user._id).lean();
    assert.equal(Object.hasOwn(hidden, "password"), false);
    assert.equal(Object.hasOwn(hidden, "accessCodeLookup"), false);
    assert.equal(Object.hasOwn(hidden, "accessCodeCipher"), false);
    assert.equal(JSON.stringify(hidden).includes(created.body.accessCode), false);

    const indexes = await User.collection.indexes();
    const lookupIndex = indexes.find((index) => index.key && index.key.accessCodeLookup === 1);
    assert.ok(lookupIndex);
    assert.equal(lookupIndex.unique, true);
    assert.equal(lookupIndex.sparse, true);

    const listed = await request(app).get("/api/admin/users").set(headers);
    const row = listed.body.users.find((user) => user.name === "דוד חדש");
    assert.ok(row);
    assert.equal(row.gender, "male");
    assert.equal(row.profile, null);
    assert.equal(row.accessCode, created.body.accessCode);

    const summary = await request(app).get("/api/admin/summary").set(headers);
    assert.equal(summary.body.boys.total, 1);

    const opened = await request(app).get(`/api/admin/users/${created.body.user._id}/profile`).set(headers);
    assert.equal(opened.status, 200);
    assert.equal(opened.body.user.createdBy.name, ADMIN_NAME);
    assert.equal(opened.body.user.accessCode, created.body.accessCode);
    assert.equal(opened.body.user.password, undefined);
    assert.equal(JSON.stringify(opened.body).includes("accessCodeCipher"), false);

    const member = await request(app).post("/api/auth/code-login").send({ code: created.body.accessCode });
    assert.equal(member.status, 200, JSON.stringify(member.body));
    assert.equal(member.body.user.accessCode, undefined);
    assert.equal(JSON.stringify(member.body).includes(created.body.accessCode), false);
    const me = await request(app).get("/api/auth/me").set(auth(member.body.token));
    assert.equal(me.status, 200);
    assert.equal(JSON.stringify(me.body).includes(created.body.accessCode), false);

    const stranger = await User.create({
      name: "צופה קוד",
      email: "code-viewer@example.test",
      password: PASSWORD,
      gender: "female",
      role: "user",
    });
    const seen = await request(app).get(`/api/profile/${created.body.user._id}`).set(auth(tokenFor(stranger)));
    assert.equal(JSON.stringify(seen.body).includes(created.body.accessCode), false);
    const denied = await request(app).get("/api/admin/users").set(auth(tokenFor(stranger)));
    assert.equal(denied.status, 403);
  });

  it("saves a full profile and preferences without a phone, and the member is matchable", async () => {
    const { headers } = await createAdmin();
    const viewer = await User.create({
      name: "רחל כהן",
      email: "rachel@example.test",
      password: PASSWORD,
      gender: "female",
      role: "user",
    });
    await Profile.create({ user: viewer._id, gender: "female", age: 22, city: "ירושלים", maritalStatus: "single" });

    const created = await createMember(headers, {
      name: "דוד חדש",
      gender: "male",
      profile: {
        age: 25,
        city: "ירושלים",
        height: 175,
        style: "modern",
        appearance: "average",
        ethnicity: "ashkenazi",
        maritalStatus: "single",
        yeshiva: "חברון",
        description: "פרטים גלויים",
        financialDemand: 100,
        financialParticipation: 80,
        phone: "",
      },
      preferences: {
        ageMin: 20,
        ageMax: 30,
        city: ["ירושלים"],
        preferredMaritalStatus: ["single"],
        preferredSeminar: ["אור החיים"],
      },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.user.phone, null);
    assert.equal(created.body.user.profile.gender, "male");
    assert.equal(created.body.user.profile.age, 25);
    assert.equal(created.body.user.profile.yeshiva, "חברון");
    assert.equal(created.body.user.profile.seminar, null);
    assert.deepEqual(created.body.user.preference.city, ["ירושלים"]);
    assert.deepEqual(created.body.user.preference.preferredSeminar, ["אור החיים"]);

    const stored = await User.findById(created.body.user._id).lean();
    assert.equal(stored.phone, undefined);

    const candidates = await request(app).get("/api/match/candidates").set(auth(tokenFor(viewer)));
    assert.equal(candidates.status, 200, JSON.stringify(candidates.body));
    const card = candidates.body.candidates.find((item) => String(item._id) === String(created.body.user._id));
    assert.ok(card);
    assert.equal(card.city, "ירושלים");
    const blob = JSON.stringify(candidates.body);
    assert.equal(blob.includes(PHONE), false);
    assert.equal(blob.includes(ADMIN_NAME), false);
    assert.equal(blob.includes("createdBy"), false);
    assert.equal(blob.includes(created.body.accessCode), false);

    const viewed = await request(app).get(`/api/profile/${created.body.user._id}`).set(auth(tokenFor(viewer)));
    assert.equal(viewed.status, 200, JSON.stringify(viewed.body));
    const viewedBlob = JSON.stringify(viewed.body);
    assert.equal(viewedBlob.includes("createdBy"), false);
    assert.equal(viewedBlob.includes(ADMIN_NAME), false);
    assert.equal(viewedBlob.includes(PHONE), false);
  });

  it("rejects a member profile that still has no phone", async () => {
    const { headers } = await createAdmin();
    const created = await createMember(headers, { name: "נועה לוי", gender: "female" });
    assert.equal(created.status, 201, JSON.stringify(created.body));

    const loggedIn = await request(app).post("/api/auth/code-login").send({ code: created.body.accessCode });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    const setup = await request(app).post("/api/auth/account-setup").set(auth(loggedIn.body.token)).send({
      email: "noa@example.test",
      password: "secret",
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.body));

    const missingPhone = await request(app).post("/api/profile").set(auth(setup.body.token)).send({
      age: 23,
      gender: "female",
    });
    assert.equal(missingPhone.status, 400);
    assert.equal(missingPhone.body.message, PHONE_REQUIRED);

    const saved = await request(app).post("/api/profile").set(auth(setup.body.token)).send({
      age: 23,
      gender: "female",
      phone: PHONE,
    });
    assert.equal(saved.status, 201, JSON.stringify(saved.body));
    assert.equal(saved.body.profile.phone, PHONE);

    const stranger = await User.create({
      name: "צופה",
      email: "viewer@example.test",
      password: PASSWORD,
      gender: "male",
      role: "user",
    });
    await Profile.create({ user: stranger._id, gender: "male", age: 26 });
    const seen = await request(app).get("/api/match/candidates").set(auth(tokenFor(stranger)));
    assert.equal(JSON.stringify(seen.body).includes(PHONE), false);
  });

  it("logs in with the code, then forces email and password and invalidates the code", async () => {
    const { headers } = await createAdmin();
    const other = await User.create({
      name: "קיים",
      email: "taken@example.test",
      password: PASSWORD,
      role: "user",
    });
    const created = await createMember(headers, { name: "דוד חדש", gender: "male" });
    const code = created.body.accessCode;

    const loggedIn = await request(app).post("/api/auth/code-login").send({ code: ` ${code.slice(0, 4)}-${code.slice(4)} ` });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    assert.equal(loggedIn.body.user.credentialSetupRequired, true);
    assert.equal(loggedIn.body.user.allowCodeLogin, false);
    assert.equal(loggedIn.body.user.name, "דוד חדש");
    assert.equal(loggedIn.body.user.gender, "male");
    assert.equal(JSON.stringify(loggedIn.body).includes("createdBy"), false);
    assert.equal(JSON.stringify(loggedIn.body).includes(ADMIN_NAME), false);

    const me = await request(app).get("/api/auth/me").set(auth(loggedIn.body.token));
    assert.equal(me.body.user.credentialSetupRequired, true);
    assert.equal(JSON.stringify(me.body).includes("createdBy"), false);

    const blocked = await request(app).get("/api/profile/me").set(auth(loggedIn.body.token));
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.message, SETUP_REQUIRED);

    const matches = await request(app).get("/api/match/candidates").set(auth(loggedIn.body.token));
    assert.equal(matches.status, 403);

    const duplicate = await request(app).post("/api/auth/account-setup").set(auth(loggedIn.body.token)).send({
      email: "taken@example.test",
      password: "secret",
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, "האימייל כבר רשום");

    const stillCode = await request(app).post("/api/auth/code-login").send({ code });
    assert.equal(stillCode.status, 200);

    const setup = await request(app).post("/api/auth/account-setup").set(auth(loggedIn.body.token)).send({
      email: "  David@Example.test ",
      password: "secret",
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.body));
    assert.equal(setup.body.user.email, "david@example.test");
    assert.equal(setup.body.user.credentialSetupRequired, false);
    assert.notEqual(setup.body.token, loggedIn.body.token);

    const oldSession = await request(app).get("/api/auth/me").set(auth(loggedIn.body.token));
    assert.equal(oldSession.status, 401);

    const oldCode = await request(app).post("/api/auth/code-login").send({ code });
    assert.equal(oldCode.status, 401);
    assert.equal(oldCode.body.message, "הקוד אינו תקין");

    const emailLogin = await request(app).post("/api/auth/login").send({
      email: "david@example.test",
      password: "secret",
    });
    assert.equal(emailLogin.status, 200, JSON.stringify(emailLogin.body));
    assert.equal(emailLogin.body.user.credentialSetupRequired, false);

    const profile = await request(app).get("/api/profile/me").set(auth(setup.body.token));
    assert.equal(profile.status, 404);

    const opened = await request(app).get(`/api/admin/users/${created.body.user._id}/profile`).set(headers);
    assert.equal(opened.status, 200, JSON.stringify(opened.body));
    assert.equal(opened.body.user.email, "david@example.test");
    assert.equal(opened.body.user.accessCode, undefined);
    assert.equal(JSON.stringify(opened.body).includes(code), false);
    const cleared = await User.findById(created.body.user._id).select("+accessCodeCipher +accessCodeLookup +password").lean();
    assert.equal(cleared.accessCodeCipher, undefined);
    assert.equal(cleared.accessCodeLookup, undefined);
    assert.equal(await comparePassword("secret", cleared.password), true);
    assert.equal(await comparePassword(code, cleared.password), false);

    const again = await request(app).post("/api/admin/users/" + created.body.user._id + "/access-code").set(headers);
    assert.equal(again.status, 400);
    assert.equal(again.body.message, "אין קוד פעיל");
    assert.equal(other.email, "taken@example.test");
  });

  it("keeps the code working when ALLOW_CODE_LOGIN is on, until credentials are set", async () => {
    const { headers } = await createAdmin();
    const created = await createMember(headers, { name: "דוד חדש", gender: "male" });
    process.env.ALLOW_CODE_LOGIN = "true";
    try {
      const first = await request(app).post("/api/auth/code-login").send({ code: created.body.accessCode });
      assert.equal(first.status, 200, JSON.stringify(first.body));
      assert.equal(first.body.user.allowCodeLogin, true);
      assert.equal(first.body.user.credentialSetupRequired, true);

      const profile = await request(app).get("/api/profile/me").set(auth(first.body.token));
      assert.equal(profile.status, 404);

      const second = await request(app).post("/api/auth/code-login").send({ code: created.body.accessCode });
      assert.equal(second.status, 200);

      const ownProfile = await request(app).post("/api/profile").set(auth(second.body.token)).send({
        age: 24,
        gender: "male",
      });
      assert.equal(ownProfile.status, 400);
      assert.equal(ownProfile.body.message, PHONE_REQUIRED);

      const setup = await request(app).post("/api/auth/account-setup").set(auth(second.body.token)).send({
        email: "david-flag@example.test",
        password: "secret",
      });
      assert.equal(setup.status, 200, JSON.stringify(setup.body));
    } finally {
      delete process.env.ALLOW_CODE_LOGIN;
    }

    const retired = await request(app).post("/api/auth/code-login").send({ code: created.body.accessCode });
    assert.equal(retired.status, 401);
    const emailLogin = await request(app).post("/api/auth/login").send({
      email: "david-flag@example.test",
      password: "secret",
    });
    assert.equal(emailLogin.status, 200);
  });

  it("blocks identity before account setup and keeps the admin-set gender", async () => {
    const { headers } = await createAdmin();
    const created = await createMember(headers, { name: "דוד חדש", gender: "male" });
    const loggedIn = await request(app).post("/api/auth/code-login").send({ code: created.body.accessCode });
    assert.equal(loggedIn.status, 200, JSON.stringify(loggedIn.body));
    const session = auth(loggedIn.body.token);

    const blocked = await request(app).post("/api/auth/identity").set(session).send({
      name: "שם אחר",
      gender: "female",
    });
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.message, SETUP_REQUIRED);

    let stored = await User.findById(created.body.user._id).lean();
    assert.equal(stored.name, "דוד חדש");
    assert.equal(stored.gender, "male");

    // The setup guard steps aside while the dev flag is on. Gender still cannot move.
    process.env.ALLOW_CODE_LOGIN = "true";
    try {
      const open = await request(app).post("/api/auth/identity").set(session).send({
        name: "שם אחר",
        gender: "female",
      });
      assert.equal(open.status, 400);
      assert.equal(open.body.message, "מגדר הוא שדה חובה");
    } finally {
      delete process.env.ALLOW_CODE_LOGIN;
    }

    stored = await User.findById(created.body.user._id).lean();
    assert.equal(stored.name, "דוד חדש");
    assert.equal(stored.gender, "male");

    const setup = await request(app).post("/api/auth/account-setup").set(session).send({
      email: "david-locked@example.test",
      password: "secret",
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.body));

    const after = await request(app).post("/api/auth/identity").set(auth(setup.body.token)).send({
      name: "שם אחר",
      gender: "female",
    });
    assert.equal(after.status, 400);
    assert.equal(after.body.message, "מגדר הוא שדה חובה");

    stored = await User.findById(created.body.user._id).lean();
    assert.equal(stored.name, "דוד חדש");
    assert.equal(stored.gender, "male");
  });

  it("resets access with a new code, keeps the email, and drops the old password", async () => {
    const { headers } = await createAdmin();
    const created = await createMember(headers, { name: "דוד חדש", gender: "male" });
    const firstCode = created.body.accessCode;
    const loggedIn = await request(app).post("/api/auth/code-login").send({ code: firstCode });
    const setup = await request(app).post("/api/auth/account-setup").set(auth(loggedIn.body.token)).send({
      email: "david-reset@example.test",
      password: "secret",
    });
    assert.equal(setup.status, 200, JSON.stringify(setup.body));

    const reset = await request(app).post(`/api/admin/users/${created.body.user._id}/access-reset`).set(headers);
    assert.equal(reset.status, 200, JSON.stringify(reset.body));
    assert.match(reset.body.accessCode, codePattern);
    assert.notEqual(reset.body.accessCode, firstCode);
    assert.equal(reset.body.password, undefined);
    assert.equal(JSON.stringify(reset.body).includes("secret"), false);

    const stored = await User.findById(created.body.user._id).select("+password +accessCodeCipher +accessCodeLookup +tokenVersion").lean();
    assert.equal(stored.email, "david-reset@example.test");
    assert.equal(stored.credentialSetupRequired, true);
    assert.equal(stored.accessCodeCipher.includes(reset.body.accessCode), false);
    assert.equal(decryptAccessCode(stored.accessCodeCipher), reset.body.accessCode);
    assert.equal(await comparePassword(reset.body.accessCode, stored.password), true);
    assert.equal(await comparePassword("secret", stored.password), false);
    assert.notEqual(stored.password, "secret");

    const oldSession = await request(app).get("/api/auth/me").set(auth(setup.body.token));
    assert.equal(oldSession.status, 401);
    const oldPassword = await request(app).post("/api/auth/login").send({
      email: "david-reset@example.test",
      password: "secret",
    });
    assert.equal(oldPassword.status, 401);
    const oldCode = await request(app).post("/api/auth/code-login").send({ code: firstCode });
    assert.equal(oldCode.status, 401);

    const codeLogin = await request(app).post("/api/auth/code-login").send({ code: reset.body.accessCode });
    assert.equal(codeLogin.status, 200, JSON.stringify(codeLogin.body));
    assert.equal(codeLogin.body.user.email, "david-reset@example.test");
    assert.equal(codeLogin.body.user.credentialSetupRequired, true);
    assert.equal(codeLogin.body.user.accessCode, undefined);
    assert.equal(JSON.stringify(codeLogin.body).includes(reset.body.accessCode), false);

    const listed = await request(app).get("/api/admin/users").set(headers);
    const row = listed.body.users.find((user) => String(user._id) === String(created.body.user._id));
    assert.equal(row.accessCode, reset.body.accessCode);
    assert.equal(row.email, "david-reset@example.test");
    const opened = await request(app).get(`/api/admin/users/${created.body.user._id}/profile`).set(headers);
    assert.equal(opened.body.user.accessCode, reset.body.accessCode);
    assert.equal(opened.body.user.email, "david-reset@example.test");

    const me = await request(app).get("/api/auth/me").set(auth(codeLogin.body.token));
    assert.equal(JSON.stringify(me.body).includes(reset.body.accessCode), false);

    const again = await request(app).post("/api/auth/account-setup").set(auth(codeLogin.body.token)).send({
      email: "david-reset@example.test",
      password: "next-secret",
    });
    assert.equal(again.status, 200, JSON.stringify(again.body));
    assert.equal(again.body.user.email, "david-reset@example.test");
    assert.equal(again.body.user.credentialSetupRequired, false);
    const after = await request(app).get(`/api/admin/users/${created.body.user._id}/profile`).set(headers);
    assert.equal(after.body.user.accessCode, undefined);
    assert.equal(after.body.user.email, "david-reset@example.test");
    assert.equal(JSON.stringify(after.body).includes(reset.body.accessCode), false);
    const gone = await User.findById(created.body.user._id).select("+accessCodeCipher +password").lean();
    assert.equal(gone.accessCodeCipher, undefined);
    assert.equal(await comparePassword("next-secret", gone.password), true);

    const emailLogin = await request(app).post("/api/auth/login").send({
      email: "david-reset@example.test",
      password: "next-secret",
    });
    assert.equal(emailLogin.status, 200);
    const retired = await request(app).post("/api/auth/code-login").send({ code: reset.body.accessCode });
    assert.equal(retired.status, 401);
  });

  it("derives the encryption key from ACCESS_CODE_KEY, or from JWT_SECRET when that is unset", () => {
    const sample = "ABCDEFGHJKLMNPQR";
    delete process.env.ACCESS_CODE_KEY;
    const fromJwt = encryptAccessCode(sample);
    assert.equal(fromJwt.includes(sample), false);
    assert.equal(decryptAccessCode(fromJwt), sample);
    assert.notEqual(encryptAccessCode(sample), fromJwt);

    process.env.ACCESS_CODE_KEY = "dedicated-test-key";
    try {
      const fromDedicated = encryptAccessCode(sample);
      assert.notEqual(fromDedicated, fromJwt);
      assert.equal(decryptAccessCode(fromDedicated), sample);
      delete process.env.ACCESS_CODE_KEY;
      assert.throws(() => decryptAccessCode(fromDedicated));
      assert.equal(decryptAccessCode(fromJwt), sample);
    } finally {
      delete process.env.ACCESS_CODE_KEY;
    }
  });

  it("replaces the code when an admin generates a new one", async () => {
    const { headers } = await createAdmin();
    const created = await createMember(headers, { name: "דוד חדש", gender: "male" });
    const firstCode = created.body.accessCode;

    const renewed = await request(app).post(`/api/admin/users/${created.body.user._id}/access-code`).set(headers);
    assert.equal(renewed.status, 200, JSON.stringify(renewed.body));
    assert.match(renewed.body.accessCode, codePattern);
    assert.notEqual(renewed.body.accessCode, firstCode);
    assert.equal(JSON.stringify(renewed.body).includes(firstCode), false);
    const opened = await request(app).get(`/api/admin/users/${created.body.user._id}/profile`).set(headers);
    assert.equal(opened.body.user.accessCode, renewed.body.accessCode);
    const stored = await User.findById(created.body.user._id).select("+accessCodeCipher").lean();
    assert.equal(stored.accessCodeCipher.includes(renewed.body.accessCode), false);
    assert.equal(decryptAccessCode(stored.accessCodeCipher), renewed.body.accessCode);

    const oldLogin = await request(app).post("/api/auth/code-login").send({ code: firstCode });
    assert.equal(oldLogin.status, 401);

    const newLogin = await request(app).post("/api/auth/code-login").send({ code: renewed.body.accessCode });
    assert.equal(newLogin.status, 200);

    const previous = await request(app).get("/api/auth/me").set(auth(newLogin.body.token));
    assert.equal(previous.status, 200);

    const renewedAgain = await request(app).post(`/api/admin/users/${created.body.user._id}/access-code`).set(headers);
    assert.equal(renewedAgain.status, 200);
    const signedOut = await request(app).get("/api/auth/me").set(auth(newLogin.body.token));
    assert.equal(signedOut.status, 401);
  });

  it("locks code login after repeated failures", async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      for (let i = 0; i < 8; i += 1) {
        const empty = await request(app).post("/api/auth/code-login").send({ code: "   " });
        assert.equal(empty.status, 400, `empty ${i}: ${empty.body.message}`);
        await settle();
      }

      for (let i = 0; i < 5; i += 1) {
        const failed = await request(app).post("/api/auth/code-login").send({ code: `WRONGCODE${i}XXXX` });
        assert.equal(failed.status, 401, `wrong ${i}: ${failed.status} ${failed.body.message}`);
      }

      const blocked = await request(app).post("/api/auth/code-login").send({ code: "ABCDEFGHJKLMNPQR" });
      assert.equal(blocked.status, 429);
      assert.equal(blocked.body.message, CODE_LIMIT);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it("refuses the create and code routes to someone who is not an admin", async () => {
    const member = await User.create({
      name: "חבר",
      email: "member@example.test",
      password: PASSWORD,
      role: "user",
    });
    const headers = auth(tokenFor(member));
    const created = await createMember(headers, { name: "מישהו", gender: "male" });
    assert.equal(created.status, 403);

    const missing = await request(app).post("/api/auth/code-login").send({});
    assert.equal(missing.status, 400);
    assert.equal(missing.body.message, "יש להזין קוד");

    const bad = await createAdmin().then(({ headers: adminHeaders }) =>
      createMember(adminHeaders, { name: "", gender: "other" })
    );
    assert.equal(bad.status, 400);
  });
});
