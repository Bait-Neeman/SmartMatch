import api from "../api/axios.js";
import { isAppFileUrl } from "./files.js";

const apiPath = (url) => (url.startsWith("/api/") ? url.slice(4) : url);

export const fetchFileBlob = async (url) => {
  const response = await api.get(apiPath(url), { responseType: "blob" });
  return response.data;
};

// Opens a profile file with the login token. The path itself does not expire.
// Plain https links open directly.
export const openProtectedFile = async (url) => {
  if (!url) return;
  if (!isAppFileUrl(url)) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const blob = await fetchFileBlob(url);
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, "_blank", "noopener,noreferrer");
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
