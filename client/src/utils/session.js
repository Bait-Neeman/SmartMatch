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

// Where a logged-in user lands
export const homePathFor = (session) => (session.isAdmin ? "/admin" : "/personal-area");

export const clearSession = () => {
  SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
};

// A full page load afterwards, so nothing of the previous user stays in memory
export const logout = () => {
  clearSession();
  window.location.assign("/login");
};
