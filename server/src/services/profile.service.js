const Profile = require("../models/profile.model");
const Interest = require("../models/interest.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { assertObjectId } = require("../utils/validators");
const { uploadProfileFile, deleteProfileFile, fileAccessPath } = require("./storage.service");
const { toPublicPerson } = require("./privacy.service");
const { getCandidatesForUser } = require("./match.service");

// Same wording for a missing profile and a profile this viewer may not open,
// so an id does not reveal whether that person exists.
const PROFILE_NOT_FOUND = "הפרופיל לא נמצא";

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
  // financialRequirement is דרישה כספית (financialDemand): a minimum.
  // financialCapabilities is יכולת כספית. There is no השתתפות כספית (financialContribution) field.
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
    data[field] = includeFiles ? fileAccessPath(data.user, field, data[field]) : null;
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

const interestsBetween = (userA, userB) =>
  Interest.find({
    $or: [
      { sender: userA, receiver: userB },
      { sender: userB, receiver: userA },
    ],
  })
    .select("status")
    .lean();

// True when the matching logic would currently offer targetUserId to viewerId.
const isCurrentCandidate = async (viewerId, targetUserId) => {
  try {
    const candidates = await getCandidatesForUser(viewerId);
    return candidates.some((candidate) => String(candidate._id) === String(targetUserId));
  } catch (error) {
    if (error instanceof HttpError && error.statusCode === 404) return false;
    throw error;
  }
};

// The owner and an admin see the stored profile. Another registered user sees the
// anonymized profile when that person is a current suggestion or a still-pending
// interest, and name, contact, photo, and resume only while an interest is accepted.
// A decline at any stage, a stranger, and an unknown id all get the same not-found response.
const getProfileForViewer = async (viewer, targetUserId) => {
  assertObjectId(targetUserId);

  const isSelf = viewer.userId === String(targetUserId);
  const isAdmin = viewer.role === "admin";
  const interests = isSelf || isAdmin ? [] : await interestsBetween(viewer.userId, targetUserId);
  const accepted = interests.some((interest) => interest.status === "accepted");
  const pending = interests.some((interest) => interest.status === "pending");
  const offered =
    !isSelf && !isAdmin && !accepted && !pending && (await isCurrentCandidate(viewer.userId, targetUserId));

  if (!isSelf && !isAdmin && !accepted && !pending && !offered) {
    throw new HttpError(404, PROFILE_NOT_FOUND);
  }

  const profile = await Profile.findOne({ user: targetUserId });
  if (!profile) {
    throw new HttpError(404, PROFILE_NOT_FOUND);
  }

  if (isSelf || isAdmin) {
    return toProfileResponse(profile, { includeFiles: true });
  }

  const user = accepted
    ? await User.findById(targetUserId).select("name email").lean()
    : { _id: targetUserId };

  return toPublicPerson(user, profile, { revealIdentity: accepted });
};

module.exports = {
  createProfileForUser,
  getProfileByUserId,
  updateProfileByUserId,
  deleteProfileByUserId,
  getProfileForViewer,
  toProfileResponse,
};
