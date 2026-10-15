const Profile = require("../models/profile.model");
const Interest = require("../models/interest.model");
const HttpError = require("../utils/httpError");
const { assertObjectId } = require("../utils/validators");
const { readStoredFile } = require("./storage.service");

// Same wording when the file is missing and when this viewer may not open it.
const FILE_NOT_FOUND = "הקובץ לא נמצא";

const FIELD_BY_ROUTE = {
  image: "image",
  resume: "resumePdf",
};

const CONTENT_TYPE = {
  image: "image/jpeg",
  resumePdf: "application/pdf",
};

const FILENAME = {
  image: "photo.jpg",
  resumePdf: "resume.pdf",
};

const hasAcceptedInterest = (viewerId, ownerId) =>
  Interest.exists({
    status: "accepted",
    $or: [
      { sender: viewerId, receiver: ownerId },
      { sender: ownerId, receiver: viewerId },
    ],
  });

// Owner, admin, or a person who is mutually accepted with the owner right now.
const openProfileFile = async (viewer, ownerId, routeKind) => {
  assertObjectId(ownerId);
  const field = FIELD_BY_ROUTE[routeKind];
  if (!field) {
    throw new HttpError(404, FILE_NOT_FOUND);
  }

  const isSelf = viewer.userId === String(ownerId);
  const isAdmin = viewer.role === "admin";
  const accepted = isSelf || isAdmin ? true : await hasAcceptedInterest(viewer.userId, ownerId);
  if (!accepted) {
    throw new HttpError(404, FILE_NOT_FOUND);
  }

  const profile = await Profile.findOne({ user: ownerId }).select(field).lean();
  const publicId = profile?.[field];
  if (!publicId) {
    throw new HttpError(404, FILE_NOT_FOUND);
  }

  const file = await readStoredFile(field, publicId);
  return {
    body: file.body,
    contentType: file.contentType || CONTENT_TYPE[field],
    filename: FILENAME[field],
  };
};

module.exports = {
  openProfileFile,
  FILE_NOT_FOUND,
};
