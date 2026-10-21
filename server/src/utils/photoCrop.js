const HttpError = require("./httpError");

// Same wording as client/src/copy/pendingCopy.js (photoCropInvalid / photoCropRequired).
const CROP_INVALID = "ערך לא תקין במיקוד התמונה";
const CROP_REQUIRED = "יש לבחור את אזור התמונה";

const CROP_KEYS = ["x", "y", "width", "height", "zoom"];
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const round2 = (value) => Math.round(value * 100) / 100;

const asNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
};

// Crop rect is percentages of the original image. x/y is the top-left.
// The focal point is the center of that rect. zoom is the cropper zoom (1–3).
const normalizePhotoCrop = (input) => {
  if (input == null || input === "") {
    throw new HttpError(400, CROP_INVALID);
  }

  let value = input;
  if (typeof input === "string") {
    try {
      value = JSON.parse(input);
    } catch {
      throw new HttpError(400, CROP_INVALID);
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, CROP_INVALID);
  }

  const keys = Object.keys(value);
  if (keys.some((key) => !CROP_KEYS.includes(key)) || CROP_KEYS.some((key) => !Object.prototype.hasOwnProperty.call(value, key))) {
    throw new HttpError(400, CROP_INVALID);
  }

  const crop = {};
  for (const key of CROP_KEYS) {
    const number = asNumber(value[key]);
    if (!Number.isFinite(number)) throw new HttpError(400, CROP_INVALID);
    crop[key] = round2(number);
  }

  if (crop.x < 0 || crop.y < 0 || crop.x > 100 || crop.y > 100) {
    throw new HttpError(400, CROP_INVALID);
  }
  if (crop.width <= 0 || crop.height <= 0 || crop.width > 100 || crop.height > 100) {
    throw new HttpError(400, CROP_INVALID);
  }
  if (crop.zoom < MIN_ZOOM || crop.zoom > MAX_ZOOM) {
    throw new HttpError(400, CROP_INVALID);
  }
  if (crop.x + crop.width > 100.01 || crop.y + crop.height > 100.01) {
    throw new HttpError(400, CROP_INVALID);
  }

  if (crop.x + crop.width > 100) crop.width = round2(100 - crop.x);
  if (crop.y + crop.height > 100) crop.height = round2(100 - crop.y);
  if (crop.width <= 0 || crop.height <= 0) throw new HttpError(400, CROP_INVALID);

  return crop;
};

const readPhotoCrop = (body) => {
  if (!body || typeof body !== "object" || !Object.prototype.hasOwnProperty.call(body, "photoCrop")) {
    return { present: false, value: null };
  }
  return { present: true, value: normalizePhotoCrop(body.photoCrop) };
};

// Stored crops are shown as-is. A broken value falls back to the centered cover.
const presentPhotoCrop = (value) => {
  if (!value || typeof value !== "object") return null;
  try {
    return normalizePhotoCrop({
      x: value.x,
      y: value.y,
      width: value.width,
      height: value.height,
      zoom: value.zoom,
    });
  } catch {
    return null;
  }
};

module.exports = {
  CROP_INVALID,
  CROP_REQUIRED,
  MIN_ZOOM,
  MAX_ZOOM,
  normalizePhotoCrop,
  readPhotoCrop,
  presentPhotoCrop,
};
