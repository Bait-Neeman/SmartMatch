import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Box, Button, CircularProgress, Paper, Switch, TextField, Typography } from "@mui/material";
import {
  FolderOutlined,
  GroupsOutlined,
  LockOutlined,
  MailOutlined,
  NotificationsNone,
  PersonOutlined,
  PlaceOutlined,
} from "@mui/icons-material";
import { brand } from "../theme/tokens.js";
import { getSession } from "../utils/session.js";
import { passwordError } from "../utils/authForm.js";
import {
  fetchAdminSettings,
  saveAdminAccount,
  saveAdminSettings,
  selectAdminAccount,
  selectAdminSettings,
  selectAdminSettingsError,
  selectAdminSettingsLoading,
  selectAdminTeam,
} from "../store/slices/adminSlice.js";
import AdminHeading from "../components/admin/AdminHeading.jsx";
import AddMatchmakerDialog from "../components/admin/AddMatchmakerDialog.jsx";
import StatusPill from "../components/common/StatusPill.jsx";
import { CASE_STATUS } from "../components/admin/format.js";
import { createAdminMatchmaker } from "../services/admin.service.js";
import { pendingCopy } from "../copy/pendingCopy.js";

const TOGGLES = [
  {
    key: "notifyNewCase",
    title: "הצעה חדשה הועברה לטיפולך",
    detail: "כששני הצדדים העבירו לטיפול שדכן",
  },
  {
    key: "notifyOneSide",
    title: "צד אחד העביר לשדכן",
    detail: "כשצד אחד העביר וממתין לצד השני",
  },
  {
    key: "notifyNewRegistration",
    title: "נרשם/ה מועמד/ת חדש/ה",
    detail: "הרשמה חדשה למערכת",
  },
  {
    key: "dailySummary",
    title: "סיכום יומי במייל",
    detail: "רשימת תיקים פתוחים בכל בוקר",
  },
];

export default function AdminSettingsPage() {
  const dispatch = useDispatch();
  const settings = useSelector(selectAdminSettings);
  const account = useSelector(selectAdminAccount);
  const team = useSelector(selectAdminTeam);
  const loading = useSelector(selectAdminSettingsLoading);
  const error = useSelector(selectAdminSettingsError);
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState("");
  const form = draft || {
    name: account?.name || "",
    email: account?.email || "",
    activityArea: account?.activityArea || "",
    password: "",
    currentPassword: "",
  };

  useEffect(() => {
    dispatch(fetchAdminSettings());
  }, [dispatch]);

  const toggle = (key) => {
    if (!settings) return;
    dispatch(saveAdminSettings({ [key]: !settings[key] })).unwrap().catch(() => {});
  };

  const saveAccount = async () => {
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        name: form.name,
        email: form.email,
        activityArea: form.activityArea,
      };
      if (form.password) {
        const passwordProblem = passwordError(form.password);
        if (passwordProblem) {
          setMessage(passwordProblem);
          setSaving(false);
          return;
        }
        payload.password = form.password;
      }
      if (form.currentPassword) payload.currentPassword = form.currentPassword;
      const saved = await dispatch(saveAdminAccount(payload)).unwrap();
      if (saved?.token) localStorage.setItem("token", saved.token);
      const stored = getSession().user;
      if (stored && saved?.account?.name) {
        localStorage.setItem("user", JSON.stringify({ ...stored, name: saved.account.name, email: saved.account.email }));
      }
      setDraft((current) => ({ ...(current || form), password: "", currentPassword: "" }));
      setMessage("הפרטים נשמרו");
    } catch (err) {
      setMessage(err?.message || "לא הצלחנו לשמור");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <AdminHeading title="הגדרות" subtitle="הגדרות שדכן ומערכת" />

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}
      {message ? (
        <Alert severity={message === "הפרטים נשמרו" ? "success" : "error"} sx={{ mb: 2 }}>
          {message}
        </Alert>
      ) : null}

      {loading && !settings ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 440px), 1fr))",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <Paper sx={{ p: "22px" }}>
            <SettingRow title={pendingCopy.hideFemalePhotos}>
              <Switch
                checked={Boolean(settings?.hideFemalePhotos)}
                onChange={() => toggle("hideFemalePhotos")}
                slotProps={{ input: { "aria-label": pendingCopy.hideFemalePhotos } }}
              />
            </SettingRow>
          </Paper>

          <Paper sx={{ p: "22px" }}>
            <CardTitle icon={<NotificationsNone />}>התראות לשדכן</CardTitle>
            {TOGGLES.map((item) => (
              <SettingRow key={item.key} title={item.title} detail={item.detail}>
                <Switch
                  checked={Boolean(settings?.[item.key])}
                  onChange={() => toggle(item.key)}
                  slotProps={{ input: { "aria-label": item.title } }}
                />
              </SettingRow>
            ))}
          </Paper>

          <Paper sx={{ p: "22px" }}>
            <CardTitle icon={<FolderOutlined />}>סטטוסים של תיק</CardTitle>
            <SettingRow title="שלבי טיפול" detail="הועבר לשדכן, תיאום, פגישה לפי מספר, ירד או התארסו">
              <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {Object.values(CASE_STATUS).map((item) => (
                  <StatusPill key={item.label} tone={item.tone} label={item.label} icon={<StatusIcon Icon={item.Icon} />} />
                ))}
              </Box>
            </SettingRow>
            <SettingRow title="סגירת תיק אוטומטית" detail="סימון 'השידוך ירד' לאחר 60 יום ללא עדכון">
              <Switch
                checked={Boolean(settings?.autoClose)}
                onChange={() => toggle("autoClose")}
                slotProps={{ input: { "aria-label": "סגירת תיק אוטומטית" } }}
              />
            </SettingRow>
            <SettingRow
              title="פרטי שני הצדדים"
              detail="שם, אימייל, טלפון, תמונה, רזומה וכל שדה בפרופיל ובהעדפות גלויים בכל שלב, כולל נדחו."
            >
              <Typography sx={{ color: brand.goldText, fontWeight: 600, fontSize: 14 }}>תמיד גלוי</Typography>
            </SettingRow>
          </Paper>

          <Paper sx={{ p: "22px" }}>
            <CardTitle icon={<PersonOutlined />}>פרופיל השדכן</CardTitle>
            <Field icon={<PersonOutlined />} label="שם" value={form.name} onChange={(name) => setDraft({ ...form, name })} />
            <Field icon={<MailOutlined />} label="אימייל" value={form.email} onChange={(email) => setDraft({ ...form, email })} />
            <Field
              icon={<LockOutlined />}
              label="סיסמה נוכחית"
              type="password"
              value={form.currentPassword}
              autoComplete="current-password"
              placeholder="נדרשת לשינוי אימייל או סיסמה"
              onChange={(currentPassword) => setDraft({ ...form, currentPassword })}
            />
            <Field
              icon={<LockOutlined />}
              label="סיסמה"
              type="password"
              value={form.password}
              autoComplete="new-password"
              placeholder="השארה ריקה לא משנה את הסיסמה"
              onChange={(password) => setDraft({ ...form, password })}
            />
            <Field
              icon={<PlaceOutlined />}
              label="אזור פעילות"
              value={form.activityArea}
              onChange={(activityArea) => setDraft({ ...form, activityArea })}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button variant="contained" size="small" disabled={saving} onClick={saveAccount}>
                שמירה
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ p: "22px" }}>
            <CardTitle icon={<GroupsOutlined />}>הרשאות וצוות</CardTitle>
            {team.length === 0 ? (
              <Typography sx={{ color: brand.mut }}>אין מנהלים להצגה</Typography>
            ) : (
              team.map((member) => {
                const matchmaker = member.staffKind === "matchmaker";
                return (
                  <SettingRow key={member._id} title={member.name} detail={member.subtitle || "מנהל מערכת"}>
                    <StatusPill tone={matchmaker ? "progress" : "pending"} label={matchmaker ? "שדכן/ית" : "מנהל"} />
                  </SettingRow>
                );
              })
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
              <Button variant="outlined" onClick={() => { setAddError(""); setAddOpen(true); }}>
                הוספת שדכן/ית
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      <AddMatchmakerDialog
        open={addOpen}
        error={addError}
        onClose={() => setAddOpen(false)}
        onSubmit={async (payload) => {
          setAddError("");
          try {
            await createAdminMatchmaker(payload);
            setAddOpen(false);
            dispatch(fetchAdminSettings());
          } catch (err) {
            setAddError(err?.message || "לא הצלחנו להוסיף שדכן");
          }
        }}
      />
    </Box>
  );
}

function StatusIcon({ Icon }) {
  return Icon ? <Icon /> : null;
}

function CardTitle({ icon, children }) {
  return (
    <Typography
      component="h3"
      sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 18, fontWeight: 600, color: brand.navy, mb: 1 }}
    >
      <Box sx={{ color: brand.goldDeep, display: "grid", "& svg": { fontSize: 20 } }}>{icon}</Box>
      {children}
    </Typography>
  );
}

function SettingRow({ title, detail, children }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        py: "13px",
        borderBottom: `1px solid ${brand.line}`,
        "&:last-of-type": { borderBottom: 0 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ display: "block", color: brand.navy, fontWeight: 600 }}>{title}</Typography>
        {detail ? <Typography sx={{ color: brand.mut, fontSize: 13 }}>{detail}</Typography> : null}
      </Box>
      {children}
    </Box>
  );
}

function Field({ icon, label, value, onChange, type = "text", placeholder, autoComplete }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr)", gap: 1.5, alignItems: "center", py: 1 }}>
      <Typography component="label" sx={{ display: "flex", alignItems: "center", gap: 0.75, color: brand.mut, fontSize: 15 }}>
        <Box sx={{ color: brand.goldDeep, display: "grid", "& svg": { fontSize: 18 } }}>{icon}</Box>
        {label}
      </Typography>
      <TextField
        value={value}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        variant="standard"
        onChange={(event) => onChange(event.target.value)}
        slotProps={{ input: { "aria-label": label } }}
      />
    </Box>
  );
}
