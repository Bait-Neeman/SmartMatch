import { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import {
  Check,
  Email,
  Lock,
  NotificationsNone,
  Person,
  Settings,
  Visibility,
} from "@mui/icons-material";
import { changePassword, deleteAccount, getSettings, updateSettings } from "../services/settings.service.js";
import { clearSession } from "../utils/session.js";
import { passwordError } from "../utils/authForm.js";
import { brand } from "../theme/tokens.js";

const NOTIFICATION_ROWS = [
  { key: "newSuggestion", title: "הצעה חדשה", detail: "כשנבחרת עבורך הצעה חדשה" },
  { key: "interestReceived", title: "התקבלה התעניינות", detail: "כשמישהו שולח אלייך התעניינות" },
  { key: "activeSuggestion", title: "הצעה פעילה חדשה", detail: "כשההתעניינות אושרה הדדית והפרטים נחשפו" },
  { key: "matchmakerRequest", title: "הצד השני מעוניין להתקדם לשדכן", detail: "כשהצד השני העביר לטיפול שדכן" },
  { key: "matchmakerStarted", title: "העברה לשדכן", detail: "כששני הצדדים העבירו והשדכן התחיל לטפל" },
  { key: "emailDigest", title: "עדכונים במייל", detail: "סיכום שבועי לכתובת המייל" },
];

const cardSx = { p: "clamp(16px, 1.6vw, 24px)" };

const rowSx = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 2,
  flexWrap: "wrap",
  py: "13px",
  borderBottom: `1px solid ${brand.line}`,
  "&:last-of-type": { borderBottom: 0 },
};

const fieldSx = {
  width: "100%",
  font: "inherit",
  fontWeight: 600,
  color: brand.navy,
  border: 0,
  borderBottom: `1px solid ${brand.inputLine}`,
  borderRadius: 0,
  background: "transparent",
  py: "6px",
  px: "2px",
  outline: "none",
  "&:focus": { borderBottomColor: brand.gold },
  "&::placeholder": { color: brand.mut, fontWeight: 500 },
};

function Toggle({ on, label, onToggle, disabled }) {
  return (
    <Box
      component="button"
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      sx={{
        flex: "none",
        width: 42,
        height: 24,
        p: 0,
        border: 0,
        borderRadius: 999,
        cursor: "pointer",
        position: "relative",
        background: on ? brand.navActive : brand.inputLine,
        "&:disabled": { opacity: 0.6 },
      }}
    >
      <Box
        component="i"
        sx={{
          position: "absolute",
          top: 3,
          insetInlineStart: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          bgcolor: brand.paper,
          boxShadow: `0 1px 3px ${brand.line}`,
        }}
      />
    </Box>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <Typography
      component="h2"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        m: 0,
        mb: 1,
        color: brand.navy,
        fontSize: 18,
        fontWeight: 600,
        letterSpacing: "-0.3px",
        "& .MuiSvgIcon-root": { fontSize: 20, color: brand.goldDeep },
      }}
    >
      {icon}
      {children}
    </Typography>
  );
}

function AccountField({ icon, label, children }) {
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "18px minmax(0, 1fr)", sm: "18px 130px minmax(0, 1fr)" },
        gap: 1.25,
        alignItems: "center",
      }}
    >
      {icon}
      <Typography component="span" sx={{ color: brand.mut }}>
        {label}
      </Typography>
      <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" }, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function SettingRow({ title, detail, control }) {
  return (
    <Box sx={rowSx}>
      <Box>
        <Typography component="b" sx={{ display: "block", color: brand.navy, fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography component="small" sx={{ display: "block", color: brand.mut, fontSize: 13 }}>
          {detail}
        </Typography>
      </Box>
      {control}
    </Box>
  );
}

const messageOf = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loadedEmail, setLoadedEmail] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("he");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toggles, setToggles] = useState({
    newSuggestion: true,
    interestReceived: true,
    activeSuggestion: true,
    matchmakerRequest: true,
    matchmakerStarted: true,
    emailDigest: false,
    pauseSuggestions: false,
  });

  useEffect(() => {
    let ignore = false;
    getSettings()
      .then((data) => {
        const settings = data?.settings;
        if (ignore || !settings) return;
        setEmail(settings.email || "");
        setLoadedEmail(settings.email || "");
        setPhone(settings.phone || "");
        setLanguage(settings.language || "he");
        setToggles((current) => ({
          ...current,
          ...settings.notifications,
          pauseSuggestions: settings.pauseSuggestions === true,
        }));
      })
      .catch((err) => {
        if (!ignore && err?.response?.status !== 401) setError(messageOf(err, "לא הצלחנו לטעון הגדרות"));
      });
    return () => {
      ignore = true;
    };
  }, []);

  const leaveAfterPasswordChange = () => {
    clearSession();
    navigate("/login", { replace: true, state: { notice: "הסיסמה עודכנה. יש להתחבר מחדש" } });
  };

  const flip = async (key) => {
    const next = !toggles[key];
    setToggles((current) => ({ ...current, [key]: next }));
    setError("");
    const payload = NOTIFICATION_ROWS.some((row) => row.key === key)
      ? { notifications: { [key]: next } }
      : { [key]: next };
    try {
      await updateSettings(payload);
    } catch (err) {
      setToggles((current) => ({ ...current, [key]: !next }));
      if (err?.response?.status === 401) return;
      setError(messageOf(err, "לא הצלחנו לשמור את ההגדרה"));
    }
  };

  const saveAccount = async () => {
    setError("");
    setNotice("");
    const emailChanged = email.trim().toLowerCase() !== (loadedEmail || "").toLowerCase();
    if (emailChanged && !currentPassword) {
      setError("כדי לשנות אימייל יש להזין את הסיסמה הנוכחית");
      return;
    }
    setBusy(true);
    try {
      const payload = { phone, language };
      if (emailChanged) {
        payload.email = email.trim();
        payload.currentPassword = currentPassword;
      }
      const data = await updateSettings(payload);
      const saved = data?.settings;
      setEmail(saved?.email || email.trim());
      setLoadedEmail(saved?.email || email.trim());
      setPhone(saved?.phone || "");
      setCurrentPassword("");
      setNotice("הפרטים נשמרו");
    } catch (err) {
      if (err?.response?.status === 401) return;
      setError(messageOf(err, "לא הצלחנו לשמור"));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setError("");
    setNotice("");
    if (!currentPassword || !newPassword) {
      setError("יש להזין סיסמה נוכחית וסיסמה חדשה");
      return;
    }
    const passwordProblem = passwordError(newPassword);
    if (passwordProblem && newPassword) {
      setError(passwordProblem);
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      leaveAfterPasswordChange();
    } catch (err) {
      if (err?.response?.status === 401) {
        leaveAfterPasswordChange();
        return;
      }
      setError(messageOf(err, "לא הצלחנו לשנות את הסיסמה"));
      setBusy(false);
    }
  };

  const removeAccount = async () => {
    setError("");
    if (!currentPassword) {
      setConfirmDelete(true);
      setError("יש להזין את הסיסמה הנוכחית כדי למחוק את החשבון");
      return;
    }
    setBusy(true);
    try {
      await deleteAccount({ currentPassword });
      clearSession();
      navigate("/login", { replace: true, state: { notice: "החשבון נמחק" } });
    } catch (err) {
      if (err?.response?.status === 401) return;
      setError(messageOf(err, "לא הצלחנו למחוק את החשבון"));
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography
        component="h1"
        sx={{
          m: 0,
          color: brand.navy,
          fontWeight: 600,
          letterSpacing: "-0.3px",
          fontSize: "clamp(22px, 1.9vw, 28px)",
          lineHeight: 1.1,
        }}
      >
        הגדרות
      </Typography>
      <Typography sx={{ mt: 0.75, mb: 2.25, color: brand.mut, fontSize: 17 }}>
        התראות, פרטיות וחשבון
      </Typography>

      {notice && (
        <Alert severity="success" sx={{ width: "fit-content", mb: 2 }} role="status">
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ width: "fit-content", mb: 2 }} role="alert">
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 440px), 1fr))",
          gap: 2.5,
          alignItems: "start",
        }}
      >
        <Card sx={cardSx}>
          <SectionTitle icon={<NotificationsNone />}>התראות</SectionTitle>
          {NOTIFICATION_ROWS.map((row) => (
            <SettingRow
              key={row.key}
              title={row.title}
              detail={row.detail}
              control={<Toggle on={Boolean(toggles[row.key])} label={row.title} onToggle={() => flip(row.key)} />}
            />
          ))}
        </Card>

        <Card sx={cardSx}>
          <SectionTitle icon={<Lock />}>פרטיות</SectionTitle>
          <SettingRow
            title="חשיפת תמונה ושם"
            detail="רק לאחר אישור התעניינות הדדי – ההגדרה קבועה ואינה ניתנת לשינוי"
            control={
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  minHeight: 30,
                  px: 1.5,
                  borderRadius: `${brand.radiusPill}px`,
                  fontSize: 13,
                  fontWeight: 600,
                  color: brand.pillGreenText,
                  bgcolor: brand.pillGreenBg,
                  boxShadow: `inset 0 0 0 1px ${brand.pillGreenLine}`,
                  whiteSpace: "nowrap",
                }}
              >
                <Check sx={{ fontSize: 14 }} />
                לאחר אישור הדדי
              </Box>
            }
          />
          <SettingRow
            title="השהיית קבלת הצעות"
            detail="הפרופיל לא יוצע לאחרים עד לביטול"
            control={<Toggle on={toggles.pauseSuggestions} label="השהיית קבלת הצעות" onToggle={() => flip("pauseSuggestions")} />}
          />
          <Button
            component={RouterLink}
            to="/statuses"
            startIcon={<Visibility />}
            sx={{ mt: 1, px: 0, minHeight: 0, color: brand.goldDark, fontWeight: 600, "&:hover": { bgcolor: "transparent" } }}
          >
            מקרא סטטוסים ומסלול ההצעה
          </Button>
        </Card>

        <Card sx={cardSx}>
          <SectionTitle icon={<Person />}>חשבון וסיסמה</SectionTitle>
          <Box component="ul" sx={{ listStyle: "none", m: "8px 0 4px", p: 0, display: "grid", rowGap: 1.5 }}>
            <AccountField icon={<Email sx={{ fontSize: 16, color: brand.gold }} />} label="אימייל">
              <Box
                component="input"
                type="email"
                dir="ltr"
                value={email}
                placeholder="name@example.com"
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                sx={fieldSx}
              />
            </AccountField>
            <AccountField icon={<Person sx={{ fontSize: 16, color: brand.gold }} />} label="טלפון">
              <Box
                component="input"
                type="tel"
                value={phone}
                placeholder="לא הוגדר"
                aria-label="טלפון"
                autoComplete="tel"
                onChange={(event) => setPhone(event.target.value)}
                sx={fieldSx}
              />
            </AccountField>
            <AccountField icon={<Lock sx={{ fontSize: 16, color: brand.gold }} />} label="סיסמה נוכחית">
              <Box
                component="input"
                type="password"
                value={currentPassword}
                placeholder="נדרשת לשינוי אימייל, סיסמה או מחיקה"
                autoComplete="current-password"
                aria-label="סיסמה נוכחית"
                onChange={(event) => setCurrentPassword(event.target.value)}
                sx={fieldSx}
              />
            </AccountField>
            <AccountField icon={<Lock sx={{ fontSize: 16, color: brand.gold }} />} label="סיסמה חדשה">
              <Box
                component="input"
                type="password"
                value={newPassword}
                autoComplete="new-password"
                aria-label="סיסמה חדשה"
                onChange={(event) => setNewPassword(event.target.value)}
                sx={fieldSx}
              />
            </AccountField>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 3.5, pt: 3, borderTop: `1px solid ${brand.line}` }}>
            <Button variant="contained" size="small" disabled={busy} onClick={saveAccount}>
              שמירה
            </Button>
            <Button variant="outlined" size="small" disabled={busy} onClick={savePassword}>
              שינוי סיסמה
            </Button>
          </Box>
        </Card>

        <Card sx={cardSx}>
          <SectionTitle icon={<Settings />}>שפה ותצוגה</SectionTitle>
          <SettingRow
            title="שפה"
            detail="שפת הממשק"
            control={
              <TextField
                select
                size="small"
                value={language}
                aria-label="שפה"
                onChange={(event) => setLanguage(event.target.value)}
                sx={{ width: 160, flex: "none" }}
              >
                <MenuItem value="he">עברית</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </TextField>
            }
          />
          <SettingRow
            title="מחיקת חשבון"
            detail="הסרה מלאה של הפרופיל והנתונים. נדרשת הסיסמה הנוכחית."
            control={
              <Button variant="outlined" size="small" disabled={busy} onClick={() => (confirmDelete ? removeAccount() : setConfirmDelete(true))}>
                {confirmDelete ? "אישור מחיקה" : "מחיקה"}
              </Button>
            }
          />
        </Card>
      </Box>
    </Box>
  );
}
