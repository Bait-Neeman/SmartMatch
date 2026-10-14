const multer = require("multer");
const HttpError = require("../utils/httpError");

const MAX_FILE_SIZE_MB = 10;

const ALLOWED_TYPES = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  resumePdf: ["application/pdf"],
};

const TYPE_ERRORS = {
  image: "יש להעלות תמונה מסוג JPG, PNG, GIF או WEBP",
  resumePdf: "יש להעלות קובץ PDF",
};

// The type declared by the browser can be faked, so the file's first bytes are checked too.
const FILE_SIGNATURES = {
  "image/jpeg": (bytes) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) =>
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/gif": (bytes) => ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("latin1")),
  "image/webp": (bytes) =>
    bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP",
  "application/pdf": (bytes) => bytes.subarray(0, 5).toString("latin1") === "%PDF-",
};

// Files are kept in memory only until they are uploaded to Cloudinary - nothing is written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024, files: 2, fields: 30, parts: 40 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES[file.fieldname].includes(file.mimetype)) {
      return cb(new HttpError(400, TYPE_ERRORS[file.fieldname]));
    }
    cb(null, true);
  },
});

const verifyFileContents = (req, res, next) => {
  for (const [field, files] of Object.entries(req.files || {})) {
    for (const file of files) {
      const isGenuine = ALLOWED_TYPES[field].some((type) => FILE_SIGNATURES[type](file.buffer));
      if (!isGenuine) {
        throw new HttpError(400, TYPE_ERRORS[field]);
      }
    }
  }
  next();
};

// Accepts an optional profile image and an optional resume PDF.
const profileUpload = [
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "resumePdf", maxCount: 1 },
  ]),
  verifyFileContents,
];

module.exports = { profileUpload, MAX_FILE_SIZE_MB };
