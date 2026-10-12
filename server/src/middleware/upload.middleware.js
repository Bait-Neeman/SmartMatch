const path = require("path");
const fs = require("fs");
const multer = require("multer");

const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const field = file.fieldname;
    const uploadRoot = path.join(__dirname, "../../uploads");
    const subfolder = field === "resumePdf" || field === "resumePDF" ? "pdfs" : "images";
    const destination = path.join(uploadRoot, subfolder);
    ensureDirectoryExists(destination);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const cleaned = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${timestamp}-${cleaned}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedImageFields = ["image", "profileImage"];
    const allowedPdfFields = ["resumePdf", "resumePDF"];
    const isImageFile = file.mimetype.startsWith("image/");
    const isPdfFile = file.mimetype === "application/pdf";

    if (allowedImageFields.includes(file.fieldname) && isImageFile) {
      return cb(null, true);
    }
    if (allowedPdfFields.includes(file.fieldname) && isPdfFile) {
      return cb(null, true);
    }

    return cb(new Error("Invalid file type"));
  },
});

module.exports = upload;
