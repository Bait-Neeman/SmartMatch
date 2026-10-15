import { useEffect, useRef, useState } from "react";
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
import { getCurrentUser } from "../services/auth.service.js";
import { getSession } from "../utils/session.js";
import { brand } from "../theme/tokens.js";

const NOTIFICATION_ROWS = [
  { key: "newSuggestion", title: "הצעה חדשה", detail: "כשנבחרת עבורך הצעה חדשה", defaultOn: true },
  { key: "interestReceived", title: "התקבלה התעניינות", detail: "כשמישהו שולח אלייך התעניינות", defaultOn: true },
  { key: "activeSuggestion", title: "הצעה פעילה חדשה", detail: "כשההתעניינות אושרה הדדית והפרטים נחשפו", defaultOn: true },
  { key: "matchmakerRequest", title: "הצד השני מעוניין להתקדם לשדכן", detail: "כשהצד השני העביר לטיפול שדכן", defaultOn: true },
  { key: "matchmakerStarted", title: "העברה לשדכן", detail: "כששני הצדדים העבירו והשדכן התחיל לטפל", defaultOn: true },
  { key: "emailDigest", title: "עדכונים במייל", detail: "סיכום שבועי לכתובת המייל", defaultOn: false },
];

const UNAVAILABLE = "הפעולה הזו עדיין לא זמינה בחשבון.";

const initialToggles = () =>
  Object.fromEntries(NOTIFICATION_ROWS.map((row) => [row.key, row.defaultOn]));

const cardSx = {
  p: "clamp(16px, 1.6vw, 24px)",
};

const rowSx = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 2,
  flexWrap: "wrap",
  py: "13px",
  borderBottom: `1px solid ${brand.line}`,
  "&:last-of-type": {
    borderBottom: 0,
  },
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
  "&:focus": {
    borderBottomColor: brand.gold,
  },
  "&::placeholder": {
    color: brand.mut,
    fontWeight: 500,
  },
};

function Toggle({ on, label, onToggle }) {
  return (
    <Box
      component="button"
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
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
        "& .MuiSvgIcon-root": {
          fontSize: 20,
          color: brand.goldDeep,
        },
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

export default function SettingsPage() {
  const session = getSession();
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState(session.user?.email || "");
  const emailDirty = useRef(false);
  const [toggles, setToggles] = useState({
    ...initialToggles(),
    showMatchPercent: true,
    pauseSuggestions: false,
  });

  useEffect(() => {
    let ignore = false;

    getCurrentUser()
      .then((data) => {
        const user = data?.user;
        if (ignore || !user) return;
        if (user.email && !emailDirty.current) setEmail(user.email);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  const unavailable = () => setNotice(UNAVAILABLE);

  const flip = (key) => {
    setToggles((current) => ({ ...current, [key]: !current[key] }));
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
        <Alert severity="info" sx={{ width: "fit-content", mb: 2 }} role="status">
          {notice}
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
              control={<Toggle on={toggles[row.key]} label={row.title} onToggle={() => flip(row.key)} />}
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
            title="הצגת אחוז התאמה"
            detail="הצגת אחוז ההתאמה בכרטיסי ההצעות"
            control={
              <Toggle
                on={toggles.showMatchPercent}
                label="הצגת אחוז התאמה"
                onToggle={() => flip("showMatchPercent")}
              />
            }
          />
          <SettingRow
            title="השהיית קבלת הצעות"
            detail="הפרופיל לא יוצע לאחרים עד לביטול"
            control={
              <Toggle
                on={toggles.pauseSuggestions}
                label="השהיית קבלת הצעות"
                onToggle={() => flip("pauseSuggestions")}
              />
            }
          />
          <Button
            type="button"
            onClick={unavailable}
            startIcon={<Visibility />}
            sx={{
              mt: 1,
              px: 0,
              minHeight: 0,
              color: brand.goldDark,
              fontWeight: 600,
              "&:hover": { bgcolor: "transparent" },
            }}
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
                placeholder="לא הוגדר"
                autoComplete="email"
                onChange={(event) => {
                  emailDirty.current = true;
                  setEmail(event.target.value);
                }}
                sx={fieldSx}
              />
            </AccountField>
            <AccountField icon={<Lock sx={{ fontSize: 16, color: brand.gold }} />} label="סיסמה">
              <Box component="input" value="••••••••" readOnly tabIndex={-1} aria-label="סיסמה מוסתרת" sx={fieldSx} />
            </AccountField>
            <AccountField icon={<Person sx={{ fontSize: 16, color: brand.gold }} />} label="טלפון">
              <Box component="input" type="tel" value="" placeholder="לא הוגדר" readOnly aria-label="טלפון" sx={fieldSx} />
            </AccountField>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 3.5, pt: 3, borderTop: `1px solid ${brand.line}` }}>
            <Button variant="contained" size="small" onClick={unavailable}>
              שמירה
            </Button>
            <Button variant="outlined" size="small" onClick={unavailable}>
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
              <TextField select size="small" value="he" aria-label="שפה" sx={{ width: 160, flex: "none" }}>
                <MenuItem value="he">עברית</MenuItem>
              </TextField>
            }
          />
          <SettingRow
            title="מחיקת חשבון"
            detail="הסרה מלאה של הפרופיל והנתונים"
            control={
              <Button variant="outlined" size="small" onClick={unavailable}>
                מחיקה
              </Button>
            }
          />
        </Card>
      </Box>
    </Box>
  );
}
