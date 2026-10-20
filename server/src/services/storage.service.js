const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const HttpError = require("../utils/httpError");
const { resumeExtension } = require("../utils/resumeFile");

// Credentials come from the CLOUDINARY_URL environment variable, which the SDK reads itself.
let configured = false;
try {
  cloudinary.config({ secure: true });
  const { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret } = cloudinary.config();
  configured = Boolean(cloudName && apiKey && apiSecret);
} catch (error) {
  console.error("Invalid CLOUDINARY_URL:", error.message);
}

const ROOT_FOLDER = process.env.CLOUDINARY_FOLDER || "smartmatch";

// Files are stored as "authenticated" assets: they can only be opened through a URL
// signed by this server, which hands such URLs only to users allowed to see the file.
const DELIVERY_TYPE = "authenticated";

const FILE_KINDS = {
  image: {
    resourceType: "image",
    folder: `${ROOT_FOLDER}/images`,
    // Shrink very large photos; re-encoding also strips metadata such as GPS location
    transformation: [{ width: 1600, height: 1600, crop: "limit" }],
  },
  resumePdf: {
    resourceType: "raw",
    folder: `${ROOT_FOLDER}/resumes`,
  },
};

const isStorageConfigured = () => configured;

// Before Cloudinary, files were saved on the server's disk as "images/..." or "pdfs/...".
// Those files no longer exist, so such values are treated as "no file".
const isLegacyLocalPath = (value) => /^\/?(uploads\/)?(images|pdfs)\//.test(value);

const isStoredFileId = (value) => typeof value === "string" && value !== "" && !isLegacyLocalPath(value);

const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
    stream.end(buffer);
  });

// Tests substitute this so a profile upload does not contact Cloudinary.
let uploadOverride = null;

const setProfileFileUploader = (uploader) => {
  uploadOverride = uploader;
};

// Uploads a file received by multer and returns its Cloudinary public ID.
const uploadProfileFile = async (kind, file) => {
  if (uploadOverride) {
    return uploadOverride(kind, file);
  }
  if (!configured) {
    throw new HttpError(503, "העלאת קבצים אינה זמינה כרגע. נסו שוב מאוחר יותר.");
  }

  const fileKind = FILE_KINDS[kind];
  const extension = kind === "resumePdf" ? resumeExtension(file.buffer) : fileKind.extension || "";
  if (kind === "resumePdf" && !extension) {
    throw new HttpError(400, "יש להעלות קובץ");
  }

  try {
    const result = await uploadBuffer(file.buffer, {
      resource_type: fileKind.resourceType,
      type: DELIVERY_TYPE,
      folder: fileKind.folder,
      public_id: `${crypto.randomUUID()}${extension}`,
      overwrite: false,
      ...(fileKind.transformation && { transformation: fileKind.transformation }),
    });
    return result.public_id;
  } catch (error) {
    console.error(`Cloudinary upload of ${kind} failed:`, error.message);
    throw new HttpError(502, "העלאת הקובץ נכשלה. נסו שוב.");
  }
};

let deleteOverride = null;

const setProfileFileDeleter = (deleter) => {
  deleteOverride = deleter;
};

// Never fails the request: a leftover file is logged so it can be removed later.
const deleteProfileFile = async (kind, publicId) => {
  if (deleteOverride) {
    return deleteOverride(kind, publicId);
  }
  if (!configured || !isStoredFileId(publicId)) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: FILE_KINDS[kind].resourceType,
      type: DELIVERY_TYPE,
      invalidate: true,
    });
  } catch (error) {
    console.error(`Cloudinary delete of ${publicId} failed:`, error.message);
  }
};

// How long the server may use a Cloudinary download URL. Callers never receive this URL.
const READ_URL_TTL_SECONDS = 60;

const ROUTE_KIND = {
  image: "image",
  resumePdf: "resume",
};

// Stable path the client keeps. It does not expire; every open is checked again.
const fileAccessPath = (userId, kind, publicId) => {
  const routeKind = ROUTE_KIND[kind];
  if (userId == null || !routeKind || !isStoredFileId(publicId)) {
    return null;
  }
  const id = userId._id || userId;
  return `/api/files/${id}/${routeKind}`;
};

const formatFor = (kind, publicId) => {
  const extension = String(publicId).match(/\.([a-z0-9]+)$/i);
  if (extension) return extension[1].toLowerCase();
  return kind === "resumePdf" ? "pdf" : "jpg";
};

// Signed Cloudinary download URL used only while this server fetches the bytes.
const createShortLivedReadUrl = (kind, publicId) => {
  const fileKind = FILE_KINDS[kind];
  const expiresAt = Math.floor(Date.now() / 1000) + READ_URL_TTL_SECONDS;
  const url = cloudinary.utils.private_download_url(publicId, formatFor(kind, publicId), {
    resource_type: fileKind.resourceType,
    type: DELIVERY_TYPE,
    expires_at: expiresAt,
    attachment: false,
  });
  return { url, expiresAt };
};

const defaultContentType = {
  image: "image/jpeg",
  resumePdf: "application/pdf",
};

const defaultFilename = {
  image: "photo.jpg",
  resumePdf: "resume.pdf",
};

// Tests substitute this so a fake Cloudinary account is not contacted.
let readFileOverride = null;

const setStoredFileReader = (reader) => {
  readFileOverride = reader;
};

const readStoredFile = async (kind, publicId) => {
  if (readFileOverride) {
    return readFileOverride(kind, publicId);
  }
  if (!configured || !isStoredFileId(publicId)) {
    throw new HttpError(404, "הקובץ לא נמצא");
  }

  const { url } = createShortLivedReadUrl(kind, publicId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new HttpError(502, "לא ניתן לפתוח את הקובץ כרגע");
  }

  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || defaultContentType[kind],
    filename: defaultFilename[kind],
  };
};

module.exports = {
  isStorageConfigured,
  uploadProfileFile,
  deleteProfileFile,
  fileAccessPath,
  createShortLivedReadUrl,
  setStoredFileReader,
  setProfileFileUploader,
  setProfileFileDeleter,
  readStoredFile,
  READ_URL_TTL_SECONDS,
};
