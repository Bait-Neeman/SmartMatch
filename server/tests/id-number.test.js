process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

const User = require("../src/models/user.model");
const { removeStoredIdNumbers, reportStoredIdNumbers } = require("../scripts/fix-idnumber-index");

const idNumberIndexes = async () => {
  const indexes = await User.collection.indexes();
  return indexes.filter((index) => index.key && Object.keys(index.key).length === 1 && index.key.idNumber === 1);
};

describe("stored ID numbers", () => {
  let mongo;

  before(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await User.init();
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  it("reports idNumber and idNumber_1 without changing them", async () => {
    await User.collection.insertMany([
      { name: "דוח", email: "dry@example.test", password: "hashed", idNumber: "200000001" },
    ]);
    await User.collection.createIndex({ idNumber: 1 }, { unique: true, name: "idNumber_1" });

    const report = await reportStoredIdNumbers(mongoose.connection.db);
    assert.equal(report.withIdNumber, 1);
    assert.equal(report.idNumberIndex, true);

    const result = spawnSync(process.execPath, ["scripts/fix-idnumber-index.js", "--dry-run"], {
      cwd: path.join(__dirname, ".."),
      env: { PATH: process.env.PATH, HOME: process.env.HOME || "", MONGO_URI: mongo.getUri() },
      encoding: "utf8",
      timeout: 20000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Users with idNumber: 1/);
    assert.match(result.stdout, /idNumber_1 exists: yes/);
    assert.equal(/Unset idNumber/.test(result.stdout), false);

    const still = await User.collection.findOne({ email: "dry@example.test" });
    assert.equal(still.idNumber, "200000001");
    assert.equal((await idNumberIndexes()).some((index) => index.name === "idNumber_1"), true);

    await User.collection.deleteMany({ email: "dry@example.test" });
    await User.collection.dropIndex("idNumber_1");
  });

  it("drops every idNumber index, unsets the field, and can run again", async () => {
    await User.collection.insertMany([
      { name: "אחת", email: "one@example.test", password: "hashed", idNumber: "100000001" },
      { name: "שתיים", email: "two@example.test", password: "hashed", idNumber: "100000002" },
    ]);
    await User.collection.createIndex({ idNumber: 1 }, { unique: true, name: "idNumber_1" });

    const first = await removeStoredIdNumbers(mongoose.connection.db);
    assert.deepEqual(first.dropped, ["idNumber_1"]);
    assert.equal(first.unset, 2);
    assert.equal((await idNumberIndexes()).length, 0);
    const stored = await User.collection.find({}).toArray();
    assert.equal(stored.some((user) => Object.prototype.hasOwnProperty.call(user, "idNumber")), false);

    const again = await removeStoredIdNumbers(mongoose.connection.db);
    assert.deepEqual(again.dropped, []);
    assert.equal(again.unset, 0);

    await User.create({ name: "שלוש", email: "three@example.test", password: "secret" });
    await User.create({ name: "ארבע", email: "four@example.test", password: "secret" });
    assert.equal(await User.countDocuments({ email: { $in: ["three@example.test", "four@example.test"] } }), 2);
  });

  it("does not connect when the old copy script is run", () => {
    const result = spawnSync(process.execPath, ["scripts/migrate-id-to-idNumber.js"], {
      cwd: path.join(__dirname, ".."),
      env: { PATH: process.env.PATH, HOME: process.env.HOME || "" },
      encoding: "utf8",
      timeout: 5000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /no longer stored/i);
  });
});
