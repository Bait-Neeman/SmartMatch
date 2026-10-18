const nodemailer = require("nodemailer");

const isProduction = () => process.env.NODE_ENV === "production";

const isSmtpConfigured = () => {
  const host = (process.env.SMTP_HOST || "").trim();
  const from = (process.env.MAIL_FROM || "").trim();
  return Boolean(host && from);
};

// Tests pass a nodemailer-like object. The running server leaves this empty.
let transportOverride = null;

const setMailTransport = (transport) => {
  transportOverride = transport || null;
};

let cachedTransport = null;
let cachedKey = "";

const getTransport = () => {
  if (transportOverride) return transportOverride;

  const host = process.env.SMTP_HOST.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = (process.env.SMTP_USER || "").trim();
  const key = `${host}|${port}|${user}`;
  if (!cachedTransport || cachedKey !== key) {
    cachedKey = key;
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user ? { user, pass: process.env.SMTP_PASS || "" } : undefined,
    });
  }
  return cachedTransport;
};

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const buildMessage = (to, resetUrl) => {
  const text = [
    "שלום,",
    "",
    "קיבלנו בקשה לאיפוס הסיסמה בבית נאמן.",
    "",
    "כדי לבחור סיסמה חדשה יש להיכנס לקישור:",
    resetUrl,
    "",
    "הקישור תקף לשעה אחת, וניתן להשתמש בו פעם אחת בלבד.",
    "אם לא ביקשתם לאפס את הסיסמה, אפשר להתעלם מהודעה זו.",
    "",
    "בית נאמן",
  ].join("\n");

  const html = [
    '<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6">',
    "<p>שלום,</p>",
    "<p>קיבלנו בקשה לאיפוס הסיסמה בבית נאמן.</p>",
    `<p><a href="${escapeHtml(resetUrl)}">לבחירת סיסמה חדשה</a></p>`,
    "<p>הקישור תקף לשעה אחת, וניתן להשתמש בו פעם אחת בלבד.</p>",
    "<p>אם לא ביקשתם לאפס את הסיסמה, אפשר להתעלם מהודעה זו.</p>",
    "<p>בית נאמן</p>",
    "</div>",
  ].join("");

  return {
    from: process.env.MAIL_FROM,
    to,
    subject: "איפוס סיסמה · בית נאמן",
    text,
    html,
  };
};

// Never throws. A mail failure must not change the public reset response.
// The reset link is written to the console only outside production, and only
// when SMTP is not configured, so it can be tried locally.
const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  try {
    if (!resetUrl) {
      console.warn("CLIENT_URL is not set. Password reset email was not sent.");
      return;
    }

    if (!isSmtpConfigured()) {
      if (isProduction()) {
        console.warn("SMTP is not configured. Password reset email was not sent.");
        return;
      }
      console.info(`Password reset link (SMTP is not configured): ${resetUrl}`);
      return;
    }

    await getTransport().sendMail(buildMessage(to, resetUrl));
  } catch (error) {
    console.error("Failed to send password reset email:", error?.code || "unknown error");
  }
};

module.exports = {
  sendPasswordResetEmail,
  setMailTransport,
  isSmtpConfigured,
};
