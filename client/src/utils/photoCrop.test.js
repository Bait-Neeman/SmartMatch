import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { focalPosition, layoutCrop, photoCoverDeclarations, photoFrameDeclarations, readPhotoCrop, roundCrop } from "./photoCrop.js";

const require = createRequire(import.meta.url);
const createCache = require("@emotion/cache").default;
const { serializeStyles } = require("@emotion/serialize");
const { prefixer } = require("stylis");
const rtlPlugin = require("stylis-plugin-rtl").default;

// Same plugin order as client/src/main.jsx.
const rtlCache = createCache({ key: "muirtl", stylisPlugins: [prefixer, rtlPlugin] });

const flipped = (declarations) => rtlCache.insert(".photo", serializeStyles([declarations]), rtlCache.sheet, false);

const translateX = (css) => [...css.matchAll(/translate\(([-0-9.]+)px/g)].map((match) => Number(match[1]));

const covers = (frameWidth, frameHeight, layout) => {
  assert.ok(layout.left <= 0.001);
  assert.ok(layout.top <= 0.001);
  assert.ok(layout.left + layout.width >= frameWidth - 0.001);
  assert.ok(layout.top + layout.height >= frameHeight - 0.001);
};

describe("photo crop", () => {
  it("drops a crop that is missing, partial, or out of range", () => {
    assert.equal(readPhotoCrop(null), null);
    assert.equal(readPhotoCrop({ x: 10, y: 10, width: 40, height: 40 }), null);
    assert.equal(readPhotoCrop({ x: 80, y: 0, width: 30, height: 40, zoom: 1 }), null);
    assert.equal(readPhotoCrop({ x: 0, y: 0, width: 40, height: 40, zoom: 4 }), null);
    assert.equal(focalPosition(null), "center");
  });

  it("keeps a valid crop and rounds the dialog result", () => {
    const crop = roundCrop({ x: 10.004, y: 20, width: 40, height: 50 }, 1.236);
    assert.deepEqual(crop, { x: 10, y: 20, width: 40, height: 50, zoom: 1.24 });
    assert.equal(focalPosition(crop), "30% 45%");
  });

  it("centers a photo that has no crop", () => {
    const layout = layoutCrop({
      containerWidth: 50,
      containerHeight: 50,
      imageWidth: 200,
      imageHeight: 100,
      crop: null,
    });
    assert.deepEqual(layout, { width: 100, height: 50, left: -25, top: 0 });
    covers(50, 50, layout);
  });

  it("fills a square frame with an off-center crop and still covers a tall frame", () => {
    const crop = { x: 0, y: 25, width: 25, height: 50, zoom: 2 };
    const square = layoutCrop({
      containerWidth: 40,
      containerHeight: 40,
      imageWidth: 400,
      imageHeight: 200,
      crop,
    });
    covers(40, 40, square);
    assert.equal(square.left, 0);
    assert.equal(square.top, -20);

    const tall = layoutCrop({
      containerWidth: 40,
      containerHeight: 80,
      imageWidth: 400,
      imageHeight: 200,
      crop,
    });
    covers(40, 80, tall);
    assert.ok(tall.height >= 80);
  });

  it("keeps a known crop on the physical left after the RTL plugin", () => {
    const crop = { x: 14.29, y: 14.29, width: 53.57, height: 71.43, zoom: 1.4 };
    const layout = layoutCrop({
      containerWidth: 300,
      containerHeight: 300,
      imageWidth: 400,
      imageHeight: 300,
      crop,
    });
    assert.ok(Math.abs(layout.left + 80) < 0.05, layout.left);

    const css = flipped(photoFrameDeclarations(layout));
    const offset = translateX(css);
    assert.ok(offset.length > 0, css);
    assert.ok(offset.every((value) => Math.abs(value - layout.left) < 0.001), css);
    assert.match(css, /left:0/);
    assert.doesNotMatch(css, /right:/);

    const mirrored = flipped(photoFrameDeclarations(layout).replaceAll("/* @noflip */", ""));
    assert.match(mirrored, /right:0/);
    assert.ok(translateX(mirrored).every((value) => Math.abs(value + layout.left) < 0.001), mirrored);
  });

  it("does not flip the object-position fallback", () => {
    const crop = { x: 14.29, y: 14.29, width: 53.57, height: 71.43, zoom: 1.4 };
    const position = focalPosition(crop);
    const css = flipped(photoCoverDeclarations(position));
    assert.equal(css.includes(`object-position:${position}`), true, css);
    assert.equal(css.includes("direction:ltr"), true, css);
    assert.equal(css.includes("direction:rtl"), false, css);

    const keyword = flipped(photoCoverDeclarations("left center"));
    assert.equal(keyword.includes("object-position:left center"), true, keyword);
    assert.equal(keyword.includes("object-position:right"), false, keyword);
  });
});
