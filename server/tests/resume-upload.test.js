process.env.JWT_SECRET = "test-jwt-secret-with-enough-length";
process.env.CLOUDINARY_URL = "cloudinary://123456789012345:abcdefghijklmnopqr@testcloud";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");

const { profileUpload, MAX_FILE_SIZE_MB } = require("../src/middleware/upload.middleware");
const { errorHandler } = require("../src/middleware/error.middleware");
const { contentTypeForDelivery } = require("../src/services/file.service");
const { createShortLivedReadUrl } = require("../src/services/storage.service");

const PDF_ERROR = "יש להעלות קובץ PDF";
const IMAGE_ERROR = "יש להעלות תמונה מסוג JPG, PNG, GIF או WEBP";

const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

const uploadApp = () => {
  const app = express();
  app.post(
    "/upload",
    ...profileUpload,
    (req, res) => {
      res.status(200).json({
        resume: req.files?.resumePdf?.[0]?.mimetype || null,
        image: req.files?.image?.[0]?.mimetype || null,
        resumeSize: req.files?.resumePdf?.[0]?.size || null,
      });
    }
  );
  app.use(errorHandler);
  return app;
};

const attach = (app, field, buffer, filename, contentType) =>
  request(app).post("/upload").attach(field, buffer, { filename, contentType });

describe("resume upload file filter", () => {
  const app = uploadApp();

  it("accepts a PDF resume and still accepts a profile image", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("resumePdf", pdf, { filename: "cv.pdf", contentType: "application/pdf" })
      .attach("image", jpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.resume, "application/pdf");
    assert.equal(response.body.image, "image/jpeg");
    assert.equal(response.body.resumeSize, pdf.length);
  });

  it("rejects a resume that is not a PDF", async () => {
    const cases = [
      ["notes.txt", "text/plain", Buffer.from("hello resume")],
      ["photo.jpg", "image/jpeg", jpeg],
      ["photo.png", "image/png", png],
      ["page.html", "text/html", Buffer.from("<html></html>")],
      ["cv.doc", "application/msword", Buffer.from("not a pdf")],
    ];

    for (const [filename, contentType, buffer] of cases) {
      const response = await attach(app, "resumePdf", buffer, filename, contentType);
      assert.equal(response.status, 400, `${filename} ${JSON.stringify(response.body)}`);
      assert.equal(response.body.message, PDF_ERROR);
    }
  });

  it("rejects a file labeled as PDF when the bytes are not a PDF", async () => {
    const response = await attach(app, "resumePdf", Buffer.from("this is not a pdf"), "cv.pdf", "application/pdf");
    assert.equal(response.status, 400);
    assert.equal(response.body.message, PDF_ERROR);
  });

  it("rejects a profile image that is not an allowed image type", async () => {
    const response = await attach(app, "image", pdf, "photo.pdf", "application/pdf");
    assert.equal(response.status, 400);
    assert.equal(response.body.message, IMAGE_ERROR);
  });

  it("rejects a resume larger than the existing size limit", async () => {
    const tooBig = Buffer.alloc(MAX_FILE_SIZE_MB * 1024 * 1024 + 1);
    pdf.copy(tooBig);
    const response = await attach(app, "resumePdf", tooBig, "big.pdf", "application/pdf");
    assert.equal(response.status, 413);
    assert.match(response.body.message, new RegExp(`${MAX_FILE_SIZE_MB}MB`));
  });
});

describe("resume delivery", () => {
  it("stores a resume as a raw Cloudinary file and a photo as an image", () => {
    const resume = new URL(createShortLivedReadUrl("resumePdf", "smartmatch/resumes/cv.pdf").url);
    const photo = new URL(createShortLivedReadUrl("image", "smartmatch/images/photo").url);

    assert.match(resume.pathname, /\/raw\/download$/);
    assert.equal(resume.searchParams.get("format"), "pdf");
    assert.equal(resume.searchParams.get("type"), "authenticated");
    assert.match(photo.pathname, /\/image\/download$/);
    assert.equal(photo.searchParams.get("type"), "authenticated");
  });

  it("serves PDF bytes as application/pdf and leaves an image resume type alone", () => {
    assert.equal(contentTypeForDelivery("resumePdf", "application/octet-stream", pdf), "application/pdf");
    assert.equal(contentTypeForDelivery("resumePdf", "", pdf), "application/pdf");
    assert.equal(contentTypeForDelivery("resumePdf", "application/pdf; charset=binary", pdf), "application/pdf");
    assert.equal(contentTypeForDelivery("resumePdf", "image/jpeg", jpeg), "image/jpeg");
    assert.equal(contentTypeForDelivery("image", "image/png", png), "image/png");
    assert.equal(contentTypeForDelivery("image", "", jpeg), "image/jpeg");
  });
});
