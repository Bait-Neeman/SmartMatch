process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");

const app = require("../app");
const {
  fileAccessPath,
  createShortLivedReadUrl,
  setStoredFileReader,
  READ_URL_TTL_SECONDS,
} = require("../src/services/storage.service");
const { generateToken } = require("../src/config/jwt");
const { sendInterest, respondInterest } = require("../src/services/interest.service");
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
  // דרישה כספית (financialDemand): a minimum. The other side may participate with more.
  financialRequirement: "viewer-demand-100",
  // יכולת כספית — the stored figure closest to השתתפות כספית (financialContribution).
  financialCapabilities: "viewer-participation-80",
  financialStatus: 4,
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
  financialRequirement: "rivka-demand-90",
  financialCapabilities: "rivka-participation-150",
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
  RIVKA.name,
  RIVKA.email,
  RIVKA.idNumber,
  RIVKA.image,
  RIVKA.resumePdf,
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
  "workplace",
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
  "working",
  "workingInProfession",
  "description",
  "yeshiva",
  "seminar",
  "financialRequirement",
  "financialCapabilities",
  "financialStatus",
  "financialDemand",
  "financialParticipation",
  "lookingFor",
  "maritalStatus",
  "matchPercent",
]);

// Institution plus both stored money figures. financialRequirement is דרישה כספית
// (financialDemand). financialCapabilities is יכולת כספית, not a separate
// השתתפות כספית (financialContribution) field.
const imagePath = (user) => `/api/files/${user._id}/image`;
const resumePath = (user) => `/api/files/${user._id}/resume`;
const FILE_HIDDEN = { message: "הקובץ לא נמצא" };
const PROFILE_HIDDEN = { message: "הפרופיל לא נמצא" };

const assertStableFilePath = (url, user, kind) => {
  assert.equal(url, `/api/files/${user._id}/${kind}`);
  assert.equal(url.includes("cloudinary"), false, url);
  assert.equal(url.includes("expires"), false, url);
  assert.equal(url.includes("leak-"), false, url);
};

const filePayload = (response) =>
  Buffer.isBuffer(response.body) ? response.body.toString() : String(response.text || "");

const assertFileOpen = async (user, kind, token, publicId) => {
  const field = kind === "image" ? "image" : "resumePdf";
  const response = await request(app).get(`/api/files/${user._id}/${kind}`).set(auth(token));
  assert.equal(response.status, 200, filePayload(response));
  assert.equal(response.headers["cache-control"], "private, no-store");
  assert.equal(response.headers.location, undefined);
  const payload = filePayload(response);
  assert.equal(payload.includes("cloudinary"), false, payload);
  assert.equal(payload, `${field}:${publicId}`);
  return response;
};

const assertFileClosed = async (user, kind, token) => {
  const call = request(app).get(`/api/files/${user._id}/${kind}`);
  const response = token ? await call.set(auth(token)) : await call;
  if (!token) {
    assert.equal(response.status, 401);
    return response;
  }
  assert.equal(response.status, 404);
  assert.deepEqual(response.body, FILE_HIDDEN);
  return response;
};

const assertMoneyAndInstitution = (person, source) => {
  assert.equal(person.yeshiva, source.yeshiva);
  assert.equal(person.seminar, source.seminar);
  assert.equal(person.financialRequirement, source.financialRequirement);
  assert.equal(person.financialCapabilities, source.financialCapabilities);
  assert.equal(person.financialStatus, source.financialStatus);
};

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
    setStoredFileReader(async (kind, publicId) => ({
      body: Buffer.from(`${kind}:${publicId}`),
      contentType: kind === "image" ? "image/jpeg" : "application/pdf",
      filename: kind === "image" ? "photo.jpg" : "resume.pdf",
    }));

    const now = Math.floor(Date.now() / 1000);
    for (const signed of [
      createShortLivedReadUrl("image", RIVKA.image),
      createShortLivedReadUrl("resumePdf", RIVKA.resumePdf),
    ]) {
      const params = new URL(signed.url).searchParams;
      const expiresAt = Number(params.get("expires_at"));
      assert.equal(Number.isFinite(expiresAt), true, signed.url);
      const ttl = expiresAt - now;
      assert.ok(ttl > 0 && ttl <= READ_URL_TTL_SECONDS, `read url ttl ${ttl}: ${signed.url}`);
      assert.equal(signed.url.includes("res.cloudinary.com"), false, signed.url);
    }
    assert.equal(fileAccessPath("user-id", "image", RIVKA.image), "/api/files/user-id/image");
    assert.equal(fileAccessPath("user-id", "image", ""), null);

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
        financialCapabilities: VIEWER.financialCapabilities,
        financialStatus: VIEWER.financialStatus,
        maritalStatus: "single",
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
        maritalStatus: "divorced",
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
    assert.equal(card.maritalStatus, "divorced");
    assert.equal(card.name, undefined);
    assertMoneyAndInstitution(card, RIVKA);
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
    assert.equal(profile.body.profile.maritalStatus, "divorced");
    assert.equal(profile.body.profile.name, undefined);
    assertMoneyAndInstitution(profile.body.profile, RIVKA);

    const suggestions = await request(app).get("/api/suggestions").set(headers);
    assert.equal(suggestions.status, 200);
    assertAnonymous(suggestions.body);
    assert.equal(suggestions.body.newSuggestions[0].maritalStatus, "divorced");
    assert.equal(suggestions.body.newSuggestions[0].name, undefined);

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
    assert.equal(seenByViewer.maritalStatus, "divorced");
    assert.equal(seenByViewer.name, undefined);
    assertMoneyAndInstitution(seenByViewer, RIVKA);
    assert.equal(String(seenByRivka._id), String(fixture.viewer._id));
    assert.equal(seenByRivka.occupation, VIEWER.occupation);
    assert.equal(seenByRivka.description, VIEWER.description);
    assert.equal(seenByRivka.city, VIEWER.city);
    assert.equal(seenByRivka.maritalStatus, "single");
    assertMoneyAndInstitution(seenByRivka, VIEWER);

    for (const key of Object.keys(seenByViewer)) {
      assert.ok(CANDIDATE_KEYS.has(key), `unexpected interest field ${key}`);
    }

    const profileOfSender = await request(app).get(`/api/profile/${fixture.viewer._id}`).set(rivkaHeaders);
    assert.equal(profileOfSender.status, 200);
    assertAnonymous(profileOfSender.body);
    assert.equal(profileOfSender.body.profile.occupation, VIEWER.occupation);
    assertMoneyAndInstitution(profileOfSender.body.profile, VIEWER);

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
    assert.equal(viewerSees.image, imagePath(fixture.rivka));
    assert.equal(viewerSees.resumePdf, resumePath(fixture.rivka));
    assertStableFilePath(viewerSees.image, fixture.rivka, "image");
    assertStableFilePath(viewerSees.resumePdf, fixture.rivka, "resume");
    assert.equal(viewerSees.seminar, RIVKA.seminar);
    assert.equal(viewerSees.yeshiva, RIVKA.yeshiva);
    assert.equal(viewerSees.financialRequirement, RIVKA.financialRequirement);
    assert.equal(viewerSees.financialCapabilities, RIVKA.financialCapabilities);
    assert.equal(viewerSees.financialStatus, RIVKA.financialStatus);
    assert.equal(viewerSees.occupation, RIVKA.occupation);

    assert.equal(rivkaSees.name, VIEWER.name);
    assert.equal(rivkaSees.email, VIEWER.email);
    assert.equal(rivkaSees.image, imagePath(fixture.viewer));
    assert.equal(rivkaSees.resumePdf, resumePath(fixture.viewer));
    assert.equal(rivkaSees.yeshiva, VIEWER.yeshiva);

    assertNoSecrets(outgoing.body, alwaysHiddenFor(fixture));
    assertNoSecrets(incoming.body, alwaysHiddenFor(fixture));

    const profile = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(profile.status, 200);
    assert.equal(profile.body.profile.name, RIVKA.name);
    assert.equal(profile.body.profile.email, RIVKA.email);
    assert.equal(profile.body.profile.image, imagePath(fixture.rivka));
    assert.equal(profile.body.profile.resumePdf, resumePath(fixture.rivka));
    assert.equal(profile.body.profile.idNumber, undefined);
    assertNoSecrets(profile.body, alwaysHiddenFor(fixture));
    await assertFileOpen(fixture.rivka, "image", tokenFor(fixture.viewer), RIVKA.image);
    await assertFileOpen(fixture.rivka, "resume", tokenFor(fixture.viewer), RIVKA.resumePdf);
    await assertFileOpen(fixture.viewer, "image", tokenFor(fixture.rivka), VIEWER.image);
    await assertFileOpen(fixture.viewer, "resume", tokenFor(fixture.rivka), VIEWER.resumePdf);

    const matches = await request(app).get("/api/match").set(viewerHeaders);
    assert.equal(matches.status, 200);
    assert.equal(matches.body.matches.length, 1);
    assert.equal(matches.body.matches[0].name, RIVKA.name);
    assert.equal(matches.body.matches[0].email, RIVKA.email);
    assert.equal(matches.body.matches[0].image, imagePath(fixture.rivka));
    assert.equal(matches.body.matches[0].resumePdf, resumePath(fixture.rivka));
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
    assert.equal(profile.status, 404);
    assert.deepEqual(profile.body, PROFILE_HIDDEN);
    const reverse = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(reverse.status, 404);
    assert.deepEqual(reverse.body, PROFILE_HIDDEN);
    await assertFileClosed(fixture.viewer, "image", tokenFor(fixture.rivka));
    await assertFileClosed(fixture.rivka, "resume", tokenFor(fixture.viewer));

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
    assert.equal(person.image, imagePath(fixture.rivka));
    assert.equal(person.resumePdf, resumePath(fixture.rivka));
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
    assert.equal(mine.body.profile.image, imagePath(fixture.viewer));
    assert.equal(mine.body.profile.resumePdf, resumePath(fixture.viewer));
    assertStableFilePath(mine.body.profile.image, fixture.viewer, "image");
    assertStableFilePath(mine.body.profile.resumePdf, fixture.viewer, "resume");

    const users = await request(app).get("/api/admin/users").set(auth(tokenFor(fixture.admin)));
    assert.equal(users.status, 200);
    const serializedUsers = JSON.stringify(users.body);
    assert.equal(serializedUsers.includes(RIVKA.name), true);
    assert.equal(serializedUsers.includes(RIVKA.idNumber), false);
    assert.equal(serializedUsers.includes(PASSWORD), false);

    const adminProfile = await request(app)
      .get(`/api/admin/users/${fixture.rivka._id}/profile`)
      .set(auth(tokenFor(fixture.admin)));
    assert.equal(adminProfile.status, 200);
    assert.equal(adminProfile.body.user.name, RIVKA.name);
    assert.equal(adminProfile.body.user.email, RIVKA.email);
    assert.equal(adminProfile.body.user.idNumber, undefined);
    assert.equal(adminProfile.body.profile.seminar, RIVKA.seminar);
    assert.equal(adminProfile.body.profile.image, imagePath(fixture.rivka));
    assert.equal(adminProfile.body.profile.resumePdf, resumePath(fixture.rivka));
    assert.equal(adminProfile.body.user.password, undefined);
    assertStableFilePath(adminProfile.body.profile.image, fixture.rivka, "image");
    assertStableFilePath(adminProfile.body.profile.resumePdf, fixture.rivka, "resume");
  });

  it("refuses to reopen a rejected interest, and a later decline closes an accepted one", async () => {
    const fixture = await seed();
    const viewerId = String(fixture.viewer._id);
    const rivkaId = String(fixture.rivka._id);
    const rivkaHeaders = auth(tokenFor(fixture.rivka));

    await sendInterest(viewerId, rivkaId);
    const rejected = await request(app)
      .put("/api/interest/respond")
      .set(rivkaHeaders)
      .send({ senderId: viewerId, status: "rejected" });
    assert.equal(rejected.status, 200);

    const reopen = await request(app)
      .put("/api/interest/respond")
      .set(rivkaHeaders)
      .send({ senderId: viewerId, status: "accepted" });
    assert.equal(reopen.status, 409);
    const afterReject = await Interest.find().lean();
    assert.equal(afterReject.length, 1);
    assert.equal(afterReject[0].status, "rejected");

    const incoming = await request(app).get("/api/interest/incoming").set(rivkaHeaders);
    assertAnonymous(incoming.body);
    assert.equal(incoming.body.interests[0].status, "rejected");

    await Interest.deleteMany({});
    await sendInterest(viewerId, rivkaId);
    const accepted = await request(app)
      .put("/api/interest/respond")
      .set(rivkaHeaders)
      .send({ senderId: viewerId, status: "accepted" });
    assert.equal(accepted.status, 200);

    const takeBack = await request(app)
      .put("/api/interest/respond")
      .set(rivkaHeaders)
      .send({ senderId: viewerId, status: "rejected" });
    assert.equal(takeBack.status, 200);
    const afterAccept = await Interest.findOne().lean();
    assert.equal(afterAccept.status, "rejected");
    const closed = await request(app).get(`/api/profile/${viewerId}`).set(rivkaHeaders);
    assert.equal(closed.status, 404);
    assert.deepEqual(closed.body, PROFILE_HIDDEN);
    await assertFileClosed(fixture.viewer, "image", tokenFor(fixture.rivka));
    await assertFileClosed(fixture.rivka, "resume", tokenFor(fixture.viewer));
    const reopenAccepted = await request(app)
      .put("/api/interest/respond")
      .set(rivkaHeaders)
      .send({ senderId: viewerId, status: "accepted" });
    assert.equal(reopenAccepted.status, 409);
    assert.equal((await Interest.findOne().lean()).status, "rejected");
  });

  it("does not let a mutual send overwrite a rejection", async () => {
    const fixture = await seed();
    const viewerId = String(fixture.viewer._id);
    const rivkaId = String(fixture.rivka._id);

    await sendInterest(viewerId, rivkaId);
    await respondInterest(rivkaId, viewerId, "rejected");

    const again = await sendInterest(rivkaId, viewerId).then(
      (interest) => interest,
      (error) => error
    );
    assert.equal(again.statusCode, 409);
    const stored = await Interest.find().lean();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].status, "rejected");

    await Interest.deleteMany({});
    await sendInterest(viewerId, rivkaId);
    const raced = await Promise.all([
      respondInterest(rivkaId, viewerId, "rejected").then(
        (interest) => ({ ok: true, status: interest.status }),
        (error) => ({ ok: false, statusCode: error.statusCode })
      ),
      sendInterest(rivkaId, viewerId).then(
        (interest) => ({ ok: true, status: interest.status }),
        (error) => ({ ok: false, statusCode: error.statusCode })
      ),
    ]);

    const rows = await Interest.find().lean();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "rejected");
    const rejection = raced[0];
    assert.equal(rejection.ok, true);
    assert.equal(rejection.status, "rejected");

    const incoming = await request(app)
      .get("/api/interest/incoming")
      .set(auth(tokenFor(fixture.rivka)));
    assertAnonymous(incoming.body);
    const followUp = await sendInterest(rivkaId, viewerId).then(
      (interest) => interest,
      (error) => error
    );
    assert.equal(followUp.statusCode, 409);
    const finalRow = await Interest.findOne().lean();
    assert.equal(finalRow.status, "rejected");
  });

  it("limits profile reads to the owner, an admin, or a real proposal", async () => {
    const fixture = await seed();
    const viewerHeaders = auth(tokenFor(fixture.viewer));
    const rivkaHeaders = auth(tokenFor(fixture.rivka));
    const excludedHeaders = auth(tokenFor(fixture.excluded));
    const hidden = { message: "הפרופיל לא נמצא" };

    const anonymous = await request(app).get(`/api/profile/${fixture.rivka._id}`);
    assert.equal(anonymous.status, 401);

    const unknownId = new mongoose.Types.ObjectId();
    const missing = await request(app).get(`/api/profile/${unknownId}`).set(viewerHeaders);
    const notOffered = await request(app).get(`/api/profile/${fixture.excluded._id}`).set(viewerHeaders);
    const reverseNotOffered = await request(app)
      .get(`/api/profile/${fixture.viewer._id}`)
      .set(excludedHeaders);
    const preferenceBlocked = await request(app)
      .get(`/api/profile/${fixture.preferenceExcluded._id}`)
      .set(viewerHeaders);
    assert.equal(missing.status, 404);
    assert.equal(notOffered.status, 404);
    assert.equal(reverseNotOffered.status, 404);
    assert.equal(preferenceBlocked.status, 404);
    assert.deepEqual(missing.body, hidden);
    assert.deepEqual(notOffered.body, hidden);
    assert.deepEqual(reverseNotOffered.body, hidden);
    assert.deepEqual(preferenceBlocked.body, hidden);
    assertNoSecrets(notOffered.body, secretMarkersFor(fixture));

    const offered = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(offered.status, 200);
    assertAnonymous(offered.body);
    assertMoneyAndInstitution(offered.body.profile, RIVKA);
    assert.equal(offered.body.profile.name, undefined);

    const asOwner = await request(app).get(`/api/profile/${fixture.viewer._id}`).set(viewerHeaders);
    assert.equal(asOwner.status, 200);
    assert.equal(asOwner.body.profile.yeshiva, VIEWER.yeshiva);
    assert.equal(asOwner.body.profile.image, imagePath(fixture.viewer));

    const asAdmin = await request(app)
      .get(`/api/profile/${fixture.rivka._id}`)
      .set(auth(tokenFor(fixture.admin)));
    assert.equal(asAdmin.status, 200);
    assert.equal(asAdmin.body.profile.seminar, RIVKA.seminar);
    assert.equal(asAdmin.body.profile.image, imagePath(fixture.rivka));
    assert.equal(asAdmin.body.profile.resumePdf, resumePath(fixture.rivka));

    const toAdmin = await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.admin._id) });
    assert.equal(toAdmin.status, 404);
    const adminAsProfile = await request(app).get(`/api/profile/${fixture.admin._id}`).set(viewerHeaders);
    assert.equal(adminAsProfile.status, 404);
    assert.deepEqual(adminAsProfile.body, hidden);
    const candidates = await request(app).get("/api/match/candidates").set(viewerHeaders);
    assert.equal(
      candidates.body.candidates.some((card) => String(card._id) === String(fixture.admin._id)),
      false
    );

    await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.rivka._id) });

    const whilePending = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(whilePending.status, 200);
    assertAnonymous(whilePending.body);
    assertMoneyAndInstitution(whilePending.body.profile, RIVKA);
    const receiverSeesSender = await request(app)
      .get(`/api/profile/${fixture.viewer._id}`)
      .set(rivkaHeaders);
    assert.equal(receiverSeesSender.status, 200);
    assertAnonymous(receiverSeesSender.body);
    await assertFileClosed(fixture.rivka, "image", tokenFor(fixture.viewer));
    await assertFileClosed(fixture.viewer, "resume", tokenFor(fixture.rivka));

    await request(app).put("/api/interest/respond").set(rivkaHeaders).send({
      senderId: String(fixture.viewer._id),
      status: "accepted",
    });

    const revealed = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(revealed.status, 200);
    assert.equal(revealed.body.profile.name, RIVKA.name);
    assert.equal(revealed.body.profile.email, RIVKA.email);
    assert.equal(revealed.body.profile.image, imagePath(fixture.rivka));
    assert.equal(revealed.body.profile.resumePdf, resumePath(fixture.rivka));
    assertStableFilePath(revealed.body.profile.image, fixture.rivka, "image");
    assertStableFilePath(revealed.body.profile.resumePdf, fixture.rivka, "resume");
    assert.equal(revealed.body.profile.idNumber, undefined);
    assertNoSecrets(revealed.body, alwaysHiddenFor(fixture));
    await assertFileOpen(fixture.rivka, "image", tokenFor(fixture.viewer), RIVKA.image);
    await assertFileOpen(fixture.rivka, "resume", tokenFor(fixture.viewer), RIVKA.resumePdf);
  });

  it("stops serving identity and files after either side declines", async () => {
    const fixture = await seed();
    const viewerToken = tokenFor(fixture.viewer);
    const rivkaToken = tokenFor(fixture.rivka);
    const viewerHeaders = auth(viewerToken);
    const rivkaHeaders = auth(rivkaToken);

    await assertFileClosed(fixture.rivka, "image", null);
    await assertFileClosed(fixture.rivka, "resume", null);
    await assertFileClosed(fixture.rivka, "image", tokenFor(fixture.excluded));
    await assertFileClosed(fixture.viewer, "resume", tokenFor(fixture.preferenceExcluded));
    const unknown = await request(app)
      .get(`/api/files/${new mongoose.Types.ObjectId()}/image`)
      .set(viewerHeaders);
    assert.equal(unknown.status, 404);
    assert.deepEqual(unknown.body, FILE_HIDDEN);
    const missingKind = await request(app)
      .get(`/api/files/${fixture.rivka._id}/passport`)
      .set(viewerHeaders);
    assert.equal(missingKind.status, 404);
    assert.deepEqual(missingKind.body, FILE_HIDDEN);

    const declineBy = async (actor) => {
      const actorToken = tokenFor(actor);
      const actorHeaders = auth(actorToken);
      const other = actor === fixture.viewer ? fixture.rivka : fixture.viewer;
      const ownFile = actor === fixture.viewer ? VIEWER : RIVKA;
      await Interest.deleteMany({});
      await request(app)
        .post("/api/interest")
        .set(viewerHeaders)
        .send({ receiverId: String(fixture.rivka._id) });
      const accepted = await request(app).put("/api/interest/respond").set(rivkaHeaders).send({
        senderId: String(fixture.viewer._id),
        status: "accepted",
      });
      assert.equal(accepted.status, 200);

      await assertFileOpen(fixture.rivka, "image", viewerToken, RIVKA.image);
      await assertFileOpen(fixture.rivka, "resume", viewerToken, RIVKA.resumePdf);
      await assertFileOpen(fixture.viewer, "image", rivkaToken, VIEWER.image);
      await assertFileOpen(fixture.viewer, "resume", rivkaToken, VIEWER.resumePdf);

      const declined = await request(app).put("/api/interest/respond").set(actorHeaders).send({
        senderId: String(other._id),
        status: "rejected",
      });
      assert.equal(declined.status, 200);
      assert.equal((await Interest.findOne().lean()).status, "rejected");

      const viewerProfile = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
      const rivkaProfile = await request(app).get(`/api/profile/${fixture.viewer._id}`).set(rivkaHeaders);
      assert.equal(viewerProfile.status, 404);
      assert.equal(rivkaProfile.status, 404);
      assert.deepEqual(viewerProfile.body, PROFILE_HIDDEN);
      assert.deepEqual(rivkaProfile.body, PROFILE_HIDDEN);
      assertNoSecrets(viewerProfile.body, secretMarkersFor(fixture));

      await assertFileClosed(fixture.rivka, "image", viewerToken);
      await assertFileClosed(fixture.rivka, "resume", viewerToken);
      await assertFileClosed(fixture.viewer, "image", rivkaToken);
      await assertFileClosed(fixture.viewer, "resume", rivkaToken);
      await assertFileOpen(actor, "image", actorToken, ownFile.image);
      await assertFileOpen(actor, "resume", actorToken, ownFile.resumePdf);
      await assertFileOpen(fixture.rivka, "image", tokenFor(fixture.admin), RIVKA.image);
      await assertFileOpen(fixture.viewer, "resume", tokenFor(fixture.admin), VIEWER.resumePdf);

      const matches = await request(app).get("/api/match").set(viewerHeaders);
      assert.equal(matches.body.matches.length, 0);
      const incoming = await request(app).get("/api/interest/incoming").set(rivkaHeaders);
      assertAnonymous(incoming.body);

      const again = await request(app).put("/api/interest/respond").set(actorHeaders).send({
        senderId: String(other._id),
        status: "accepted",
      });
      assert.equal(again.status, 409);
      assert.equal((await Interest.findOne().lean()).status, "rejected");
    };

    await declineBy(fixture.rivka);
    await declineBy(fixture.viewer);
  });

  it("rejects interest unless the person is a current candidate or already wrote first", async () => {
    const fixture = await seed();
    const headers = auth(tokenFor(fixture.viewer));
    const hiddenUser = { message: "המשתמש לא נמצא" };

    const peer = await User.create({
      name: "LEAK-NAME-PEER",
      email: "leak-peer@private.test",
      idNumber: "100000005",
      password: PASSWORD,
      role: "user",
    });
    await Profile.create({ user: peer._id, gender: "male", age: 26 });

    const unknown = await request(app)
      .post("/api/interest")
      .set(headers)
      .send({ receiverId: String(new mongoose.Types.ObjectId()) });
    const toExcluded = await request(app)
      .post("/api/interest")
      .set(headers)
      .send({ receiverId: String(fixture.excluded._id) });
    const toPreference = await request(app)
      .post("/api/interest")
      .set(headers)
      .send({ receiverId: String(fixture.preferenceExcluded._id) });
    const toPeer = await request(app)
      .post("/api/interest")
      .set(headers)
      .send({ receiverId: String(peer._id) });

    assert.equal(unknown.status, 404);
    assert.equal(toExcluded.status, 404);
    assert.equal(toPreference.status, 404);
    assert.equal(toPeer.status, 404);
    assert.deepEqual(unknown.body, hiddenUser);
    assert.deepEqual(toExcluded.body, hiddenUser);
    assert.deepEqual(toPreference.body, hiddenUser);
    assert.deepEqual(toPeer.body, hiddenUser);
    assert.equal(await Interest.countDocuments(), 0);

    const excludedProfile = await request(app).get(`/api/profile/${fixture.excluded._id}`).set(headers);
    const peerProfile = await request(app).get(`/api/profile/${peer._id}`).set(headers);
    assert.equal(excludedProfile.status, 404);
    assert.equal(peerProfile.status, 404);
    assert.deepEqual(excludedProfile.body, PROFILE_HIDDEN);
    assert.deepEqual(peerProfile.body, PROFILE_HIDDEN);
    assertNoSecrets(excludedProfile.body, secretMarkersFor(fixture));
    assert.equal(JSON.stringify(peerProfile.body).includes("LEAK-NAME-PEER"), false);

    const sent = await request(app)
      .post("/api/interest")
      .set(headers)
      .send({ receiverId: String(fixture.rivka._id) });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.interest.status, "pending");

    const reply = await request(app)
      .post("/api/interest")
      .set(auth(tokenFor(fixture.rivka)))
      .send({ receiverId: String(fixture.viewer._id) });
    assert.equal(reply.status, 201);
    assert.equal(reply.body.interest.status, "accepted");
    const stored = await Interest.find().lean();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].status, "accepted");
  });

  it("hides a workplace until mutual approval and still shows the work answers", async () => {
    const fixture = await seed();
    await Profile.updateOne(
      { user: fixture.rivka._id },
      { $set: { workplace: "LEAK-EMPLOYER", working: true, workingInProfession: true, occupation: "הוראה" } }
    );
    const viewerHeaders = auth(tokenFor(fixture.viewer));
    const rivkaHeaders = auth(tokenFor(fixture.rivka));

    const candidates = await request(app).get("/api/match/candidates").set(viewerHeaders);
    assert.equal(candidates.status, 200);
    const card = candidates.body.candidates.find((item) => String(item._id) === String(fixture.rivka._id));
    assert.ok(card);
    assert.equal(card.workplace, undefined);
    assert.equal(JSON.stringify(candidates.body).includes("LEAK-EMPLOYER"), false);
    assert.equal(card.working, true);
    assert.equal(card.workingInProfession, true);
    assert.equal(card.occupation, "הוראה");
    assertAnonymous(candidates.body);

    const hiddenProfile = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(hiddenProfile.status, 200);
    assert.equal(hiddenProfile.body.profile.workplace, undefined);
    assert.equal(hiddenProfile.body.profile.working, true);
    assert.equal(hiddenProfile.body.profile.occupation, "הוראה");
    assert.equal(JSON.stringify(hiddenProfile.body).includes("LEAK-EMPLOYER"), false);

    const own = await request(app).get("/api/profile/me").set(rivkaHeaders);
    assert.equal(own.status, 200);
    assert.equal(own.body.profile.workplace, "LEAK-EMPLOYER");

    const admin = await request(app)
      .get(`/api/admin/users/${fixture.rivka._id}/profile`)
      .set(auth(tokenFor(fixture.admin)));
    assert.equal(admin.status, 200, JSON.stringify(admin.body));
    assert.equal(admin.body.profile.workplace, "LEAK-EMPLOYER");

    const sent = await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.rivka._id) });
    assert.equal(sent.status, 201);
    assert.equal(JSON.stringify(sent.body).includes("LEAK-EMPLOYER"), false);

    const accepted = await request(app).put("/api/interest/respond").set(rivkaHeaders).send({
      senderId: String(fixture.viewer._id),
      status: "accepted",
    });
    assert.equal(accepted.status, 200);

    const revealed = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(revealed.status, 200);
    assert.equal(revealed.body.profile.workplace, "LEAK-EMPLOYER");
    const matches = await request(app).get("/api/match").set(viewerHeaders);
    assert.equal(matches.body.matches[0].workplace, "LEAK-EMPLOYER");
  });

  it("never shows a phone number to another user, even after approval and matchmaker", async () => {
    const fixture = await seed();
    const viewerPhone = "0501111111";
    const rivkaPhone = "0522222222";
    await User.updateOne({ _id: fixture.viewer._id }, { phone: viewerPhone });
    await User.updateOne({ _id: fixture.rivka._id }, { phone: rivkaPhone });
    const viewerHeaders = auth(tokenFor(fixture.viewer));
    const rivkaHeaders = auth(tokenFor(fixture.rivka));

    const absent = (body, label) => {
      const text = JSON.stringify(body);
      assert.equal(text.includes(viewerPhone), false, `${label} leaked the viewer's phone`);
      assert.equal(text.includes(rivkaPhone), false, `${label} leaked the other phone`);
      const keys = collectKeys(body);
      for (const key of ["phone", "mobile", "telephone"]) {
        assert.equal(keys.has(key), false, `${label} included ${key}`);
      }
    };

    const candidates = await request(app).get("/api/match/candidates").set(viewerHeaders);
    assert.equal(candidates.status, 200);
    absent(candidates.body, "candidates");

    const sent = await request(app)
      .post("/api/interest")
      .set(viewerHeaders)
      .send({ receiverId: String(fixture.rivka._id) });
    assert.equal(sent.status, 201);
    absent(sent.body, "interest");

    const accepted = await request(app).put("/api/interest/respond").set(rivkaHeaders).send({
      senderId: String(fixture.viewer._id),
      status: "accepted",
    });
    assert.equal(accepted.status, 200);
    absent(accepted.body, "approval");

    const revealed = await request(app).get(`/api/profile/${fixture.rivka._id}`).set(viewerHeaders);
    assert.equal(revealed.status, 200);
    assert.equal(revealed.body.profile.name, RIVKA.name);
    assert.equal(revealed.body.profile.email, RIVKA.email);
    absent(revealed.body, "approved profile");

    const outgoing = await request(app).get("/api/interest/outgoing").set(viewerHeaders);
    const incoming = await request(app).get("/api/interest/incoming").set(rivkaHeaders);
    absent(outgoing.body, "outgoing");
    absent(incoming.body, "incoming");

    const active = await request(app).get("/api/suggestions").set(viewerHeaders);
    assert.equal(active.body.active.length, 1);
    absent(active.body, "active suggestions");

    const matches = await request(app).get("/api/match").set(viewerHeaders);
    assert.equal(matches.body.matches.length, 1);
    assert.equal(matches.body.matches[0].name, RIVKA.name);
    absent(matches.body, "matches");

    const byPhone = await request(app).get("/api/search").query({ q: rivkaPhone }).set(viewerHeaders);
    assert.equal(byPhone.status, 200);
    assert.deepEqual(byPhone.body.results, []);
    absent(byPhone.body, "search");

    const forwardViewer = await request(app)
      .post("/api/interest/send-to-manager")
      .set(viewerHeaders)
      .send({ otherUserId: String(fixture.rivka._id) });
    assert.equal(forwardViewer.status, 200);
    absent(forwardViewer.body, "viewer forward");
    const forwardRivka = await request(app)
      .post("/api/interest/send-to-manager")
      .set(rivkaHeaders)
      .send({ otherUserId: String(fixture.viewer._id) });
    assert.equal(forwardRivka.status, 200);
    absent(forwardRivka.body, "other forward");

    const matchmaker = await request(app).get("/api/suggestions").set(viewerHeaders);
    assert.equal(matchmaker.body.matchmaker.length, 1);
    assert.equal(matchmaker.body.matchmaker[0].stage, "matchmaker");
    assert.equal(matchmaker.body.matchmaker[0].name, RIVKA.name);
    absent(matchmaker.body, "matchmaker");

    const own = await request(app).get("/api/profile/me").set(rivkaHeaders);
    assert.equal(own.status, 200);
    assert.equal(own.body.profile.phone, rivkaPhone);

    const admin = await request(app)
      .get(`/api/admin/users/${fixture.rivka._id}/profile`)
      .set(auth(tokenFor(fixture.admin)));
    assert.equal(admin.status, 200, JSON.stringify(admin.body));
    assert.equal(admin.body.user.phone, rivkaPhone);
    assert.equal(admin.body.profile.phone, rivkaPhone);
  });
});
