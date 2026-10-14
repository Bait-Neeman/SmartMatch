const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
const HttpError = require("../utils/httpError");

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
    extension: ".pdf",
    // Free Cloudinary accounts block CDN delivery of PDF files, so resumes are opened
    // through the signed download API instead - and those links expire.
    viaDownloadApi: true,
  },
};

const DOWNLOAD_LINK_TTL_SECONDS = 60 * 60;

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

// Uploads a file received by multer and returns its Cloudinary public ID.
const uploadProfileFile = async (kind, file) => {
  if (!configured) {
    throw new HttpError(503, "העלאת קבצים אינה זמינה כרגע. נסו שוב מאוחר יותר.");
  }

  const fileKind = FILE_KINDS[kind];

  try {
    const result = await uploadBuffer(file.buffer, {
      resource_type: fileKind.resourceType,
      type: DELIVERY_TYPE,
      folder: fileKind.folder,
      public_id: `${crypto.randomUUID()}${fileKind.extension || ""}`,
      overwrite: false,
      ...(fileKind.transformation && { transformation: fileKind.transformation }),
    });
    return result.public_id;
  } catch (error) {
    console.error(`Cloudinary upload of ${kind} failed:`, error.message);
    throw new HttpError(502, "העלאת הקובץ נכשלה. נסו שוב.");
  }
};

// Never fails the request: a leftover file is logged so it can be removed later.
const deleteProfileFile = async (kind, publicId) => {
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

// Signed URL for a stored file, or null when there is no (available) file.
const getFileUrl = (kind, publicId) => {
  if (!configured || !isStoredFileId(publicId)) {
    return null;
  }

  const { resourceType, viaDownloadApi } = FILE_KINDS[kind];

  if (viaDownloadApi) {
    return cloudinary.utils.private_download_url(publicId, "", {
      resource_type: resourceType,
      type: DELIVERY_TYPE,
      attachment: false,
      expires_at: Math.floor(Date.now() / 1000) + DOWNLOAD_LINK_TTL_SECONDS,
    });
  }

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: DELIVERY_TYPE,
    sign_url: true,
    secure: true,
  });
};

module.exports = {
  isStorageConfigured,
  uploadProfileFile,
  deleteProfileFile,
  getFileUrl,
};
