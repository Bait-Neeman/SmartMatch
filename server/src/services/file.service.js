const Profile = require("../models/profile.model");
const Interest = require("../models/interest.model");
const HttpError = require("../utils/httpError");
const { assertObjectId } = require("../utils/validators");
const { readStoredFile } = require("./storage.service");
const { describeResume } = require("../utils/resumeFile");

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

const contentTypeForDelivery = (field, upstream, body) => {
  if (field === "resumePdf") {
    const described = describeResume(body);
    if (described) return described.contentType;
  }
  const type = mediaType(upstream);
  const declared = type ? String(upstream).split(";")[0].trim() : "";
  if (declared) return declared;
  return CONTENT_TYPE[field];
};

const FILENAME = {
  image: "photo.jpg",
  resumePdf: "resume.pdf",
};

const deliveryFor = (field, upstream, body) => {
  if (field === "resumePdf") {
    const described = describeResume(body);
    if (described) return described;
  }
  return {
    contentType: contentTypeForDelivery(field, upstream, body),
    filename: FILENAME[field],
    disposition: "inline",
  };
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
  const delivered = deliveryFor(field, file.contentType, file.body);
  return {
    body: file.body,
    contentType: delivered.contentType,
    filename: delivered.filename,
    disposition: delivered.disposition,
  };
};

module.exports = {
  openProfileFile,
  contentTypeForDelivery,
  FILE_NOT_FOUND,
};
