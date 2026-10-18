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
const { comparePassword } = require("../src/utils/hash");
const User = require("../src/models/user.model");
const Profile = require("../src/models/profile.model");
const Preference = require("../src/models/preference.model");
const Interest = require("../src/models/interest.model");

const PASSWORD = "AdminPass12";
const NOTE = "SECRET-ADMIN-NOTE";
const IMAGE_ID = "secret-image-boy";

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const tokenFor = (user) => generateToken(user._id, user.role);

describe("admin pages", () => {
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
    const [admin, boy, girl, olderBoy] = await Promise.all([
      User.create({
        name: "הרב חיים שטרן",
        email: "admin@example.test",
        idNumber: "100000010",
        password: PASSWORD,
        role: "admin",
      }),
      User.create({
        name: "יוסי כהן",
        email: "yossi@example.test",
        idNumber: "100000011",
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: "שרה לוי",
        email: "sara@example.test",
        idNumber: "100000012",
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: "דן לוי",
        email: "dan@example.test",
        idNumber: "100000013",
        password: PASSWORD,
        role: "user",
      }),
    ]);

    await User.collection.updateOne(
      { _id: olderBoy._id },
      { $set: { createdAt: new Date("2020-01-15T00:00:00.000Z") } }
    );

    await Profile.create([
      {
        user: boy._id,
        gender: "male",
        age: 27,
        city: "מודיעין עילית",
        yeshiva: "ישיבה גבוהה",
        occupation: "הייטק",
        image: IMAGE_ID,
        resumePdf: "secret-resume-boy",
      },
      {
        user: girl._id,
        gender: "female",
        age: 24,
        city: "ירושלים",
        seminar: "סמינר",
        occupation: "מורה",
      },
      {
        user: olderBoy._id,
        gender: "male",
        age: 31,
        city: "בני ברק",
      },
    ]);

    await Preference.create({
      user: boy._id,
      ageMin: 20,
      ageMax: 30,
      city: "חיפה",
    });

    const interest = await Interest.create({
      sender: boy._id,
      receiver: girl._id,
      status: "accepted",
      senderApprovedToManager: true,
      receiverApprovedToManager: true,
    });

    await Interest.create({
      sender: olderBoy._id,
      receiver: girl._id,
      status: "pending",
      senderApprovedToManager: true,
      receiverApprovedToManager: false,
    });

    return { admin, boy, girl, olderBoy, interest };
  };

  it("refuses the admin screens to a regular user", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.boy));

    for (const path of [
      "/api/admin/summary",
      "/api/admin/cases",
      "/api/admin/suggestions",
      "/api/admin/settings",
      "/api/admin/search?q=יוסי",
    ]) {
      const response = await request(app).get(path).set(headers);
      assert.equal(response.status, 403, path);
    }

    const candidate = await request(app).post("/api/admin/candidates").set(headers).send({ name: "מישהו" });
    const matchmaker = await request(app).post("/api/admin/matchmakers").set(headers).send({ name: "מישהו" });
    assert.equal(candidate.status, 403);
    assert.equal(matchmaker.status, 403);
  });

  it("counts real people and only forwarded cases", async () => {
    const fixture = await seed();
    const summary = await request(app).get("/api/admin/summary").set(auth(tokenFor(fixture.admin)));

    assert.equal(summary.status, 200);
    assert.equal(summary.body.adminName, "הרב חיים שטרן");
    assert.equal(summary.body.boys.total, 2);
    assert.equal(summary.body.boys.addedThisMonth, 1);
    assert.equal(summary.body.girls.total, 1);
    assert.equal(summary.body.girls.addedThisMonth, 1);
    assert.equal(summary.body.cases.total, 1);
    assert.equal(summary.body.cases.fresh, 1);
    assert.equal(summary.body.closed.total, 0);
    assert.equal(summary.body.recent.length, 1);
    assert.equal(summary.body.recent[0].sender.name, "יוסי כהן");
    assert.equal(summary.body.recent[0].receiver.email, "sara@example.test");
    assert.equal(summary.body.recent[0].matchPercent, 50);
    assert.equal(JSON.stringify(summary.body).includes(PASSWORD), false);
    assert.equal(JSON.stringify(summary.body).includes(IMAGE_ID), false);
  });

  it("lists directory rows with contact for an admin and derived status", async () => {
    const fixture = await seed();
    const users = await request(app).get("/api/admin/users").set(auth(tokenFor(fixture.admin)));
    assert.equal(users.status, 200);

    const serialized = JSON.stringify(users.body);
    assert.equal(serialized.includes("יוסי כהן"), true);
    assert.equal(serialized.includes("100000011"), true);
    assert.equal(serialized.includes("yossi@example.test"), true);
    assert.equal(serialized.includes(PASSWORD), false);
    assert.equal(serialized.includes(IMAGE_ID), false);
    assert.equal(serialized.includes(`/api/files/${fixture.boy._id}/image`), true);

    const boy = users.body.users.find((user) => String(user._id) === String(fixture.boy._id));
    const older = users.body.users.find((user) => String(user._id) === String(fixture.olderBoy._id));
    assert.equal(boy.status, "in_process");
    assert.equal(boy.profile.city, "מודיעין עילית");
    assert.equal(older.status, "active");
  });

  it("updates a forwarded case and keeps the note off the couple's interest", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));
    const id = String(fixture.interest._id);

    const updated = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({
      status: "in_progress",
      note: NOTE,
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.case.status, "in_progress");
    assert.equal(updated.body.case.note, NOTE);
    assert.equal(updated.body.case.sender.idNumber, "100000011");

    const cases = await request(app).get("/api/admin/cases").set(headers);
    assert.equal(cases.body.cases.length, 1);
    assert.equal(cases.body.cases[0].note, NOTE);

    const incoming = await request(app).get("/api/interest/incoming").set(auth(tokenFor(fixture.girl)));
    assert.equal(incoming.status, 200);
    const incomingText = JSON.stringify(incoming.body);
    assert.equal(incomingText.includes(NOTE), false);
    assert.equal(incomingText.includes("adminNote"), false);

    const closed = await request(app).patch(`/api/admin/cases/${id}`).set(headers).send({ status: "closed" });
    assert.equal(closed.status, 200);
    const stored = await Interest.findById(id).lean();
    assert.equal(stored.status, "accepted");
    assert.equal(stored.senderApprovedToManager, true);
    assert.equal(stored.receiverApprovedToManager, true);

    const after = await request(app).get("/api/admin/users").set(headers);
    const boy = after.body.users.find((user) => String(user._id) === String(fixture.boy._id));
    assert.equal(boy.status, "engaged");
  });

  it("rejects a case that was not forwarded by both sides", async () => {
    const fixture = await seed();
    const pending = await Interest.findOne({ status: "pending" }).lean();
    const response = await request(app)
      .patch(`/api/admin/cases/${pending._id}`)
      .set(auth(tokenFor(fixture.admin)))
      .send({ note: "לא אמור להישמר" });
    assert.equal(response.status, 404);

    const tooLong = await request(app)
      .patch(`/api/admin/cases/${fixture.interest._id}`)
      .set(auth(tokenFor(fixture.admin)))
      .send({ note: "א".repeat(1001) });
    assert.equal(tooLong.status, 400);

    const badStatus = await request(app)
      .patch(`/api/admin/cases/${fixture.interest._id}`)
      .set(auth(tokenFor(fixture.admin)))
      .send({ status: "engaged" });
    assert.equal(badStatus.status, 400);
  });

  it("closes a stale forwarded case only when that setting is on", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));
    await Interest.collection.updateOne(
      { _id: fixture.interest._id },
      { $set: { updatedAt: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000) } }
    );

    const before = await request(app).get("/api/admin/cases").set(headers);
    assert.equal(before.body.cases[0].status, "new");

    const saved = await request(app).patch("/api/admin/settings").set(headers).send({ autoClose: true });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.settings.autoClose, true);

    const after = await request(app).get("/api/admin/cases").set(headers);
    assert.equal(after.body.cases[0].status, "closed");
    const interest = await Interest.findById(fixture.interest._id).lean();
    assert.equal(interest.status, "accepted");
  });

  it("saves the matchmaker profile without returning the password", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));

    const missing = await request(app).put("/api/admin/account").set(headers).send({
      email: "arie@example.test",
      password: "NewerPass1",
    });
    assert.equal(missing.status, 400);

    const wrong = await request(app).put("/api/admin/account").set(headers).send({
      email: "arie@example.test",
      currentPassword: "Wrongpass1",
    });
    assert.equal(wrong.status, 400);

    const renamed = await request(app).put("/api/admin/account").set(headers).send({
      name: "הרב אריה",
      activityArea: "ירושלים",
    });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.token, undefined);

    const updated = await request(app).put("/api/admin/account").set(headers).send({
      email: "arie@example.test",
      password: "NewerPass1",
      currentPassword: PASSWORD,
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.account.name, "הרב אריה");
    assert.equal(updated.body.account.email, "arie@example.test");
    assert.equal(updated.body.account.activityArea, "ירושלים");
    assert.equal(updated.body.account.password, undefined);
    assert.equal(typeof updated.body.token, "string");
    assert.equal(JSON.stringify(updated.body).includes("NewerPass1"), false);

    const stored = await User.findById(fixture.admin._id).select("+password +tokenVersion");
    assert.equal(await comparePassword("NewerPass1", stored.password), true);
    assert.equal(stored.tokenVersion, 1);

    const stale = await request(app).get("/api/admin/settings").set(headers);
    assert.equal(stale.status, 401);

    const nextHeaders = auth(updated.body.token);
    const weak = await request(app).put("/api/admin/account").set(nextHeaders).send({
      password: "12345678",
      currentPassword: "NewerPass1",
    });
    assert.equal(weak.status, 400);

    const settings = await request(app).get("/api/admin/settings").set(nextHeaders);
    assert.equal(settings.body.team.length, 1);
    assert.equal(settings.body.team[0].role, "admin");
    assert.equal(settings.body.team[0].subtitle, "מנהל מערכת");
    assert.equal(settings.body.account.activityArea, "ירושלים");
    assert.equal(JSON.stringify(settings.body).includes(PASSWORD), false);
  });

  it("adds a candidate and a matchmaker without returning passwords", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));

    const created = await request(app).post("/api/admin/candidates").set(headers).send({
      name: "לאה חדש",
      idNumber: "100000099",
      email: "lea@example.test",
      password: "Candidate1",
      gender: "female",
      age: 23,
      city: "חיפה",
      seminar: "סמינר",
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.name, "לאה חדש");
    assert.equal(created.body.user.email, "lea@example.test");
    assert.equal(created.body.user.idNumber, "100000099");
    assert.equal(created.body.user.profile.gender, "female");
    assert.equal(created.body.user.profile.city, "חיפה");
    assert.equal(created.body.user.status, "active");
    assert.equal(JSON.stringify(created.body).includes("Candidate1"), false);

    const listed = await request(app).get("/api/admin/users").set(headers);
    assert.equal(listed.body.users.some((user) => user.email === "lea@example.test"), true);

    const duplicate = await request(app).post("/api/admin/candidates").set(headers).send({
      name: "עוד מישהי",
      idNumber: "100000099",
      email: "other@example.test",
      password: "Candidate1",
      gender: "female",
      age: 22,
    });
    assert.equal(duplicate.status, 409);

    const added = await request(app).post("/api/admin/matchmakers").set(headers).send({
      name: "מרים לוין",
      idNumber: "100000098",
      email: "miriam@example.test",
      password: "Matchmaker1",
    });
    assert.equal(added.status, 201);
    assert.equal(added.body.member.role, "admin");
    assert.equal(added.body.member.staffKind, "matchmaker");
    assert.equal(added.body.member.subtitle, "שדכן/ית");
    assert.equal(JSON.stringify(added.body).includes("Matchmaker1"), false);

    const settings = await request(app).get("/api/admin/settings").set(headers);
    const miriam = settings.body.team.find((member) => member.email === "miriam@example.test");
    assert.equal(miriam.subtitle, "שדכן/ית");
    assert.equal(settings.body.team[0].subtitle, "מנהל מערכת");
  });

  it("searches candidates and cases from stored names", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.admin));

    const found = await request(app).get("/api/admin/search").query({ q: "מודיעין" }).set(headers);
    assert.equal(found.status, 200);
    assert.equal(found.body.candidates.length, 1);
    assert.equal(found.body.candidates[0].name, "יוסי כהן");

    const byCase = await request(app).get("/api/admin/search").query({ q: "שרה" }).set(headers);
    assert.equal(byCase.body.cases.length, 1);
    assert.equal(byCase.body.cases[0].receiverName, "שרה לוי");
    assert.equal(JSON.stringify(byCase.body).includes(PASSWORD), false);
  });

  it("gives an admin full details at every stage and keeps them off a regular user", async () => {
    const photoBoy = "secret-stage-photo-boy";
    const resumeBoy = "secret-stage-resume-boy";
    const photoGirl = "secret-stage-photo-girl";
    const resumeGirl = "secret-stage-resume-girl";
    const boyPhone = "0501111111";
    const girlPhone = "0522222222";

    const [admin, boy, girl] = await Promise.all([
      User.create({
        name: "הרב שלב",
        email: "stage-admin@example.test",
        idNumber: "200000020",
        password: PASSWORD,
        role: "admin",
      }),
      User.create({
        name: "נעם פרטי",
        email: "stage-boy@example.test",
        idNumber: "200000021",
        phone: boyPhone,
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: "מיכל פרטית",
        email: "stage-girl@example.test",
        idNumber: "200000022",
        phone: girlPhone,
        password: PASSWORD,
        role: "user",
      }),
    ]);

    await Profile.create([
      {
        user: boy._id,
        gender: "male",
        age: 28,
        city: "חיפה",
        height: 178,
        style: "classic",
        appearance: "average",
        ethnicity: "ashkenazi",
        description: "תיאור נעם",
        lookingFor: "מחפש מיכל",
        maritalStatus: "single",
        occupation: "הייטק",
        yeshiva: "ישיבת נעם",
        financialRequirement: "גמיש",
        financialCapabilities: "יציב",
        financialStatus: 40,
        financialDemand: 1000,
        financialParticipation: 2000,
        image: photoBoy,
        resumePdf: resumeBoy,
        resumeSize: 321,
      },
      {
        user: girl._id,
        gender: "female",
        age: 25,
        city: "חיפה",
        height: 165,
        style: "classic",
        appearance: "average",
        ethnicity: "sephardic",
        description: "תיאור מיכל",
        lookingFor: "מחפשת נעם",
        maritalStatus: "single",
        occupation: "מורה",
        seminar: "סמינר מיכל",
        financialRequirement: "פתוח",
        financialCapabilities: "מסודר",
        financialStatus: 55,
        financialDemand: 500,
        financialParticipation: 3000,
        image: photoGirl,
        resumePdf: resumeGirl,
        resumeSize: 654,
      },
    ]);

    await Preference.create([
      {
        user: boy._id,
        ageMin: 22,
        ageMax: 30,
        city: "חיפה",
        heightMin: 155,
        heightMax: 180,
        style: "classic",
        preferredAppearance: "average",
        financialMin: 10,
        financialMax: 80,
        preferredMaritalStatus: "single",
      },
      {
        user: girl._id,
        ageMin: 24,
        ageMax: 32,
        city: "חיפה",
        heightMin: 170,
        heightMax: 190,
        style: "classic",
        preferredAppearance: "average",
        financialMin: 20,
        financialMax: 90,
        preferredMaritalStatus: "single",
      },
    ]);

    const adminHeaders = auth(tokenFor(admin));
    const boyHeaders = auth(tokenFor(boy));
    const girlHeaders = auth(tokenFor(girl));
    const boyId = String(boy._id);
    const girlId = String(girl._id);
    const fileBody = (response) =>
      Buffer.isBuffer(response.body) ? response.body.toString() : String(response.text || "");

    const pairOf = (body) =>
      body.suggestions.find((item) => {
        const ids = [String(item.sender?._id), String(item.receiver?._id)];
        return ids.includes(boyId) && ids.includes(girlId);
      });

    const assertAdminPair = (item, stage) => {
      assert.ok(item, `missing admin suggestion at ${stage}`);
      assert.equal(item.stage, stage);
      const people = [item.sender, item.receiver];
      const naam = people.find((person) => String(person._id) === boyId);
      const michal = people.find((person) => String(person._id) === girlId);
      assert.equal(naam.name, "נעם פרטי");
      assert.equal(naam.email, "stage-boy@example.test");
      assert.equal(naam.phone, boyPhone);
      assert.equal(naam.idNumber, "200000021");
      assert.equal(naam.profile.yeshiva, "ישיבת נעם");
      assert.equal(naam.profile.lookingFor, "מחפש מיכל");
      assert.equal(naam.profile.maritalStatus, "single");
      assert.equal(naam.profile.financialDemand, 1000);
      assert.equal(naam.profile.financialParticipation, 2000);
      assert.equal(naam.profile.height, 178);
      assert.equal(naam.profile.image, `/api/files/${boyId}/image`);
      assert.equal(naam.profile.resumePdf, `/api/files/${boyId}/resume`);
      assert.equal(naam.resumePdf, `/api/files/${boyId}/resume`);
      assert.equal(naam.preference.ageMin, 22);
      assert.equal(naam.preference.city, "חיפה");
      assert.equal(naam.preference.preferredMaritalStatus, "single");
      assert.equal(michal.name, "מיכל פרטית");
      assert.equal(michal.email, "stage-girl@example.test");
      assert.equal(michal.phone, girlPhone);
      assert.equal(michal.profile.seminar, "סמינר מיכל");
      assert.equal(michal.profile.image, `/api/files/${girlId}/image`);
      assert.equal(michal.profile.resumePdf, `/api/files/${girlId}/resume`);
      assert.equal(michal.preference.heightMin, 170);
      const serialized = JSON.stringify(item);
      assert.equal(serialized.includes(PASSWORD), false);
      assert.equal(serialized.includes(photoBoy), false);
      assert.equal(serialized.includes(resumeGirl), false);
    };

    const identityMarkers = ["נעם פרטי", "מיכל פרטית", "stage-boy@example.test", "stage-girl@example.test", boyPhone, girlPhone, photoBoy, photoGirl, resumeBoy, resumeGirl];

    const assertUserHidden = (body) => {
      const serialized = JSON.stringify(body);
      for (const marker of identityMarkers) {
        assert.equal(serialized.includes(marker), false, marker);
      }
      assert.equal(serialized.includes("idNumber"), false);
      assert.equal(serialized.includes("password"), false);
    };

    const assertFile = async (userId, kind, headers, status, payload) => {
      const response = await request(app).get(`/api/files/${userId}/${kind}`).set(headers);
      assert.equal(response.status, status);
      if (status === 200) assert.equal(fileBody(response), payload);
      return response;
    };

    const listed = await request(app).get("/api/admin/suggestions").set(adminHeaders);
    assert.equal(listed.status, 200);
    assertAdminPair(pairOf(listed.body), "new");

    const directory = await request(app).get("/api/admin/users").set(adminHeaders);
    const directoryBoy = directory.body.users.find((user) => String(user._id) === boyId);
    assert.equal(directoryBoy.phone, boyPhone);
    assert.equal(directoryBoy.email, "stage-boy@example.test");
    assert.equal(directoryBoy.profile.image, `/api/files/${boyId}/image`);
    assert.equal(directoryBoy.profile.lookingFor, "מחפש מיכל");
    assert.equal(directoryBoy.preference.ageMax, 30);
    assert.equal(JSON.stringify(directory.body).includes(photoBoy), false);

    const profile = await request(app).get(`/api/admin/users/${girlId}/profile`).set(adminHeaders);
    assert.equal(profile.body.user.phone, girlPhone);
    assert.equal(profile.body.user.email, "stage-girl@example.test");
    assert.equal(profile.body.profile.seminar, "סמינר מיכל");
    assert.equal(profile.body.profile.image, `/api/files/${girlId}/image`);
    assert.equal(profile.body.preference.city, "חיפה");
    assert.equal(profile.body.user.password, undefined);

    const hiddenNew = await request(app).get("/api/suggestions").set(boyHeaders);
    assert.equal(hiddenNew.status, 200);
    assert.ok(hiddenNew.body.newSuggestions.some((item) => String(item._id) === girlId));
    assertUserHidden(hiddenNew.body);
    await assertFile(girlId, "image", boyHeaders, 404);
    await assertFile(girlId, "resume", boyHeaders, 404);
    await assertFile(girlId, "image", adminHeaders, 200, `image:${photoGirl}`);
    await assertFile(boyId, "resume", adminHeaders, 200, `resumePdf:${resumeBoy}`);

    const blocked = await request(app).get("/api/admin/suggestions").set(boyHeaders);
    assert.equal(blocked.status, 403);
    assertUserHidden(blocked.body);

    await request(app).post("/api/interest").set(boyHeaders).send({ receiverId: girlId });
    const sent = await request(app).get("/api/admin/suggestions").set(adminHeaders);
    assertAdminPair(pairOf(sent.body), "interest");
    const boySent = await request(app).get("/api/suggestions").set(boyHeaders);
    const girlReceived = await request(app).get("/api/suggestions").set(girlHeaders);
    assert.equal(boySent.body.sent.length, 1);
    assert.equal(girlReceived.body.received.length, 1);
    assertUserHidden(boySent.body);
    assertUserHidden(girlReceived.body);
    await assertFile(boyId, "image", girlHeaders, 404);
    await assertFile(girlId, "resume", adminHeaders, 200, `resumePdf:${resumeGirl}`);

    await request(app).put("/api/interest/respond").set(girlHeaders).send({ senderId: boyId, status: "accepted" });
    const approved = await request(app).get("/api/admin/suggestions").set(adminHeaders);
    assertAdminPair(pairOf(approved.body), "active");

    await request(app).post("/api/interest/send-to-manager").set(boyHeaders).send({ otherUserId: girlId });
    const forwarded = await request(app).get("/api/admin/suggestions").set(adminHeaders);
    assertAdminPair(pairOf(forwarded.body), "forwarded");

    await request(app).post("/api/interest/send-to-manager").set(girlHeaders).send({ otherUserId: boyId });
    const matchmaker = await request(app).get("/api/admin/suggestions").set(adminHeaders);
    assertAdminPair(pairOf(matchmaker.body), "matchmaker");
    const cases = await request(app).get("/api/admin/cases").set(adminHeaders);
    const stageCase = cases.body.suggestions.find((item) => String(item._id) === String(pairOf(matchmaker.body)._id));
    assert.equal(stageCase.stage, "matchmaker");
    const casePeople = [stageCase.sender, stageCase.receiver];
    assert.equal(casePeople.find((person) => String(person._id) === boyId).phone, boyPhone);
    assert.equal(casePeople.find((person) => String(person._id) === girlId).email, "stage-girl@example.test");
    assert.equal(JSON.stringify(cases.body).includes(photoBoy), false);

    await request(app).put("/api/interest/respond").set(girlHeaders).send({ senderId: boyId, status: "rejected" });
    const declined = await request(app).get("/api/admin/suggestions").set(adminHeaders);
    assertAdminPair(pairOf(declined.body), "declined");
    const pending = await request(app).get("/api/admin/pending-matches").set(adminHeaders);
    assert.equal(
      pending.body.matches.some((item) => {
        const ids = [String(item.sender?._id), String(item.receiver?._id)];
        return ids.includes(boyId) && ids.includes(girlId);
      }),
      false
    );

    const afterDecline = await request(app).get("/api/suggestions").set(boyHeaders);
    assert.equal(afterDecline.body.declined.length, 1);
    assert.equal(afterDecline.body.active.length, 0);
    assert.equal(afterDecline.body.matchmaker.length, 0);
    assertUserHidden(afterDecline.body);
    const closedProfile = await request(app).get(`/api/profile/${girlId}`).set(boyHeaders);
    assert.equal(closedProfile.status, 404);
    await assertFile(girlId, "image", boyHeaders, 404);
    await assertFile(girlId, "resume", boyHeaders, 404);
    await assertFile(boyId, "image", girlHeaders, 404);
    await assertFile(girlId, "image", adminHeaders, 200, `image:${photoGirl}`);
    await assertFile(boyId, "resume", adminHeaders, 200, `resumePdf:${resumeBoy}`);

    const boyToken = tokenFor(boy);
    await User.updateOne({ _id: boy._id }, { role: "admin" });
    await assertFile(girlId, "image", auth(boyToken), 200, `image:${photoGirl}`);
    await User.updateOne({ _id: boy._id }, { role: "user" });
    await assertFile(girlId, "resume", auth(boyToken), 404);
  });
});
