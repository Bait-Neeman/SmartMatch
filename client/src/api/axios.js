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

const isCredentialRequest = (url) => {
  const path = url || "";
  return path.includes("/auth/login") || path.includes("/auth/register") || path.includes("/auth/code-login");
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    // A stale token must not ride along on a fresh login or registration.
    if (token && !isCredentialRequest(config.url)) {
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
    if (!error.response) {
      error.message = "לא הצלחנו להתחבר לשרת. ודאו שהשרת פועל ונסו שוב.";
      return Promise.reject(error);
    }

    const serverMessage = error.response.data?.message || error.response.data?.error;
    if (typeof serverMessage === "string" && serverMessage.trim()) {
      error.message = serverMessage.trim();
    } else if (error.response.status === 401) {
      const sentToken = Boolean(error.config?.headers?.Authorization);
      error.message = sentToken
        ? "פג תוקף ההתחברות, יש להתחבר מחדש"
        : "אימייל או סיסמה שגויים";
    } else if (error.response.status === 429) {
      error.message = "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.";
    } else if (error.response.status >= 500) {
      error.message = "אירעה שגיאה בשרת. נסו שוב מאוחר יותר.";
    } else if (!error.message || /request failed with status code/i.test(error.message)) {
      error.message = "אירעה שגיאה. נסו שוב.";
    }

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