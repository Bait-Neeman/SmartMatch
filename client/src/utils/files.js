// Upload rules - the same as the server's (server/src/middleware/upload.middleware.js)
export const MAX_FILE_SIZE_MB = 10;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// For the `accept` attribute of image file inputs
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

const isTooLarge = (file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
const tooLargeMessage = `הקובץ גדול מדי. הגודל המקסימלי הוא ${MAX_FILE_SIZE_MB}MB`;

// Each returns an error message, or "" when the file can be uploaded
export const getImageFileError = (file) => {
  if (!IMAGE_TYPES.includes(file.type)) return "יש לבחור תמונה מסוג JPG, PNG, GIF או WEBP";
  if (isTooLarge(file)) return tooLargeMessage;
  return "";
};

export const getPdfFileError = (file) => {
  if (file.type !== "application/pdf") return "יש לבחור קובץ PDF";
  if (isTooLarge(file)) return tooLargeMessage;
  return "";
};

// The server returns uploaded files as signed https links (Cloudinary).
// Anything else is never used as a link.
export const toSafeFileUrl = (url) =>
  typeof url === "string" && url.startsWith("https://") ? url : "";
