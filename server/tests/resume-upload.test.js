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
const { describeResume, contentDispositionHeader } = require("../src/utils/resumeFile");

const RESUME_ERROR = "יש להעלות קובץ";
const IMAGE_ERROR = "יש להעלות תמונה מסוג JPG, PNG, GIF או WEBP";
const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const doc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const rtf = Buffer.from("{\\rtf1 hello}");
const text = Buffer.from("שלום\nresume text");
const heic = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from("ftypheic"), Buffer.alloc(12)]);
const exe = Buffer.concat([Buffer.from("MZ"), Buffer.alloc(16)]);

const storedZip = (files) => {
  const parts = [];
  for (const file of files) {
    const name = Buffer.from(file.name);
    const data = Buffer.from(file.data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0, 8);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    parts.push(header, name, data);
  }
  return Buffer.concat(parts);
};

const docx = storedZip([{ name: "word/document.xml", data: "<document/>" }]);
const odt = storedZip([{ name: "mimetype", data: "application/vnd.oasis.opendocument.text" }]);
const fakeDocx = storedZip([{ name: "readme.txt", data: "not a document" }]);

const uploadApp = () => {
  const app = express();
  app.post("/upload", ...profileUpload, (req, res) => {
    res.status(200).json({
      resume: req.files?.resumePdf?.[0]?.mimetype || null,
      image: req.files?.image?.[0]?.mimetype || null,
      resumeSize: req.files?.resumePdf?.[0]?.size || null,
    });
  });
  app.use(errorHandler);
  return app;
};

const attach = (app, field, buffer, filename, contentType) =>
  request(app).post("/upload").attach(field, buffer, { filename, contentType });

describe("resume upload file filter", () => {
  const app = uploadApp();

  it("accepts a docx resume and still accepts a profile image", async () => {
    const response = await request(app)
      .post("/upload")
      .attach("resumePdf", docx, { filename: "cv.docx", contentType: DOCX_TYPE })
      .attach("image", jpeg, { filename: "photo.jpg", contentType: "image/jpeg" });

    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.resume, DOCX_TYPE);
    assert.equal(response.body.image, "image/jpeg");
    assert.equal(response.body.resumeSize, docx.length);
  });

  it("accepts pdf, doc, odt, rtf, text, and image resumes from their bytes", async () => {
    const cases = [
      ["cv.pdf", "application/pdf", pdf],
      ["cv.doc", "application/msword", doc],
      ["cv.odt", "application/vnd.oasis.opendocument.text", odt],
      ["cv.rtf", "application/rtf", rtf],
      ["notes.txt", "text/plain", text],
      ["photo.png", "image/png", png],
      ["photo.heic", "image/heic", heic],
      ["cv.docx", "application/zip", docx],
    ];

    for (const [filename, contentType, buffer] of cases) {
      const response = await attach(app, "resumePdf", buffer, filename, contentType);
      assert.equal(response.status, 200, `${filename} ${JSON.stringify(response.body)}`);
    }
  });

  it("rejects a fake docx and other files that are not resumes", async () => {
    const cases = [
      ["cv.docx", DOCX_TYPE, fakeDocx],
      ["cv.pdf", "application/pdf", Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe])],
      ["run.exe", "application/pdf", exe],
      ["script.txt", "text/plain", Buffer.from("#!/bin/sh\necho hi")],
      ["page.txt", "text/plain", Buffer.from("<html><script>alert(1)</script></html>")],
      ["photo.gif", "image/gif", Buffer.from("GIF89a")],
      ["files.zip", "application/zip", fakeDocx],
    ];

    for (const [filename, contentType, buffer] of cases) {
      const response = await attach(app, "resumePdf", buffer, filename, contentType);
      assert.equal(response.status, 400, `${filename} ${JSON.stringify(response.body)}`);
      assert.equal(response.body.message, RESUME_ERROR);
    }
  });

  it("rejects text disguised as a pdf and a script extension without a shebang", async () => {
    const textAsPdf = await attach(app, "resumePdf", text, "cv.pdf", "application/pdf");
    assert.equal(textAsPdf.status, 400, JSON.stringify(textAsPdf.body));
    assert.equal(textAsPdf.body.message, RESUME_ERROR);

    const shell = await attach(app, "resumePdf", Buffer.from("echo hello\n"), "backup.sh", "text/plain");
    assert.equal(shell.status, 400, JSON.stringify(shell.body));
    assert.equal(shell.body.message, RESUME_ERROR);
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
  it("stores a resume as a raw file and keeps the extension", () => {
    const resume = new URL(createShortLivedReadUrl("resumePdf", "smartmatch/resumes/cv.docx").url);
    const photo = new URL(createShortLivedReadUrl("image", "smartmatch/images/photo").url);

    assert.match(resume.pathname, /\/raw\/download$/);
    assert.equal(resume.searchParams.get("format"), "docx");
    assert.equal(resume.searchParams.get("type"), "authenticated");
    assert.match(photo.pathname, /\/image\/download$/);
  });

  it("opens pdf and images inline and downloads other resumes with an extension", () => {
    const docxFile = describeResume(docx);
    const pdfFile = describeResume(pdf);
    const pngFile = describeResume(png);

    assert.equal(docxFile.contentType, DOCX_TYPE);
    assert.equal(docxFile.filename, "resume.docx");
    assert.equal(contentDispositionHeader(docxFile.disposition, docxFile.filename), 'attachment; filename="resume.docx"');
    assert.equal(contentDispositionHeader(pdfFile.disposition, pdfFile.filename), 'inline; filename="resume.pdf"');
    assert.equal(contentDispositionHeader(pngFile.disposition, pngFile.filename), 'inline; filename="resume.png"');
    assert.equal(contentTypeForDelivery("resumePdf", "application/octet-stream", docx), DOCX_TYPE);
    assert.equal(contentTypeForDelivery("resumePdf", "application/octet-stream", pdf), "application/pdf");
    assert.equal(contentTypeForDelivery("image", "", jpeg), "image/jpeg");
    assert.equal(describeResume(fakeDocx), null);
    assert.equal(describeResume(exe), null);
  });
});
