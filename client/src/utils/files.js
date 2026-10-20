// Upload rules - the same as the server's (server/src/middleware/upload.middleware.js)
export const MAX_FILE_SIZE_MB = 10;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// For the `accept` attribute of image file inputs
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

// Resume files. The server checks the same MIME type and the %PDF- header.
export const PDF_TYPE = "application/pdf";
export const PDF_ACCEPT = PDF_TYPE;

const isTooLarge = (file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
const tooLargeMessage = `הקובץ גדול מדי. הגודל המקסימלי הוא ${MAX_FILE_SIZE_MB}MB`;

// Each returns an error message, or "" when the file can be uploaded
export const getImageFileError = (file) => {
  if (!IMAGE_TYPES.includes(file.type)) return "יש לבחור תמונה מסוג JPG, PNG, GIF או WEBP";
  if (isTooLarge(file)) return tooLargeMessage;
  return "";
};

export const getPdfFileError = (file) => {
  if (file.type !== PDF_TYPE) return "יש לבחור קובץ PDF";
  if (isTooLarge(file)) return tooLargeMessage;
  return "";
};

// Profile files are stable `/api/files/...` paths. Each open is checked again.
// Older https links are still allowed.
export const isAppFileUrl = (url) => typeof url === "string" && url.startsWith("/api/files/");

export const toSafeFileUrl = (url) => {
  if (isAppFileUrl(url)) return url;
  return typeof url === "string" && url.startsWith("https://") ? url : "";
};
