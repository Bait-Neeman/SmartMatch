import api from "../api/axios.js";
import { isAppFileUrl } from "./files.js";

const apiPath = (url) => (url.startsWith("/api/") ? url.slice(4) : url);

export const fetchFileBlob = async (url) => {
  const response = await api.get(apiPath(url), { responseType: "blob" });
  return response.data;
};

// Opens a profile file with the login token. The path itself does not expire.
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
