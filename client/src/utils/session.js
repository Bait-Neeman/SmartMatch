// The logged-in user is kept in localStorage: token, user (JSON) and role.
const SESSION_KEYS = ["token", "user", "role", "onboarding"];

export const getSession = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    user = null;
  }

  return {
    token,
    role,
    user,
    isLoggedIn: Boolean(token),
    isAdmin: Boolean(token) && role === "admin",
  };
};

const ONBOARDING_PATHS = new Set(["/identity", "/profile", "/preferences"]);

export const identityComplete = (user) => {
  const name = typeof user?.name === "string" ? user.name.trim() : "";
  return name.length > 0 && (user?.gender === "male" || user?.gender === "female");
};

export const rememberUser = (patch) => {
  const current = getSession().user || {};
  localStorage.setItem("user", JSON.stringify({ ...current, ...patch }));
};

// A finished account lands on /home. A new account stays on onboarding until it is done.
export const pathForSession = (session, onboardingPath) => {
  if (session?.isAdmin) return "/admin";
  if (ONBOARDING_PATHS.has(onboardingPath)) return onboardingPath;
  return "/home";
};

export const homePathFor = (session) =>
  pathForSession(session, globalThis.localStorage?.getItem("onboarding"));

export const setOnboardingPath = (path) => {
  if (ONBOARDING_PATHS.has(path)) localStorage.setItem("onboarding", path);
  else localStorage.removeItem("onboarding");
};

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

// A full page load afterwards, so nothing of the previous user stays in memory
export const logout = () => {
  clearSession();
  window.location.assign("/login");
};
