import axios from "axios";
import { clearSession } from "../utils/session.js";

// Build a robust baseURL:
// - If VITE_API_URL is provided, ensure it ends with '/api' so requests map to server routes.
// - If not provided, default to '/api' so Vite dev proxy forwards '/api' to backend.
let base = import.meta.env.VITE_API_URL ?? "";
if (base) {
  // strip trailing slash
  base = base.replace(/\/$/, "");
  if (!base.endsWith("/api")) base = base + "/api";
} else {
  base = "/api";
}

const api = axios.create({
  baseURL: base,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      "שגיאה בפנייה לשרת";

    error.message = message;

    // The saved login is no longer valid (expired, or the user was removed): sign out
    const sentToken = Boolean(error?.config?.headers?.Authorization);
    if (error?.response?.status === 401 && sentToken) {
      clearSession();

      if (!["/login", "/register"].includes(window.location.pathname)) {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;