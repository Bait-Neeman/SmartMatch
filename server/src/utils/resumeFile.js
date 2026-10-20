const zlib = require("zlib");

// Resume files are recognized from their bytes. The browser's declared type is not trusted.
const RESUME_TYPES = {
  pdf: {
    contentType: "application/pdf",
    extension: ".pdf",
    filename: "resume.pdf",
    disposition: "inline",
  },
  doc: {
    contentType: "application/msword",
    extension: ".doc",
    filename: "resume.doc",
    disposition: "attachment",
  },
  docx: {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: ".docx",
    filename: "resume.docx",
    disposition: "attachment",
  },
  odt: {
    contentType: "application/vnd.oasis.opendocument.text",
    extension: ".odt",
    filename: "resume.odt",
    disposition: "attachment",
  },
  rtf: {
    contentType: "application/rtf",
    extension: ".rtf",
    filename: "resume.rtf",
    disposition: "attachment",
  },
  txt: {
    contentType: "text/plain",
    extension: ".txt",
    filename: "resume.txt",
    disposition: "attachment",
  },
  jpeg: {
    contentType: "image/jpeg",
    extension: ".jpg",
    filename: "resume.jpg",
    disposition: "inline",
  },
  png: {
    contentType: "image/png",
    extension: ".png",
    filename: "resume.png",
    disposition: "inline",
  },
  webp: {
    contentType: "image/webp",
    extension: ".webp",
    filename: "resume.webp",
    disposition: "inline",
  },
  heic: {
    contentType: "image/heic",
    extension: ".heic",
    filename: "resume.heic",
    disposition: "inline",
  },
};

const startsWith = (buffer, text) =>
  buffer.length >= text.length && buffer.subarray(0, text.length).toString("latin1") === text;

const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "heif", "mif1", "msf1"];

const isHeic = (buffer) => {
  if (buffer.length < 12 || buffer.toString("latin1", 4, 8) !== "ftyp") return false;
  const brand = buffer.toString("latin1", 8, 12).toLowerCase();
  if (HEIC_BRANDS.includes(brand)) return true;
  const boxSize = buffer.readUInt32BE(0);
  const end = Math.min(buffer.length, Number.isFinite(boxSize) && boxSize > 16 ? boxSize : 32);
  const compatible = buffer.toString("latin1", 16, end).toLowerCase();
  return HEIC_BRANDS.some((item) => compatible.includes(item));
};

const isOleDoc = (buffer) =>
  buffer.length >= 4 && buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0;

const isExecutableOrScript = (buffer) => {
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) return true;
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer.toString("latin1", 1, 4) === "ELF") return true;
  if (buffer.length >= 4) {
    const magic = buffer.readUInt32BE(0);
    if (magic === 0xfeedface || magic === 0xfeedfacf || magic === 0xcafebabe || magic === 0xcafed00d) return true;
  }
  const head = buffer
    .subarray(0, Math.min(buffer.length, 120))
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart()
    .toLowerCase();
  if (head.startsWith("#!")) return true;
  if (head.startsWith("<?php")) return true;
  if (head.startsWith("<html") || head.startsWith("<!doctype") || head.startsWith("<script") || head.startsWith("<svg")) {
    return true;
  }
  return false;
};

const isForeignArchive = (buffer) => {
  if (buffer.length >= 4 && buffer.toString("latin1", 0, 4) === "Rar!") return true;
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x37 &&
    buffer[1] === 0x7a &&
    buffer[2] === 0xbc &&
    buffer[3] === 0xaf &&
    buffer[4] === 0x27 &&
    buffer[5] === 0x1c
  ) {
    return true;
  }
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) return true;
  if (startsWith(buffer, "BZh")) return true;
  if (startsWith(buffer, "PK") && !startsWith(buffer, "PK\x03\x04")) return true;
  return false;
};

const entryData = (buffer, dataStart, method, size) => {
  if (size <= 0 || dataStart + size > buffer.length) return null;
  const slice = buffer.subarray(dataStart, dataStart + size);
  if (method === 0) return slice;
  if (method === 8 && size <= 256) {
    try {
      return zlib.inflateRawSync(slice);
    } catch {
      return null;
    }
  }
  return null;
};

const readLocalEntries = (buffer) => {
  const entries = [];
  let offset = 0;
  while (offset + 30 <= buffer.length && entries.length < 80) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLen;
    if (nameEnd > buffer.length) break;
    const name = buffer.toString("utf8", nameStart, nameEnd);
    const dataStart = nameEnd + extraLen;
    if (dataStart > buffer.length) break;
    const data = flags & 0x08 && size === 0 ? null : entryData(buffer, dataStart, method, size);
    entries.push({ name, data });
    if (flags & 0x08 && size === 0) break;
    const next = dataStart + size;
    if (next <= offset) break;
    offset = next;
  }
  return entries;
};

const readCentralEntries = (buffer) => {
  const tail = Math.min(buffer.length, 22 + 65535);
  let eocd = -1;
  for (let index = buffer.length - 22; index >= buffer.length - tail; index -= 1) {
    if (index < 0) break;
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) return [];

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];
  for (let index = 0; index < count && index < 80 && offset + 46 <= buffer.length; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLen);
    let data = null;
    if (localOffset + 30 <= buffer.length && buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLen = buffer.readUInt16LE(localOffset + 26);
      const localExtraLen = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLen + localExtraLen;
      data = entryData(buffer, dataStart, method, size);
    }
    entries.push({ name, data });
    const next = offset + 46 + nameLen + extraLen + commentLen;
    if (next <= offset) break;
    offset = next;
  }
  return entries;
};

const zipEntries = (buffer) => {
  const central = readCentralEntries(buffer);
  return central.length ? central : readLocalEntries(buffer);
};

const classifyZip = (buffer) => {
  try {
    const entries = zipEntries(buffer);
    if (!entries.length) return null;
    const names = entries.map((entry) => entry.name.replace(/\\/g, "/"));
    if (names.some((name) => name === "word/document.xml" || name.startsWith("word/"))) return "docx";
    const mime = entries.find((entry) => entry.name.replace(/\\/g, "/") === "mimetype");
    const mimeText = mime?.data ? mime.data.toString("utf8") : "";
    if (mimeText.startsWith("application/vnd.oasis.opendocument.text")) return "odt";
    return null;
  } catch {
    return null;
  }
};

const isPlainText = (buffer) => {
  if (!buffer.length) return false;
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) return true;
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) return true;
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return isPlainText(buffer.subarray(3));
  }
  const sample = buffer.subarray(0, Math.min(buffer.length, 8192));
  for (const byte of sample) {
    if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) return false;
  }
  return true;
};

const detectResumeType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  if (isExecutableOrScript(buffer) || isForeignArchive(buffer)) return null;
  if (startsWith(buffer, "%PDF-")) return "pdf";
  if (isOleDoc(buffer)) return "doc";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("latin1", 0, 4) === "RIFF" &&
    buffer.toString("latin1", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  if (isHeic(buffer)) return "heic";
  if (startsWith(buffer, "{\\rtf") || buffer.subarray(0, 5).toString("latin1").toLowerCase() === "{\\rtf") return "rtf";
  if (startsWith(buffer, "PK\x03\x04")) return classifyZip(buffer);
  if (startsWith(buffer, "GIF87a") || startsWith(buffer, "GIF89a")) return null;
  if (isPlainText(buffer)) return "txt";
  return null;
};

const describeResume = (buffer) => {
  const kind = detectResumeType(buffer);
  if (!kind) return null;
  return { kind, ...RESUME_TYPES[kind] };
};

const resumeExtension = (buffer) => describeResume(buffer)?.extension || "";

const contentDispositionHeader = (disposition, filename) => {
  const safe = String(filename || "resume").replace(/["\\\r\n]/g, "");
  const kind = disposition === "attachment" ? "attachment" : "inline";
  return `${kind}; filename="${safe}"`;
};

module.exports = {
  RESUME_TYPES,
  detectResumeType,
  describeResume,
  resumeExtension,
  contentDispositionHeader,
};
