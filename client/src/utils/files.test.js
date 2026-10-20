import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getResumeFileError, resumeOpensInline } from "./files.js";

const file = (name, type, size = 100) => ({ name, type, size });

describe("resume file check", () => {
  it("accepts documents and images, and rejects executables and archives", () => {
    assert.equal(getResumeFileError(file("cv.pdf", "application/pdf")), "");
    assert.equal(getResumeFileError(file("cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")), "");
    assert.equal(getResumeFileError(file("cv.doc", "application/msword")), "");
    assert.equal(getResumeFileError(file("cv.odt", "")), "");
    assert.equal(getResumeFileError(file("notes.txt", "text/plain")), "");
    assert.equal(getResumeFileError(file("photo.HEIC", "")), "");
    assert.equal(getResumeFileError(file("photo.png", "image/png")), "");
    assert.equal(getResumeFileError(file("run.exe", "")), "יש לבחור קובץ");
    assert.equal(getResumeFileError(file("page.html", "text/html")), "יש לבחור קובץ");
    assert.equal(getResumeFileError(file("files.zip", "application/zip")), "יש לבחור קובץ");
  });

  it("opens a pdf or image in a tab and downloads other resumes", () => {
    assert.equal(resumeOpensInline(file("cv.pdf", "application/pdf")), true);
    assert.equal(resumeOpensInline(file("photo.jpg", "image/jpeg")), true);
    assert.equal(resumeOpensInline(file("cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")), false);
    assert.equal(resumeOpensInline(file("letter.doc", "")), false);
  });
});
