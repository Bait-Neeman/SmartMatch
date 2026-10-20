import api from "../api/axios.js";
import { isAppFileUrl } from "./files.js";

const apiPath = (url) => (url.startsWith("/api/") ? url.slice(4) : url);

const mediaType = (value) => String(value || "").split(";")[0].trim().toLowerCase();

const EXTENSION_BY_TYPE = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.oasis.opendocument.text": "odt",
  "application/rtf": "rtf",
  "text/rtf": "rtf",
  "text/plain": "txt",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

const filenameFromDisposition = (value) => {
  const match = String(value || "").match(/filename="?([^";]+)"?/i);
  return match ? match[1] : "";
};

const namedFile = (filename, contentType) => {
  if (filename && /\.[a-z0-9]+$/i.test(filename)) return filename;
  const extension = EXTENSION_BY_TYPE[mediaType(contentType)];
  const base = filename || "קורות חיים";
  return extension ? `${base}.${extension}` : base;
};

const opensInline = (contentType, disposition) => {
  if (/attachment/i.test(disposition || "")) return false;
  const type = mediaType(contentType);
  return type === "application/pdf" || type.startsWith("image/");
};

export const fetchProtectedFile = async (url) => {
  const response = await api.get(apiPath(url), { responseType: "blob" });
  const headerType = mediaType(response.headers?.["content-type"]);
  const contentType = headerType || mediaType(response.data?.type);
  const disposition = String(response.headers?.["content-disposition"] || "");
  const filename = namedFile(filenameFromDisposition(disposition), contentType);
  const blob = contentType && response.data?.type !== contentType ? new Blob([response.data], { type: contentType }) : response.data;
  return { blob, contentType, disposition, filename };
};

export const fetchFileBlob = async (url) => {
  const file = await fetchProtectedFile(url);
  return file.blob;
};

const openBlankTab = () => {
  const tab = window.open("about:blank", "_blank");
  if (tab) {
    try {
      tab.opener = null;
    } catch {
      // The tab can still show the file when opener cannot be cleared.
    }
  }
  return tab;
};

const showInTab = (tab, objectUrl) => {
  if (tab && !tab.closed) {
    tab.location = objectUrl;
    return;
  }
  window.open(objectUrl, "_blank", "noopener,noreferrer");
};

const saveBlob = (blob, filename) => {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

// Opens a profile file with the login token. The path itself does not expire.
// Plain https links open directly. PDF and images open in a new tab; other resumes download.
export const openProtectedFile = async (url) => {
  if (!url) return;
  if (!isAppFileUrl(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const tab = openBlankTab();
  try {
    const file = await fetchProtectedFile(url);
    if (!opensInline(file.contentType, file.disposition)) {
      if (tab && !tab.closed) tab.close();
      saveBlob(file.blob, file.filename);
      return;
    }
    showInTab(tab, URL.createObjectURL(file.blob));
  } catch (error) {
    if (tab && !tab.closed) tab.close();
    throw error;
  }
};

// Saves a profile file. Protected paths are fetched with the login token first.
export const downloadProtectedFile = async (url, filename = "קורות חיים") => {
  if (!url) return;
  if (!isAppFileUrl(url)) {
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  const file = await fetchProtectedFile(url);
  saveBlob(file.blob, file.filename || filename);
};
