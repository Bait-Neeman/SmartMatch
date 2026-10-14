const multer = require("multer");
const HttpError = require("../utils/httpError");
const { MAX_FILE_SIZE_MB } = require("./upload.middleware");

const MULTER_ERRORS = {
  LIMIT_FILE_SIZE: [413, `הקובץ גדול מדי. הגודל המקסימלי הוא ${MAX_FILE_SIZE_MB}MB`],
  LIMIT_FILE_COUNT: [400, "הועלו יותר מדי קבצים"],
  LIMIT_UNEXPECTED_FILE: [400, "שדה קובץ לא מוכר"],
};

const notFound = (req, res) => {
  res.status(404).json({ message: "הנתיב המבוקש לא נמצא" });
};

// Known errors get a clear message; details of unexpected errors are logged, never sent to the client.
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  if (err instanceof multer.MulterError) {
    const [status, message] = MULTER_ERRORS[err.code] || [400, "שגיאה בהעלאת הקובץ"];
    return res.status(status).json({ message });
  }

  // Request body errors from express.json()
  if (err.type === "entity.too.large") {
    return res.status(413).json({ message: "הבקשה גדולה מדי" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "הבקשה אינה בפורמט תקין" });
  }

  // Mongoose errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((error) => (error.name === "CastError" ? `ערך לא תקין בשדה ${error.path}` : error.message))
      .join(", ");
    return res.status(400).json({ message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "מזהה לא תקין" });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: "הרשומה כבר קיימת" });
  }

  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  res.status(500).json({ message: "אירעה שגיאה בשרת. נסו שוב מאוחר יותר." });
};

module.exports = { notFound, errorHandler };
