const multer = require("multer");
const HttpError = require("../utils/httpError");
const { detectResumeType } = require("../utils/resumeFile");

const MAX_FILE_SIZE_MB = 10;

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
};

const TYPE_ERRORS = {
  image: "יש להעלות תמונה מסוג JPG, PNG, GIF או WEBP",
  resumePdf: "יש להעלות קובץ",
};

// The type declared by the browser can be faked, so the file's first bytes are checked too.
const BLOCKED_EXTENSIONS = new Set([
  "sh",
  "bash",
  "bat",
  "cmd",
  "ps1",
  "psm1",
  "js",
  "mjs",
  "cjs",
  "exe",
  "msi",
  "dll",
  "com",
  "scr",
  "html",
  "htm",
  "svg",
  "php",
  "py",
  "jar",
  "vbs",
  "wsf",
  "hta",
]);

const EXTENSION_KIND = {
  pdf: "pdf",
  doc: "doc",
  docx: "docx",
  odt: "odt",
  rtf: "rtf",
  txt: "txt",
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  heic: "heic",
  heif: "heic",
};

const MIME_KIND = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "text/plain": "txt",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

const fileExtension = (name) => {
  const base = String(name || "").split(/[/\\]/).pop().trim().toLowerCase();
  const match = base.match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
};

const mediaType = (value) => String(value || "").split(";")[0].trim().toLowerCase();

// The name and the declared type have to agree with the bytes.
// Plain text is only a resume when the file is actually named .txt.
const resumeBytesMatchDeclaration = (file) => {
  const extension = fileExtension(file.originalname);
  if (BLOCKED_EXTENSIONS.has(extension)) return false;
  const sniffed = detectResumeType(file.buffer);
  if (!sniffed) return false;
  if (sniffed === "txt" && extension !== "txt") return false;
  const named = EXTENSION_KIND[extension];
  if (named && named !== sniffed) return false;
  const declared = MIME_KIND[mediaType(file.mimetype)];
  if (declared && declared !== sniffed) return false;
  return true;
};

const FILE_SIGNATURES = {
  "image/jpeg": (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/gif": (bytes) => ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("latin1")),
  "image/webp": (bytes) =>
    bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP",
};

// Files are kept in memory only until they are uploaded to Cloudinary - nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 2, fields: 30, parts: 40 },
  fileFilter: (req, file, cb) => {
    // Resume bytes are checked after the file is buffered. The declared type is not enough.
    if (file.fieldname === "resumePdf") return cb(null, true);
    const allowed = ALLOWED_TYPES[file.fieldname];
    if (!allowed || !allowed.includes(file.mimetype)) {
      return cb(new HttpError(400, TYPE_ERRORS[file.fieldname] || TYPE_ERRORS.image));
    }
    cb(null, true);
  },
});

const verifyFileContents = (req, res, next) => {
  for (const [field, files] of Object.entries(req.files || {})) {
    for (const file of files) {
      if (field === "resumePdf") {
        if (!resumeBytesMatchDeclaration(file)) throw new HttpError(400, TYPE_ERRORS.resumePdf);
        continue;
      }
      const allowed = ALLOWED_TYPES[field] || [];
      const isGenuine = allowed.some((type) => FILE_SIGNATURES[type](file.buffer));
      if (!isGenuine) {
        throw new HttpError(400, TYPE_ERRORS[field] || TYPE_ERRORS.image);
      }
    }
  }
  next();
};

// Accepts an optional profile image and an optional resume file.
const profileUpload = [
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "resumePdf", maxCount: 1 },
  ]),
  verifyFileContents,
];

module.exports = { profileUpload, MAX_FILE_SIZE_MB };
