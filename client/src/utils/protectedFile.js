import api from "../api/axios.js";
import { isAppFileUrl } from "./files.js";

const apiPath = (url) => (url.startsWith("/api/") ? url.slice(4) : url);

const GENERIC_BLOB_TYPES = new Set(["", "application/octet-stream", "binary/octet-stream", "application/binary"]);

const isResumeUrl = (url) => typeof url === "string" && /\/resume\/?$/.test(url.split("?")[0]);

export const fetchFileBlob = async (url) => {
  const response = await api.get(apiPath(url), { responseType: "blob" });
  return response.data;
};

// A resume fetched without a PDF type still needs one, or the new tab will not show it.
const blobForView = (url, blob) => {
  const type = String(blob?.type || "").split(";")[0].trim().toLowerCase();
  if (isResumeUrl(url) && GENERIC_BLOB_TYPES.has(type)) {
    return new Blob([blob], { type: "application/pdf" });
  }
  return blob;
};

// Open the tab during the click. A later window.open is often blocked.
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

// Opens a profile file with the login token. The path itself does not expire.
// Plain https links open directly. Resumes open in a new tab, not as an image.
export const openProtectedFile = async (url) => {
  if (!url) return;
  if (!isAppFileUrl(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const tab = openBlankTab();
  try {
    const blob = blobForView(url, await fetchFileBlob(url));
    showInTab(tab, URL.createObjectURL(blob));
  } catch (error) {
    if (tab && !tab.closed) tab.close();
    throw error;
  }
};

// Saves a profile file. Protected paths are fetched with the login token first.
export const downloadProtectedFile = async (url, filename = "קורות חיים.pdf") => {
  if (!url) return;
  const link = document.createElement("a");
  link.download = filename;
  if (!isAppFileUrl(url)) {
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  const blob = await fetchFileBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
