import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { focalPosition, layoutCrop, readPhotoCrop, roundCrop } from "./photoCrop.js";

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
});
