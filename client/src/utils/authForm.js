const PASSWORD_TOO_LONG = "הסיסמה ארוכה מדי. אפשר עד 72 בתים";
const PASSWORD_INVALID = "הסיסמה אינה תקינה";
const SERVER_UNREACHABLE = "לא הצלחנו להתחבר לשרת. ודאו שהשרת פועל ונסו שוב.";

const textEncoder = new TextEncoder();

export const normalizeEmail = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export const emailError = (value) => {
  const email = normalizeEmail(value);
  if (!email) return "אימייל הוא שדה חובה";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "הזן כתובת אימייל תקינה";
  }
  return null;
};

// Empty is the only strength rule. bcrypt cannot store more than 72 bytes.
export const passwordError = (password, emptyMessage = "יש להזין סיסמה") => {
  if (typeof password !== "string" || password.length === 0) return emptyMessage;
  if (password.includes("\0")) return PASSWORD_INVALID;
  if (textEncoder.encode(password).length > 72) return PASSWORD_TOO_LONG;
  return null;
};

export const destinationAfterLogin = ({ role, hasProfile, hasPreferences }) => {
  if (role === "admin") return "/admin";
  if (!hasProfile) return "/profile";
  if (!hasPreferences) return "/preferences";
  return "/personal-area";
};

export const authErrorMessage = (error, fallback = "אירעה שגיאה. נסו שוב.") => {
  if (!error?.response) return SERVER_UNREACHABLE;
  const serverMessage = error.response.data?.message;
  if (typeof serverMessage === "string" && serverMessage.trim()) return serverMessage.trim();
  if (error.response.status === 401) return "אימייל או סיסמה שגויים";
  if (error.response.status === 409) {
    return "לא ניתן להירשם עם הפרטים האלה. אם כבר יש לך חשבון, יש להתחבר.";
  }
  if (error.response.status === 429) return "יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.";
  if (error.response.status >= 500) return "אירעה שגיאה בשרת. נסו שוב מאוחר יותר.";
  return fallback;
};

export { PASSWORD_TOO_LONG, PASSWORD_INVALID, SERVER_UNREACHABLE };
