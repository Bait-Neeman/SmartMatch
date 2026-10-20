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

const mediaType = (value) => String(value || "").split(";")[0].trim().toLowerCase();

const isPdfBuffer = (body) =>
  Buffer.isBuffer(body) && body.length >= 5 && body.subarray(0, 5).toString("latin1") === "%PDF-";

// A resume PDF must be served as application/pdf so the browser opens it.
// A specific non-PDF type (an older image resume) is left unchanged.
const contentTypeForDelivery = (field, upstream, body) => {
  const type = mediaType(upstream);
  const declared = type ? String(upstream).split(";")[0].trim() : "";
  if (field === "resumePdf") {
    if (type.startsWith("image/")) return declared;
    if (isPdfBuffer(body) || type === "application/pdf" || !type) return "application/pdf";
  }
  if (declared) return declared;
  return CONTENT_TYPE[field];
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

// Owner, admin, or a person whose interest with the owner is accepted on this request.
// A decline is visible here immediately: the check reads the interest again.
// `viewer.role` is the role loaded from the database on this request, not the
// role baked into the token. An admin may open a photo or resume at every
// suggestion stage, including before any interest and after a decline.
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
    contentType: contentTypeForDelivery(field, file.contentType, file.body),
    filename: FILENAME[field],
  };
};

module.exports = {
  openProfileFile,
  contentTypeForDelivery,
  FILE_NOT_FOUND,
};
