// Upload rules - the same as the server's (server/src/middleware/upload.middleware.js)
export const MAX_FILE_SIZE_MB = 10;

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// For the `accept` attribute of image file inputs
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

const RESUME_EXTENSIONS = ["pdf", "doc", "docx", "odt", "rtf", "txt", "jpg", "jpeg", "png", "webp", "heic", "heif"];

const RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.oasis.opendocument.text",
  "application/rtf",
  "text/rtf",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// For the `accept` attribute of resume file inputs. The server still checks the bytes.
export const RESUME_ACCEPT = [...RESUME_TYPES, ...RESUME_EXTENSIONS.map((extension) => `.${extension}`)].join(",");

const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "dll",
  "bat",
  "cmd",
  "com",
  "scr",
  "msi",
  "js",
  "mjs",
  "sh",
  "bash",
  "php",
  "py",
  "html",
  "htm",
  "svg",
  "zip",
  "rar",
  "7z",
  "gz",
  "jar",
]);

const extensionOf = (name) => {
  const match = String(name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
};

const isTooLarge = (file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024;
const tooLargeMessage = `הקובץ גדול מדי. הגודל המקסימלי הוא ${MAX_FILE_SIZE_MB}MB`;

// Each returns an error message, or "" when the file can be uploaded
export const getImageFileError = (file) => {
  if (!IMAGE_TYPES.includes(file.type)) return "יש לבחור תמונה מסוג JPG, PNG, GIF או WEBP";
  if (isTooLarge(file)) return tooLargeMessage;
  return "";
};

const INLINE_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp", "heic", "heif"]);

export const resumeOpensInline = (file) => {
  const type = String(file?.type || "").split(";")[0].trim().toLowerCase();
  if (type === "application/pdf" || type.startsWith("image/")) return true;
  return INLINE_EXTENSIONS.has(extensionOf(file?.name));
};

export const getResumeFileError = (file) => {
  if (isTooLarge(file)) return tooLargeMessage;
  const extension = extensionOf(file?.name);
  const type = String(file?.type || "").split(";")[0].trim().toLowerCase();
  if (BLOCKED_EXTENSIONS.has(extension)) return "יש לבחור קובץ";
  if (RESUME_EXTENSIONS.includes(extension) || RESUME_TYPES.includes(type)) return "";
  return "יש לבחור קובץ";
};

// Profile files are stable `/api/files/...` paths. Each open is checked again.
// Older https links are still allowed.
export const isAppFileUrl = (url) => typeof url === "string" && url.startsWith("/api/files/");

export const toSafeFileUrl = (url) => {
  if (isAppFileUrl(url)) return url;
  return typeof url === "string" && url.startsWith("https://") ? url : "";
};
