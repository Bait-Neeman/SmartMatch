process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const { getFileUrl } = require("../src/services/storage.service");
const { generateToken } = require("../src/config/jwt");
const { sendInterest } = require("../src/services/interest.service");
const User = require("../src/models/user.model");
const Profile = require("../src/models/profile.model");
const Preference = require("../src/models/preference.model");
const Interest = require("../src/models/interest.model");

const PASSWORD = "LeakPassword1";

const VIEWER = {
  name: "LEAK-NAME-VIEWER",
  email: "leak-viewer@private.test",
  idNumber: "100000001",
  image: "leak-image-id-viewer",
  resumePdf: "leak-resume-id-viewer",
  yeshiva: "LEAK-YESHIVA-VIEWER",
  seminar: "LEAK-SEMINAR-VIEWER",
  financialRequirement: "LEAK-FINANCIAL-VIEWER",
  city: "Tel Aviv",
  occupation: "engineer",
  description: "viewer public text",
};

const RIVKA = {
  name: "LEAK-NAME-RIVKA",
  email: "leak-rivka@private.test",
  idNumber: "908172635",
  image: "leak-image-id-rivka",
  resumePdf: "leak-resume-id-rivka",
  yeshiva: "LEAK-YESHIVA-RIVKA",
  seminar: "LEAK-SEMINAR-BEIT-YAAKOV",
  financialRequirement: "LEAK-FINANCIAL-NOTE",
  financialCapabilities: "LEAK-CAPABILITIES-NOTE",
  city: "Haifa",
  occupation: "teacher",
  description: "public about text",
  financialStatus: 7,
};

// Strings that identify somebody. None of these may show up before mutual approval.
const SECRET_MARKERS = [
  VIEWER.name,
  VIEWER.email,
  VIEWER.idNumber,
  VIEWER.image,
  VIEWER.resumePdf,
  VIEWER.yeshiva,
  VIEWER.seminar,
  VIEWER.financialRequirement,
  RIVKA.name,
  RIVKA.email,
  RIVKA.idNumber,
  RIVKA.image,
  RIVKA.resumePdf,
  RIVKA.yeshiva,
  RIVKA.seminar,
  RIVKA.financialRequirement,
  RIVKA.financialCapabilities,
  "LEAK-NAME-EXCLUDED",
  "LEAK-NAME-PREFERENCE",
  "LEAK-NAME-ADMIN",
  "leak-image-id-admin",
  "leak-resume-id-admin",
  "CITY-TOO-OLD",
  "CITY-PREF-EXCLUDED",
  "CITY-ADMIN",
  PASSWORD,
];

const IDENTITY_KEYS = [
  "name",
  "email",
  "idNumber",
  "password",
  "phone",
  "mobile",
  "image",
  "resumePdf",
  "photo",
  "resume",
  "photoUrl",
  "resumeUrl",
  "imageUrl",
  "yeshiva",
  "seminar",
  "financialRequirement",
  "financialCapabilities",
  "financialStatus",
];

const CANDIDATE_KEYS = new Set([
  "_id",
  "age",
  "height",
  "city",
  "ethnicity",
  "style",
  "appearance",
  "gender",
  "occupation",
  "description",
]);

const collectKeys = (value, keys = new Set()) => {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, keys);
    return keys;
  }
  for (const [key, child] of Object.entries(value)) {
    keys.add(key);
    collectKeys(child, keys);
  }
  return keys;
};

const assertNoSecrets = (body, markers = SECRET_MARKERS) => {
  const serialized = JSON.stringify(body);
  for (const marker of markers) {
    assert.equal(serialized.includes(marker), false, `response leaked ${marker}: ${serialized}`);
  }
  const keys = collectKeys(body);
  for (const key of ["idNumber", "password"]) {
    assert.equal(keys.has(key), false, `response leaked key ${key}`);
  }
};

const assertAnonymous = (body) => {
  assertNoSecrets(body);
  const keys = collectKeys(body);
  for (const key of IDENTITY_KEYS) {
    assert.equal(keys.has(key), false, `identifying key ${key} present before approval`);
  }
};

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const tokenFor = (user) => generateToken(user._id, user.role);

const otherParty = (interest, viewerId) => {
  const senderId = interest.sender?._id || interest.sender;
  return String(senderId) === String(viewerId) ? interest.receiver : interest.sender;
};

describe("suggestion privacy", { timeout: 180000 }, () => {
  let mongo;

  before(async () => {
    const imageUrl = getFileUrl("image", RIVKA.image);
    const resumeUrl = getFileUrl("resumePdf", RIVKA.resumePdf);
    assert.ok(imageUrl && imageUrl.includes(RIVKA.image), `image signing unavailable: ${imageUrl}`);
    assert.ok(resumeUrl && resumeUrl.includes(RIVKA.resumePdf), `resume signing unavailable: ${resumeUrl}`);

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
    const [viewer, rivka, excluded, preferenceExcluded, admin] = await Promise.all([
      User.create({
        name: VIEWER.name,
        email: VIEWER.email,
        idNumber: VIEWER.idNumber,
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: RIVKA.name,
        email: RIVKA.email,
        idNumber: RIVKA.idNumber,
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: "LEAK-NAME-EXCLUDED",
        email: "leak-excluded@private.test",
        idNumber: "100000002",
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: "LEAK-NAME-PREFERENCE",
        email: "leak-pref@private.test",
        idNumber: "100000003",
        password: PASSWORD,
        role: "user",
      }),
      User.create({
        name: "LEAK-NAME-ADMIN",
        email: "leak-admin@private.test",
        idNumber: "100000004",
        password: PASSWORD,
        role: "admin",
      }),
    ]);

    await Profile.create([
      {
        user: viewer._id,
        gender: "male",
        age: 28,
        height: 180,
        city: VIEWER.city,
        ethnicity: "ashkenazi",
        style: "classic",
        appearance: "average",
        occupation: VIEWER.occupation,
        description: VIEWER.description,
        yeshiva: VIEWER.yeshiva,
        seminar: VIEWER.seminar,
        financialRequirement: VIEWER.financialRequirement,
        image: VIEWER.image,
        resumePdf: VIEWER.resumePdf,
      },
      {
        user: rivka._id,
        gender: "female",
        age: 24,
        height: 165,
        city: RIVKA.city,
        ethnicity: "sephardic",
        style: "modern",
        appearance: "average",
        occupation: RIVKA.occupation,
        description: RIVKA.description,
        yeshiva: RIVKA.yeshiva,
        seminar: RIVKA.seminar,
        financialRequirement: RIVKA.financialRequirement,
        financialCapabilities: RIVKA.financialCapabilities,
        financialStatus: RIVKA.financialStatus,
        image: RIVKA.image,
        resumePdf: RIVKA.resumePdf,
      },
      {
        user: excluded._id,
        gender: "female",
        age: 70,
        height: 160,
        city: "CITY-TOO-OLD",
        occupation: "retired",
        description: "excluded about",
      },
      {
        user: preferenceExcluded._id,
        gender: "female",
        age: 24,
        height: 160,
        city: "CITY-PREF-EXCLUDED",
        occupation: "designer",
        description: "preference excluded about",
      },
      {
        user: admin._id,
        gender: "female",
        age: 30,
        height: 170,
        city: "CITY-ADMIN",
        occupation: "manager",
        description: "admin about",
        image: "leak-image-id-admin",
        resumePdf: "leak-resume-id-admin",
      },
    ]);

    await Preference.create([
      { user: viewer._id, ageMin: 20, ageMax: 40 },
      { user: preferenceExcluded._id, ageMin: 50 },
    ]);

    const hashes = await User.find({
      _id: { $in: [viewer._id, rivka._id] },
    }).select("+password");

    return {
      viewer,
      rivka,
      excluded,
      preferenceExcluded,
      admin,
      passwordHashes: hashes.map((user) => user.password),
    };
  };

  const secretMarkersFor = (fixture) => [...SECRET_MARKERS, ...fixture.passwordHashes];

  // After mutual approval the other person's name, email, and files are supposed to be
  // present. These values stay hidden even then.
  const alwaysHiddenFor = (fixture) => [
    VIEWER.idNumber,
    RIVKA.idNumber,
    "100000002",
    "100000003",
    "100000004",
    PASSWORD,
    ...fixture.passwordHashes,
    "LEAK-NAME-EXCLUDED",
    "LEAK-NAME-PREFERENCE",
    "LEAK-NAME-ADMIN",
    "leak-image-id-admin",
    "leak-resume-id-admin",
    "CITY-TOO-OLD",
    "CITY-PREF-EXCLUDED",
    "CITY-ADMIN",
  ];

  it("returns only non-identifying suggestion fields before any interest", async () => {
    const fixture = await seed();
    const markers = secretMarkersFor(fixture);
    const headers = auth(tokenFor(fixture.viewer));

    const candidates = await request(app).get("/api/match/candidates").set(headers);
    assert.equal(candidates.status, 200);
    assertAnonymous(candidates.body);
    assertNoSecrets(candidates.body, secretMarkersFor(fixture));
    assert.equal(candidates.body.candidates.length, 1);

    const card = candidates.body.candidates[0];
    assert.equal(String(card._id), String(fixture.rivka._id));
    assert.equal(card.age, 24);
    assert.equal(card.height, 165);
    assert.equal(card.city, RIVKA.city);
    assert.equal(card.ethnicity, "sephardic");
    assert.equal(card.occupation, RIVKA.occupation);
    assert.equal(card.description, RIVKA.description);
    assert.equal(card.style, "modern");
    for (const key of Object.keys(card)) {
      assert.ok(CANDIDATE_KEYS.has(key), `unexpected candidate field ${key}`);
    }

    const matches = await request(app).get("/api/match").set(headers);
    assert.equal(matches.status, 200);
    assert.deepEqual(matches.body.matches, []);
    assertAnonymous(matches.body);

    const profile = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(headers);
    assert.equal(profile.status, 200);
    assertAnonymous(profile.body);
    assert.equal(profile.body.profile.city, RIVKA.city);
    assert.equal(profile.body.profile.occupation, RIVKA.occupation);
    assert.equal(profile.body.profile.description, RIVKA.description);
    assert.equal(profile.body.profile.age, 24);

    const incoming = await request(app).get("/api/interest/incoming").set(headers);
    const outgoing = await request(app).get("/api/interest/outgoing").set(headers);
    assert.equal(incoming.status, 200);
    assert.equal(outgoing.status, 200);
    assert.deepEqual(incoming.body.interests, []);
    assert.deepEqual(outgoing.body.interests, []);
  });

  it("keeps both sides anonymous after a one-sided interest", async () => {
    const fixture = await seed();
    const markers = secretMarkersFor(fixture);
    const viewerHeaders = auth(tokenFor(fixture.viewer));
    const rivkaHeaders = auth(tokenFor(fixture.rivka));

    const sent = await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.rivka._id) });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.interest.status, "pending");
    assertAnonymous(sent.body);

    const again = await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.rivka._id) });
    assert.equal(again.status, 409);

    const outgoing = await request(app).get("/api/interest/outgoing").set(viewerHeaders);
    const incoming = await request(app).get("/api/interest/incoming").set(rivkaHeaders);
    assert.equal(outgoing.status, 200);
    assert.equal(incoming.status, 200);
    assert.equal(outgoing.body.interests.length, 1);
    assert.equal(incoming.body.interests.length, 1);
    assertAnonymous(outgoing.body);
    assertAnonymous(incoming.body);

    const seenByViewer = otherParty(outgoing.body.interests[0], fixture.viewer._id);
    const seenByRivka = otherParty(incoming.body.interests[0], fixture.rivka._id);
    assert.equal(String(seenByViewer._id), String(fixture.rivka._id));
    assert.equal(seenByViewer.occupation, RIVKA.occupation);
    assert.equal(seenByViewer.description, RIVKA.description);
    assert.equal(seenByViewer.city, RIVKA.city);
    assert.equal(String(seenByRivka._id), String(fixture.viewer._id));
    assert.equal(seenByRivka.occupation, VIEWER.occupation);
    assert.equal(seenByRivka.description, VIEWER.description);
    assert.equal(seenByRivka.city, VIEWER.city);

    for (const key of Object.keys(seenByViewer)) {
      assert.ok(CANDIDATE_KEYS.has(key), `unexpected interest field ${key}`);
    }

    const profileOfSender = await request(app).get(`/api/profile/${fixture.viewer._id}`).set(rivkaHeaders);
    assert.equal(profileOfSender.status, 200);
    assertAnonymous(profileOfSender.body);
    assert.equal(profileOfSender.body.profile.occupation, VIEWER.occupation);

    const stillCandidates = await request(app).get("/api/match/candidates").set(viewerHeaders);
    assertAnonymous(stillCandidates.body);
    assert.equal(stillCandidates.body.candidates.length, 0);

    assertNoSecrets(outgoing.body, markers);
    assertNoSecrets(incoming.body, markers);
  });

  it("reveals name, contact, photo, and resume only after the interest is accepted", async () => {
    const fixture = await seed();
    const viewerHeaders = auth(tokenFor(fixture.viewer));
    const rivkaHeaders = auth(tokenFor(fixture.rivka));

    await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.rivka._id) });

    const rejectedView = await request(app).get("/api/interest/incoming").set(rivkaHeaders);
    assertAnonymous(rejectedView.body);

    const accepted = await request(app).put("/api/interest/respond").set(rivkaHeaders).send({
      senderId: String(fixture.viewer._id),
      status: "accepted",
    });
    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.interest.status, "accepted");
    assertNoSecrets(accepted.body, alwaysHiddenFor(fixture));

    const outgoing = await request(app).get("/api/interest/outgoing").set(viewerHeaders);
    const incoming = await request(app).get("/api/interest/incoming").set(rivkaHeaders);
    const viewerSees = otherParty(outgoing.body.interests[0], fixture.viewer._id);
    const rivkaSees = otherParty(incoming.body.interests[0], fixture.rivka._id);

    assert.equal(viewerSees.name, RIVKA.name);
    assert.equal(viewerSees.email, RIVKA.email);
    assert.equal(viewerSees.image, getFileUrl("image", RIVKA.image));
    assert.equal(viewerSees.resumePdf, getFileUrl("resumePdf", RIVKA.resumePdf));
    assert.equal(viewerSees.seminar, RIVKA.seminar);
    assert.equal(viewerSees.yeshiva, RIVKA.yeshiva);
    assert.equal(viewerSees.financialRequirement, RIVKA.financialRequirement);
    assert.equal(viewerSees.financialCapabilities, RIVKA.financialCapabilities);
    assert.equal(viewerSees.financialStatus, RIVKA.financialStatus);
    assert.equal(viewerSees.occupation, RIVKA.occupation);

    assert.equal(rivkaSees.name, VIEWER.name);
    assert.equal(rivkaSees.email, VIEWER.email);
    assert.equal(rivkaSees.image, getFileUrl("image", VIEWER.image));
    assert.equal(rivkaSees.resumePdf, getFileUrl("resumePdf", VIEWER.resumePdf));
    assert.equal(rivkaSees.yeshiva, VIEWER.yeshiva);

    assertNoSecrets(outgoing.body, alwaysHiddenFor(fixture));
    assertNoSecrets(incoming.body, alwaysHiddenFor(fixture));

    const profile = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.profile.name, RIVKA.name);
    assert.equal(profile.body.profile.email, RIVKA.email);
    assert.equal(profile.body.profile.image, getFileUrl("image", RIVKA.image));
    assert.equal(profile.body.profile.resumePdf, getFileUrl("resumePdf", RIVKA.resumePdf));
    assert.equal(profile.body.profile.idNumber, undefined);
    assertNoSecrets(profile.body, alwaysHiddenFor(fixture));

    const matches = await request(app).get("/api/match").set(viewerHeaders);
    assert.equal(matches.status, 200);
    assert.equal(matches.body.matches.length, 1);
    assert.equal(matches.body.matches[0].name, RIVKA.name);
    assert.equal(matches.body.matches[0].email, RIVKA.email);
    assert.equal(matches.body.matches[0].image, getFileUrl("image", RIVKA.image));
    assert.equal(matches.body.matches[0].resumePdf, getFileUrl("resumePdf", RIVKA.resumePdf));
    assert.equal(matches.body.matches[0].role, "user");
    assert.ok(matches.body.matches[0].matchedAt);
    assertNoSecrets(matches.body, alwaysHiddenFor(fixture));
  });

  it("does not reveal identity when the interest is rejected", async () => {
    const fixture = await seed();
    const viewerHeaders = auth(tokenFor(fixture.viewer));
    const rivkaHeaders = auth(tokenFor(fixture.rivka));

    await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.rivka._id) });

    const rejected = await request(app).put("/api/interest/respond").set(rivkaHeaders).send({
      senderId: String(fixture.viewer._id),
      status: "rejected",
    });
    assert.equal(rejected.status, 200);
    assertAnonymous(rejected.body);

    const incoming = await request(app).get("/api/interest/incoming").set(rivkaHeaders);
    const outgoing = await request(app).get("/api/interest/outgoing").set(viewerHeaders);
    assertAnonymous(incoming.body);
    assertAnonymous(outgoing.body);
    assert.equal(incoming.body.interests[0].status, "rejected");

    const profile = await request(app).get(`/api/profile/${fixture.viewer._id}`).set(rivkaHeaders);
    assertAnonymous(profile.body);

    const sendAgain = await request(app)
      .post("/api/interest")
      .set(rivkaHeaders)
      .send({ receiverId: String(fixture.viewer._id) });
    assert.equal(sendAgain.status, 409);
  });

  it("treats interest sent by both people, including at the same time, as mutual approval", async () => {
    const fixture = await seed();
    const viewerHeaders = auth(tokenFor(fixture.viewer));
    const rivkaHeaders = auth(tokenFor(fixture.rivka));

    const [first, second] = await Promise.all([
      request(app).post("/api/interest").set(viewerHeaders).send({ receiverId: String(fixture.rivka._id) }),
      request(app).post("/api/interest").set(rivkaHeaders).send({ receiverId: String(fixture.viewer._id) }),
    ]);

    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(second.status, 201, JSON.stringify(second.body));
    assertAnonymous(first.body);
    assertAnonymous(second.body);

    const stored = await Interest.find().lean();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].status, "accepted");

    const outgoing = await request(app).get("/api/interest/outgoing").set(viewerHeaders);
    const incoming = await request(app).get("/api/interest/incoming").set(viewerHeaders);
    const revealed = [...outgoing.body.interests, ...incoming.body.interests];
    assert.ok(revealed.length >= 1);
    const person = otherParty(revealed[0], fixture.viewer._id);
    assert.equal(person.name, RIVKA.name);
    assert.equal(person.image, getFileUrl("image", RIVKA.image));
    assert.equal(person.resumePdf, getFileUrl("resumePdf", RIVKA.resumePdf));
    assertNoSecrets(outgoing.body, alwaysHiddenFor(fixture));
    assertNoSecrets(incoming.body, alwaysHiddenFor(fixture));
  });

  it("collapses repeated simultaneous interests into one accepted match", async () => {
    const fixture = await seed();
    const viewerId = String(fixture.viewer._id);
    const rivkaId = String(fixture.rivka._id);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      await Interest.deleteMany({});
      const results = await Promise.all([
        sendInterest(viewerId, rivkaId),
        sendInterest(rivkaId, viewerId),
      ]);
      const stored = await Interest.find().lean();
      assert.equal(stored.length, 1, `attempt ${attempt} stored ${stored.length} interests`);
      assert.equal(stored[0].status, "accepted", `attempt ${attempt} status ${stored[0].status}`);
      assert.ok(
        results.every((interest) => interest.status === "pending" || interest.status === "accepted"),
        `attempt ${attempt} returned ${results.map((interest) => interest.status).join(",")}`
      );
    }

    await Interest.deleteMany({});
    const burst = await Promise.all(
      Array.from({ length: 8 }, (_, index) => {
        const [sender, receiver] = index % 2 === 0 ? [viewerId, rivkaId] : [rivkaId, viewerId];
        return sendInterest(sender, receiver).then(
          (interest) => ({ ok: true, status: interest.status }),
          (error) => ({ ok: false, statusCode: error.statusCode, message: error.message })
        );
      })
    );

    for (const result of burst) {
      if (result.ok) {
        assert.ok(result.status === "accepted" || result.status === "pending", result.status);
      } else {
        assert.equal(result.statusCode, 409, result.message);
      }
    }
    const stored = await Interest.find().lean();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].status, "accepted");
  });

  it("still returns the caller's own files and the admin's full record", async () => {
    const fixture = await seed();

    const mine = await request(app).get("/api/profile/me").set(auth(tokenFor(fixture.viewer)));
    assert.equal(mine.status, 200);
    assert.equal(mine.body.profile.yeshiva, VIEWER.yeshiva);
    assert.equal(mine.body.profile.image, getFileUrl("image", VIEWER.image));
    assert.equal(mine.body.profile.resumePdf, getFileUrl("resumePdf", VIEWER.resumePdf));

    const users = await request(app).get("/api/admin/users").set(auth(tokenFor(fixture.admin)));
    assert.equal(users.status, 200);
    const serializedUsers = JSON.stringify(users.body);
    assert.equal(serializedUsers.includes(RIVKA.name), true);
    assert.equal(serializedUsers.includes(RIVKA.idNumber), true);
    assert.equal(serializedUsers.includes(PASSWORD), false);

    const adminProfile = await request(app)
      .get(`/api/admin/users/${fixture.rivka._id}/profile`)
      .set(auth(tokenFor(fixture.admin)));
    assert.equal(adminProfile.status, 200);
    assert.equal(adminProfile.body.user.name, RIVKA.name);
    assert.equal(adminProfile.body.user.email, RIVKA.email);
    assert.equal(adminProfile.body.user.idNumber, RIVKA.idNumber);
    assert.equal(adminProfile.body.profile.seminar, RIVKA.seminar);
    assert.equal(adminProfile.body.profile.image, getFileUrl("image", RIVKA.image));
    assert.equal(adminProfile.body.profile.resumePdf, getFileUrl("resumePdf", RIVKA.resumePdf));
    assert.equal(adminProfile.body.user.password, undefined);
  });
});
