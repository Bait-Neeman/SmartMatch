// Crop metadata stored on the profile. Percentages are of the original image.
// x/y is the top-left of the chosen rect. The focal point is that rect's center.
// zoom matches the crop dialog (1–3). Missing or invalid data means centered cover.

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const round2 = (value) => Math.round(value * 100) / 100;

const asNumber = (value) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

export const readPhotoCrop = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const crop = {};
  for (const key of ["x", "y", "width", "height", "zoom"]) {
    const number = asNumber(value[key]);
    if (number == null) return null;
    crop[key] = number;
  }
  if (crop.x < 0 || crop.y < 0 || crop.x > 100 || crop.y > 100) return null;
  if (crop.width <= 0 || crop.height <= 0 || crop.width > 100 || crop.height > 100) return null;
  if (crop.x + crop.width > 100.05 || crop.y + crop.height > 100.05) return null;
  if (crop.zoom < MIN_ZOOM || crop.zoom > MAX_ZOOM) return null;
  return crop;
};

const clampPercent = (value) => Math.min(100, Math.max(0, value));

export const roundCrop = (area, zoom) => {
  if (!area) return null;
  const x = clampPercent(round2(Number(area.x) || 0));
  const y = clampPercent(round2(Number(area.y) || 0));
  let width = clampPercent(round2(Number(area.width) || 0));
  let height = clampPercent(round2(Number(area.height) || 0));
  if (x + width > 100) width = round2(100 - x);
  if (y + height > 100) height = round2(100 - y);
  return readPhotoCrop({ x, y, width, height, zoom: round2(Number(zoom) || 0) });
};

export const focalPosition = (crop) => {
  const safe = readPhotoCrop(crop);
  if (!safe) return "center";
  const x = Math.min(100, Math.max(0, safe.x + safe.width / 2));
  const y = Math.min(100, Math.max(0, safe.y + safe.height / 2));
  return `${x}% ${y}%`;
};

// Places the original image so the chosen rect stays visible and the frame stays full.
// No crop: the same centered cover used before this feature.
export const layoutCrop = ({ containerWidth, containerHeight, imageWidth, imageHeight, crop }) => {
  const frameWidth = Number(containerWidth);
  const frameHeight = Number(containerHeight);
  const imageW = Number(imageWidth);
  const imageH = Number(imageHeight);
  if (!(frameWidth > 0 && frameHeight > 0 && imageW > 0 && imageH > 0)) return null;

  const safe = readPhotoCrop(crop);
  const coverScale = Math.max(frameWidth / imageW, frameHeight / imageH);
  let scale = coverScale;
  let focalX = imageW / 2;
  let focalY = imageH / 2;

  if (safe) {
    const cropW = (safe.width / 100) * imageW;
    const cropH = (safe.height / 100) * imageH;
    if (cropW > 0 && cropH > 0) {
      scale = Math.max(coverScale, Math.min(frameWidth / cropW, frameHeight / cropH));
      focalX = ((safe.x + safe.width / 2) / 100) * imageW;
      focalY = ((safe.y + safe.height / 2) / 100) * imageH;
    }
  }

  const width = imageW * scale;
  const height = imageH * scale;
  let left = frameWidth / 2 - focalX * scale;
  let top = frameHeight / 2 - focalY * scale;
  left = Math.min(0, Math.max(left, frameWidth - width));
  top = Math.min(0, Math.max(top, frameHeight - height));
  return { width, height, left, top };
};

export const notifyPortraitChanged = () => {
  window.dispatchEvent(new Event("portrait-changed"));
};
