const Profile = require("../models/profile.model");
const Interest = require("../models/interest.model");
const HttpError = require("../utils/httpError");
const { assertObjectId } = require("../utils/validators");
const { uploadProfileFile, deleteProfileFile, getFileUrl } = require("./storage.service");

// The fields a user may set on their profile, with their Hebrew names for error messages
const EDITABLE_FIELDS = {
  gender: "מגדר",
  age: "גיל",
  city: "עיר",
  height: "גובה",
  style: "סגנון",
  appearance: "מראה חיצוני",
  ethnicity: "עדה",
  description: "תיאור",
  yeshiva: "ישיבה",
  seminar: "סמינר",
  occupation: "עיסוק",
  financialRequirement: "דרישה כספית",
  financialCapabilities: "יכולת כספית",
  financialStatus: "מדד כספי",
};
const NUMBER_FIELDS = new Set(["age", "height", "financialStatus"]);
const REQUIRED_FIELDS = ["gender", "age"];
const FILE_FIELDS = ["image", "resumePdf"];

// Reads only the editable fields from the request: `values` to store, and `cleared` - fields sent
// empty. Anything else - the profile owner (`user`), file IDs, Mongo operators - is ignored,
// so a request can't overwrite it.
const pickProfileFields = (body = {}) => {
  const values = {};
  const cleared = [];

  for (const [field, label] of Object.entries(EDITABLE_FIELDS)) {
    let value = body[field];
    if (typeof value === "string") {
      value = value.trim();
    }
    if (value === undefined) {
      continue;
    }
    if (value === null || value === "") {
      cleared.push(field);
      continue;
    }

    if (NUMBER_FIELDS.has(field)) {
      value = typeof value === "string" ? Number(value) : value;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new HttpError(400, `ערך לא תקין בשדה ${label}`);
      }
    } else if (typeof value !== "string") {
      throw new HttpError(400, `ערך לא תקין בשדה ${label}`);
    }

    values[field] = value;
  }

  return { values, cleared };
};

// Stored file IDs are replaced by signed URLs - or by null when the viewer may not see the files.
const toProfileResponse = (profile, { includeFiles = true } = {}) => {
  const data = typeof profile.toObject === "function" ? profile.toObject() : { ...profile };
  for (const field of FILE_FIELDS) {
    data[field] = includeFiles ? getFileUrl(field, data[field]) : null;
  }
  return data;
};

const deleteFiles = (fileIds) =>
  Promise.all(
    Object.entries(fileIds)
      .filter(([, publicId]) => publicId)
      .map(([field, publicId]) => deleteProfileFile(field, publicId))
  );

// Uploads the files sent with the request; returns their Cloudinary IDs by field name.
const uploadRequestFiles = async (files = {}) => {
  const uploaded = {};
  try {
    for (const field of FILE_FIELDS) {
      const file = files[field]?.[0];
      if (file) {
        uploaded[field] = await uploadProfileFile(field, file);
      }
    }
  } catch (error) {
    await deleteFiles(uploaded);
    throw error;
  }
  return uploaded;
};

// Saves the profile together with newly uploaded files. If saving fails the new uploads are
// removed; if it succeeds the files they replaced are removed.
const saveWithFiles = async (profile, files) => {
  const uploaded = await uploadRequestFiles(files);
  const replaced = Object.fromEntries(Object.keys(uploaded).map((field) => [field, profile[field]]));

  profile.set(uploaded);
  try {
    await profile.save({ validateModifiedOnly: !profile.isNew });
  } catch (error) {
    await deleteFiles(uploaded);
    throw error;
  }

  await deleteFiles(replaced);
};

const createProfileForUser = async (userId, body, files) => {
  if (await Profile.exists({ user: userId })) {
    throw new HttpError(409, "כבר קיים פרופיל למשתמש זה");
  }

  const profile = new Profile({ ...pickProfileFields(body).values, user: userId });
  // Reject invalid data before uploading any file
  await profile.validate();
  await saveWithFiles(profile, files);

  return toProfileResponse(profile);
};

const getProfileByUserId = async (userId) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) {
    throw new HttpError(404, "הפרופיל לא נמצא");
  }
  return toProfileResponse(profile);
};

const updateProfileByUserId = async (userId, body, files) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) {
    throw new HttpError(404, "הפרופיל לא נמצא");
  }

  const { values, cleared } = pickProfileFields(body);

  // An optional field sent empty is removed; a required one can't be
  const clearedRequired = cleared.find((field) => REQUIRED_FIELDS.includes(field));
  if (clearedRequired) {
    throw new HttpError(400, `${EDITABLE_FIELDS[clearedRequired]} הוא שדה חובה`);
  }

  profile.set(values);
  for (const field of cleared) {
    profile.set(field, undefined);
  }

  // Only the changed fields are validated, so older profiles can still be edited
  await profile.validate(undefined, { validateModifiedOnly: true });
  await saveWithFiles(profile, files);

  return toProfileResponse(profile);
};

const deleteProfileByUserId = async (userId) => {
  const profile = await Profile.findOneAndDelete({ user: userId });
  if (!profile) {
    throw new HttpError(404, "הפרופיל לא נמצא");
  }
  await deleteFiles({ image: profile.image, resumePdf: profile.resumePdf });
};

const hasAcceptedInterest = (userA, userB) =>
  Interest.exists({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
    status: "accepted",
  });

// The photo and resume are visible only to the owner, an admin, or a user with a mutual match.
const getProfileForViewer = async (viewer, targetUserId) => {
  assertObjectId(targetUserId);

  const profile = await Profile.findOne({ user: targetUserId });
  if (!profile) {
    throw new HttpError(404, "הפרופיל לא נמצא");
  }

  const canSeeFiles =
    viewer.role === "admin" ||
    viewer.userId === targetUserId ||
    Boolean(await hasAcceptedInterest(viewer.userId, targetUserId));

  return toProfileResponse(profile, { includeFiles: canSeeFiles });
};

module.exports = {
  createProfileForUser,
  getProfileByUserId,
  updateProfileByUserId,
  deleteProfileByUserId,
  getProfileForViewer,
  toProfileResponse,
};
