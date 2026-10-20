import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { brand } from "../../theme/tokens.js";
import {
  appearanceOptions,
  ethnicityOptions,
  labelOf,
  maritalStatusOptions,
  roleLabel,
  styleOptions,
} from "../../constants/profileOptions.js";
import { ABOUT_ME_TITLE, EXCLUDE_INCOMPLETE_LABEL, lookingForTitle } from "../../utils/genderForms.js";
import { toSafeFileUrl } from "../../utils/files.js";
import { openProtectedFile } from "../../utils/protectedFile.js";
import { regenerateAdminAccessCode, resetAdminUserPassword } from "../../services/admin.service.js";
import { pendingCopy } from "../../copy/pendingCopy.js";
import AccessCodePanel from "../common/AccessCodePanel.jsx";
import AdminAvatar from "./AdminAvatar.jsx";
import { formatDotDate } from "./format.js";

const Row = ({ label, value }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "minmax(120px, 180px) minmax(0, 1fr)", gap: 1, py: 0.55 }}>
    <Typography sx={{ color: brand.mut, fontSize: 14 }}>{label}</Typography>
    <Typography sx={{ color: brand.navy, fontWeight: 600, fontSize: 15, wordBreak: "break-word" }}>
      {value == null || value === "" ? "—" : value}
    </Typography>
  </Box>
);

const yesNo = (value) => (value === true ? "כן" : value === false ? "לא" : "");

const nameList = (value) => (Array.isArray(value) ? value.filter(Boolean).join(", ") : value || "");

const choice = (options, value) => labelOf(options, value);

// A preference may be one stored value or a multi-select list.
const asList = (value) => (Array.isArray(value) ? value : value == null || value === "" ? [] : [value]);

const choiceList = (options, value) =>
  asList(value)
    .map((item) => labelOf(options, item))
    .filter(Boolean)
    .join(", ");

const textList = (value) =>
  asList(value)
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .join(", ");

const range = (min, max, unit = "") => {
  if (min == null && max == null) return "";
  const suffix = unit ? ` ${unit}` : "";
  if (min != null && max != null) return `${min}–${max}${suffix}`;
  if (min != null) return `מ-${min}${suffix}`;
  return `עד ${max}${suffix}`;
};

const passwordBytes = (value) => new TextEncoder().encode(value).length;

const Section = ({ title, children }) => (
  <Box>
    <Typography sx={{ fontWeight: 600, color: brand.navy, mb: 0.5 }}>{title}</Typography>
    {children}
  </Box>
);

export default function AdminProfileDialog({ open, onClose, data, loading }) {
  const user = data?.user;
  const profile = data?.profile;
  const preference = data?.preference;
  const accountGender = user?.gender === "female" || user?.gender === "male" ? user.gender : "";
  const gender = profile?.gender === "female" || profile?.gender === "male" ? profile.gender : accountGender;
  const female = gender === "female";
  const male = gender === "male";
  const image = toSafeFileUrl(profile?.image);
  const resume = toSafeFileUrl(profile?.resumePdf);
  const title = user?.name || "פרופיל";
  const userId = user?._id ? String(user._id) : "";
  const [resetOpen, setResetOpen] = useState(false);
  const [nextPassword, setNextPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetting, setResetting] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeBusy, setCodeBusy] = useState(false);
  const [seenUser, setSeenUser] = useState(userId);
  if (userId !== seenUser) {
    setSeenUser(userId);
    setAccessCode("");
    setCodeError("");
  }

  const closeReset = () => {
    setResetOpen(false);
    setNextPassword("");
    setCurrentPassword("");
    setResetError("");
    setResetSuccess("");
  };

  const submitReset = async () => {
    setResetError("");
    setResetSuccess("");
    if (!nextPassword) {
      setResetError("יש להזין סיסמה");
      return;
    }
    if (passwordBytes(nextPassword) > 72) {
      setResetError("הסיסמה ארוכה מדי");
      return;
    }
    if (!currentPassword) {
      setResetError("יש להזין את הסיסמה הנוכחית");
      return;
    }
    setResetting(true);
    try {
      await resetAdminUserPassword(userId, { password: nextPassword, currentPassword });
      setNextPassword("");
      setCurrentPassword("");
      setResetSuccess("הסיסמה עודכנה. ההתחברות הקיימת של המשתמש נותקה.");
    } catch (error) {
      setResetError(error?.message || "לא הצלחנו לעדכן את הסיסמה");
    } finally {
      setResetting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ color: brand.navy, fontWeight: 600 }}>{loading ? "פרופיל" : title}</DialogTitle>
      <DialogContent dividers>
        {loading || !data ? (
          <Typography sx={{ color: brand.mut, py: 2 }}>טוען פרופיל…</Typography>
        ) : (
          <Stack spacing={2.5}>
            <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start", flexWrap: "wrap" }}>
              <Box sx={{ width: { xs: "100%", sm: 220 }, height: 260, flex: "none" }}>
                <AdminAvatar image={image} gender={gender} size="100%" rounded="18px" ring />
              </Box>
              <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 24, lineHeight: 1.2 }}>
                  {user?.name || "—"}
                </Typography>
                <Typography sx={{ color: brand.mut, fontSize: 14, mb: 1.5 }}>{roleLabel(user?.role)}</Typography>
                <Section title="פרטי קשר">
                  <Row label="שם מלא" value={user?.name} />
                  <Row label="אימייל" value={user?.email} />
                  <Row label="טלפון" value={user?.phone} />
                </Section>
              </Box>
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 3,
              }}
            >
              <Section title="פרופיל">
                {gender ? (
                  <>
                    <Row label="עדה" value={choice(ethnicityOptions, profile?.ethnicity)} />
                    <Row label="גיל" value={profile?.age} />
                    <Row label="סטטוס" value={choice(maritalStatusOptions, profile?.maritalStatus)} />
                    {male ? <Row label="ישיבה" value={profile?.yeshiva} /> : null}
                    {female ? <Row label="סמינר" value={profile?.seminar} /> : null}
                    {female ? <Row label="מקצוע" value={profile?.occupation} /> : null}
                    {female ? <Row label="עובדת" value={yesNo(profile?.working)} /> : null}
                    {female ? <Row label="מקום עבודה" value={profile?.workplace} /> : null}
                    {female ? <Row label="עובדת במקצוע שלמדתי" value={yesNo(profile?.workingInProfession)} /> : null}
                    <Row label="עיר" value={profile?.city} />
                    <Row label='גובה (בס"מ)' value={profile?.height} />
                    <Row label="סגנון" value={choice(styleOptions, profile?.style)} />
                    <Row label="מראה חיצוני" value={choice(appearanceOptions, profile?.appearance)} />
                    {male ? <Row label="דרישה כספית" value={profile?.financialDemand} /> : null}
                    <Row label="השתתפות כספית" value={profile?.financialParticipation} />
                    {female ? <Row label="דרישה כספית" value={profile?.financialDemand} /> : null}
                    <Row label={ABOUT_ME_TITLE} value={profile?.description} />
                    <Row label="גודל רזומה" value={profile?.resumeSize != null ? `${profile.resumeSize} בייט` : ""} />
                    <Row label="רזומה הועלה" value={profile?.resumeUploadedAt ? formatDotDate(profile.resumeUploadedAt) : ""} />
                  </>
                ) : (
                  <Typography sx={{ color: brand.mut, fontSize: 14 }}>אין פרופיל שמור</Typography>
                )}
              </Section>

              <Section title="העדפות">
                {gender ? (
                  <>
                    <Row label="גיל" value={range(preference?.ageMin, preference?.ageMax)} />
                    <Row label='גובה (בס"מ)' value={range(preference?.heightMin, preference?.heightMax)} />
                    <Row label="עיר" value={textList(preference?.city)} />
                    <Row label="סגנון" value={choiceList(styleOptions, preference?.style)} />
                    <Row label="מראה חיצוני" value={choiceList(appearanceOptions, preference?.preferredAppearance)} />
                    <Row label="סטטוס" value={choiceList(maritalStatusOptions, preference?.preferredMaritalStatus)} />
                    <Row label="עדה" value={choiceList(ethnicityOptions, preference?.preferredEthnicity)} />
                    {female ? <Row label="ישיבה" value={nameList(preference?.preferredYeshiva)} /> : null}
                    {male ? <Row label="סמינר" value={nameList(preference?.preferredSeminar)} /> : null}
                    {male ? <Row label="מקצוע" value={nameList(preference?.preferredOccupation)} /> : null}
                    {male ? <Row label="רק בחורה עובדת" value={yesNo(preference?.onlyWorking)} /> : null}
                    {male ? (
                      <Row label="רק בחורה שעובדת במקצוע שלמדה" value={yesNo(preference?.onlyWorkingInProfession)} />
                    ) : null}
                    <Row label={EXCLUDE_INCOMPLETE_LABEL} value={yesNo(preference?.excludeIncomplete)} />
                    <Row label={lookingForTitle(gender)} value={profile?.lookingFor} />
                  </>
                ) : (
                  <Typography sx={{ color: brand.mut, fontSize: 14 }}>—</Typography>
                )}
              </Section>
            </Box>

            {resume ? (
              <Button variant="outlined" onClick={() => openProtectedFile(resume)} sx={{ alignSelf: "flex-start" }}>
                צפייה ברזומה
              </Button>
            ) : null}

            {accessCode ? <AccessCodePanel code={accessCode} /> : null}
            {codeError ? <Alert severity="error">{codeError}</Alert> : null}

            {user?.createdBy?._id ? (
              <Typography sx={{ color: brand.mut, fontSize: 14, pt: 1, borderTop: `1px solid ${brand.line}` }}>
                {pendingCopy.addedBy} {user.createdBy.name || "—"}
              </Typography>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {userId && user?.credentialSetupRequired ? (
          <Button
            disabled={codeBusy}
            onClick={async () => {
              setCodeError("");
              setCodeBusy(true);
              try {
                const result = await regenerateAdminAccessCode(userId);
                setAccessCode(result?.accessCode || "");
              } catch (error) {
                setCodeError(error?.message || pendingCopy.regenerateCode);
              } finally {
                setCodeBusy(false);
              }
            }}
            sx={{ color: brand.goldDark, fontWeight: 600 }}
          >
            {pendingCopy.regenerateCode}
          </Button>
        ) : null}
        {userId ? (
          <Button
            onClick={() => {
              setResetError("");
              setResetSuccess("");
              setResetOpen(true);
            }}
            sx={{ color: brand.goldDark, fontWeight: 600 }}
          >
            איפוס סיסמה
          </Button>
        ) : null}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>סגירה</Button>
      </DialogActions>

      <Dialog open={resetOpen} onClose={resetting ? undefined : closeReset} maxWidth="xs" fullWidth>
        <DialogTitle>איפוס סיסמה</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: brand.mut, fontSize: 14, mb: 2 }}>
            {user?.name ? `סיסמה חדשה עבור ${user.name}. ` : ""}
            הסיסמה החדשה מחליפה את הקיימת ומנתקת את ההתחברות הפעילה.
          </Typography>
          {resetError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetError}
            </Alert>
          ) : null}
          {resetSuccess ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {resetSuccess}
            </Alert>
          ) : null}
          <Stack spacing={1.5}>
            <TextField
              label="סיסמה חדשה"
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              autoComplete="new-password"
              fullWidth
              disabled={resetting || Boolean(resetSuccess)}
            />
            <TextField
              label="הסיסמה שלך לאישור"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              fullWidth
              disabled={resetting || Boolean(resetSuccess)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeReset} disabled={resetting}>
            {resetSuccess ? "סגירה" : "ביטול"}
          </Button>
          {resetSuccess ? null : (
            <Button variant="contained" onClick={submitReset} disabled={resetting}>
              עדכון סיסמה
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
