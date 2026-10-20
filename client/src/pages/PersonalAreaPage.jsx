import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit, Forum, HowToReg, PersonAdd, Tune } from "@mui/icons-material";
import {
  createProfile,
  getMyProfile,
  updateProfile,
} from "../services/profile.service.js";
import {
  createPreferences,
  getMyPreferences,
  updatePreferences,
} from "../services/preference.service.js";
import {
  getImageFileError,
  getPdfFileError,
  IMAGE_ACCEPT,
  isAppFileUrl,
  toSafeFileUrl,
} from "../utils/files.js";
import { downloadProtectedFile, openProtectedFile } from "../utils/protectedFile.js";
import {
  appearanceOptions,
  ethnicityOptions,
  genderOptions,
  labelOf,
  maritalStatusOptions,
  styleOptions,
} from "../constants/profileOptions.js";
import { getSession, rememberUser } from "../utils/session.js";
import { brand } from "../theme/tokens.js";
import PersonAvatar from "../components/common/PersonAvatar.jsx";
import GenderProfileFields from "../components/profile/GenderProfileFields.jsx";
import ExcludeIncomplete from "../components/profile/ExcludeIncomplete.jsx";
import InstitutionChecklist from "../components/profile/InstitutionChecklist.jsx";
import OptionChecklist from "../components/profile/OptionChecklist.jsx";
import RangePair from "../components/profile/RangePair.jsx";
import WorkFilters from "../components/profile/WorkFilters.jsx";
import useInstitutionLists from "../hooks/useInstitutionLists.js";
import {
  APPEARANCE_VALUES,
  asNameList,
  asOptionList,
  ETHNICITY_VALUES,
  institutionKey,
  MARITAL_VALUES,
  STYLE_VALUES,
  buildPreferenceFields,
  buildProfileFields,
  lookingForHelp,
  lookingForTitle,
  NO_CITY_PREFERENCE,
  NO_OCCUPATION_PREFERENCE,
  NO_SEMINAR_PREFERENCE,
  NO_YESHIVA_PREFERENCE,
  ABOUT_ME_TITLE,
} from "../utils/genderForms.js";
import ProtectedImage from "../components/common/ProtectedFile.jsx";
import StatusPill from "../components/common/StatusPill.jsx";
import { FormSkeleton } from "../components/common/PageSkeleton.jsx";

const toText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const labelsOf = (options, value) => {
  const selected = asOptionList(
    value,
    options.map((option) => option.value)
  );
  if (!selected.length) return "לא משנה";
  return selected.map((code) => labelOf(options, code)).join(", ");
};

const appendIfNotEmpty = (formData, key, value) => {
  if (value !== undefined && value !== null && value !== "") {
    formData.append(key, value);
  }
};

// "20 עד 28", "מ-20", "עד 28" or "" when no limit was set
// (words, not a dash: a dash between numbers is displayed reversed in right-to-left text)
const formatRange = (min, max, unit = "") => {
  const hasMin = min !== undefined && min !== null && min !== "";
  const hasMax = max !== undefined && max !== null && max !== "";
  if (hasMin && hasMax) return `${min} עד ${max}${unit}`;
  if (hasMin) return `מ-${min}${unit}`;
  if (hasMax) return `עד ${max}${unit}`;
  return "";
};

const FORM_SECTIONS = ["profile", "preferences"];

const PAGE_SUBTITLE = "הפרטים שיוצגו לצד השני. תמונה, שם ורזומה נחשפים רק לאחר אישור הדדי.";
const PHOTO_NOTE = "התמונה מוצגת לאחרים רק לאחר אישור התעניינות הדדי";

const descriptionBoxSx = {
  mt: 0.5,
  p: 2,
  minHeight: 120,
  borderRadius: `${brand.radius}px`,
  bgcolor: "background.paper",
  boxShadow: `inset 0 0 0 1px ${brand.inputLine}`,
  color: brand.ink2,
  lineHeight: 1.75,
  fontSize: "16px",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const cardSx = {
  p: { xs: 2, sm: 3 },
  borderRadius: `${brand.radiusCard}px`,
  border: `1px solid ${brand.line}`,
  boxShadow: brand.shadow,
  bgcolor: "background.paper",
};

const listSx = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "grid",
  rowGap: 1.5,
};

const fieldRowSx = {
  display: "grid",
  gridTemplateColumns: { xs: "18px minmax(0, 1fr)", sm: "18px 160px minmax(0, 360px)" },
  columnGap: 1.25,
  rowGap: 0.5,
  alignItems: "center",
};

const readValueSx = {
  borderBottom: `1px solid ${brand.fieldLine}`,
  minHeight: 34,
  display: "flex",
  alignItems: "center",
  py: "4px",
  px: "2px",
};

const photoFrameSx = {
  height: { xs: 280, lg: 360 },
  borderRadius: `${brand.radiusPhoto}px`,
  overflow: "hidden",
  boxShadow: brand.shadow,
  bgcolor: brand.avatar,
};

const photoImgSx = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const outlineGoldSx = {
  "&&": {
    color: brand.goldDark,
    borderColor: brand.gold,
    borderWidth: "1.5px",
  },
  "&&:hover": {
    color: brand.goldDark,
    borderColor: brand.goldDeep,
    backgroundColor: brand.pillGoldBg,
    borderWidth: "1.5px",
  },
};

const actionsSx = {
  display: "flex",
  gap: 1.5,
  flexWrap: "wrap",
  mt: 3.5,
  pt: 3,
  borderTop: `1px solid ${brand.line}`,
};

const blockTitleSx = {
  fontWeight: 600,
  fontSize: "1.0625rem",
  color: brand.navy,
  letterSpacing: "-0.3px",
  lineHeight: 1.3,
};

const ICONS = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  ruler: (
    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0zM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
  ),
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  spark: (
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
  ),
  school: <path d="M22 10 12 5 2 10l10 5zM6 12v5c3 3 9 3 12 0v-5" />,
  work: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />,
  refresh: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
};

function StrokeIcon({ name, size = 16 }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      sx={{ width: size, height: size, display: "block" }}
    >
      {ICONS[name]}
    </Box>
  );
}

function BlockTitle({ children, first = false }) {
  return (
    <Typography component="h3" sx={{ ...blockTitleSx, mt: first ? 0 : 2.75, mb: 1 }}>
      {children}
    </Typography>
  );
}

function FieldRow({ icon, label, required = false, children }) {
  return (
    <Box component="li" sx={fieldRowSx}>
      <Box sx={{ color: brand.gold, opacity: 0.75, display: "flex" }}>
        <StrokeIcon name={icon} />
      </Box>
      <Typography component="span" sx={{ color: "text.secondary", fontSize: "15.5px" }}>
        {label}
        {required ? (
          <Box component="span" sx={{ color: "error.main" }}>
            {" "}
            *
          </Box>
        ) : null}
      </Typography>
      <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" }, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function ReadValue({ value, pill = false, tone = "neutral" }) {
  return (
    <Box sx={readValueSx}>
      {value && pill ? (
        <StatusPill tone={tone}>{value}</StatusPill>
      ) : (
        <Typography
          sx={{
            fontWeight: value ? 600 : 400,
            color: value ? brand.navy : "text.disabled",
            fontSize: "15.5px",
            wordBreak: "break-word",
          }}
        >
          {value || "לא צוין"}
        </Typography>
      )}
    </Box>
  );
}

function FormActions({ submitting, saveLabel, onCancel }) {
  return (
    <Box sx={actionsSx}>
      <Button variant="contained" type="submit" disabled={submitting} sx={{ flex: { sm: 1 }, minWidth: 160 }}>
        {submitting ? "שומר..." : saveLabel}
      </Button>
      <Button variant="outlined" type="button" onClick={onCancel} disabled={submitting} sx={{ minWidth: 120 }}>
        ביטול
      </Button>
    </Box>
  );
}

function PhotoFrame({ src, alt, onOpen, gender }) {
  let picture = <PersonAvatar gender={gender} size="100%" sx={{ width: "100%", height: "100%", borderRadius: 0 }} />;
  if (src && isAppFileUrl(src)) {
    picture = <ProtectedImage url={src} alt={alt} sx={photoImgSx} />;
  } else if (src) {
    picture = <Box component="img" src={src} alt={alt} sx={photoImgSx} />;
  }

  const frame = <Box sx={photoFrameSx}>{picture}</Box>;
  if (!onOpen) return frame;

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onOpen(src)}
      aria-label="צפייה בתמונה"
      sx={{
        display: "block",
        width: "100%",
        p: 0,
        border: 0,
        bgcolor: "transparent",
        cursor: "pointer",
        borderRadius: `${brand.radiusPhoto}px`,
      }}
    >
      {frame}
    </Box>
  );
}

function ResumeThumb() {
  const line = { height: 3, borderRadius: "2px", bgcolor: brand.fieldLine };
  return (
    <Box
      aria-hidden
      sx={{
        width: 74,
        height: 96,
        flex: "none",
        borderRadius: "6px",
        bgcolor: "background.paper",
        border: `1px solid ${brand.line}`,
        boxShadow: brand.shadow,
        px: "9px",
        py: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <Box sx={{ height: 6, width: "60%", borderRadius: "2px", bgcolor: brand.navy, mb: "3px" }} />
      <Box sx={line} />
      <Box sx={{ ...line, width: "80%" }} />
      <Box sx={{ ...line, width: "40%", bgcolor: brand.goldMid, mt: "3px" }} />
      <Box sx={line} />
      <Box
        sx={{
          mt: "auto",
          alignSelf: "flex-end",
          fontSize: 8,
          fontWeight: 700,
          lineHeight: 1.4,
          color: "background.paper",
          bgcolor: "error.main",
          borderRadius: "3px",
          px: "4px",
        }}
      >
        PDF
      </Box>
    </Box>
  );
}

function ResumeBlock({ resumeUrl, pdfFile, editing, onPick, onEdit, onView, onDownload }) {
  const name = pdfFile?.name || (resumeUrl ? "קורות חיים.pdf" : "");

  const pickInput = (
    <input
      hidden
      type="file"
      accept="application/pdf"
      onChange={onPick}
    />
  );

  const replaceButton = editing ? (
    <Button component="label" variant="outlined" size="small" sx={outlineGoldSx} startIcon={<StrokeIcon name="refresh" />}>
      {resumeUrl || pdfFile ? "החלפה" : "העלאת קורות חיים (PDF)"}
      {pickInput}
    </Button>
  ) : (
    <Button type="button" variant="outlined" size="small" sx={outlineGoldSx} startIcon={<StrokeIcon name="refresh" />} onClick={onEdit}>
      {resumeUrl ? "החלפה" : "העלאת קורות חיים (PDF)"}
    </Button>
  );

  return (
    <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
      <BlockTitle>רזומה</BlockTitle>
      {name ? (
        <Box
          sx={{
            display: "flex",
            gap: 2.25,
            alignItems: "center",
            p: 1.75,
            border: `1px solid ${brand.line}`,
            borderRadius: "14px",
            bgcolor: "background.default",
            maxWidth: 560,
          }}
        >
          <ResumeThumb />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: "15px", wordBreak: "break-word" }}>
              {name}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
              {resumeUrl && (
                <Button type="button" variant="outlined" size="small" startIcon={<StrokeIcon name="eye" />} onClick={() => onView(resumeUrl)}>
                  צפייה
                </Button>
              )}
              {resumeUrl && (
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<StrokeIcon name="download" />}
                  onClick={() => onDownload(resumeUrl)}
                >
                  הורדה
                </Button>
              )}
              {replaceButton}
            </Stack>
          </Box>
        </Box>
      ) : (
        <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography component="div" color="text.disabled" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <StrokeIcon name="file" /> לא הועלה קובץ PDF
          </Typography>
          {replaceButton}
        </Stack>
      )}
    </Box>
  );
}

function profileSubtitle(profile) {
  if (!profile) return "";
  const parts = [];
  if (profile.age) {
    if (profile.gender === "female") parts.push(`בת ${profile.age}`);
    else if (profile.gender === "male") parts.push(`בן ${profile.age}`);
    else parts.push(`גיל ${profile.age}`);
  }
  if (profile.city) parts.push(profile.city);
  return parts.join(" · ");
}

function ProfileSummary({ profile }) {
  const female = profile?.gender === "female";
  const male = profile?.gender === "male";
  const height = profile?.height ? `${profile.height} ס"מ` : "";
  const workLabel = profile?.working === true ? "עובדת" : profile?.working === false ? "לא" : "";

  return (
    <>
      <Box component="ul" sx={listSx}>
        <FieldRow icon="user" label="מגדר">
          <ReadValue value={labelOf(genderOptions, profile?.gender)} pill />
        </FieldRow>
        <FieldRow icon="star" label="עדה">
          <ReadValue value={labelOf(ethnicityOptions, profile?.ethnicity)} pill tone="pending" />
        </FieldRow>
        <FieldRow icon="user" label="גיל">
          <ReadValue value={toText(profile?.age)} />
        </FieldRow>
        <FieldRow icon="user" label="סטטוס">
          <ReadValue value={labelOf(maritalStatusOptions, profile?.maritalStatus)} />
        </FieldRow>
        {male ? (
          <FieldRow icon="school" label="ישיבה">
            <ReadValue value={profile?.yeshiva} />
          </FieldRow>
        ) : null}
        {female ? (
          <FieldRow icon="school" label="סמינר">
            <ReadValue value={profile?.seminar} />
          </FieldRow>
        ) : null}
        {female ? (
          <FieldRow icon="work" label="מקצוע">
            <ReadValue value={profile?.occupation} />
          </FieldRow>
        ) : null}
        {female ? (
          <FieldRow icon="work" label="עבודה">
            <ReadValue value={workLabel} />
          </FieldRow>
        ) : null}
        {female && profile?.working ? (
          <FieldRow icon="work" label="מקום עבודה">
            <ReadValue value={profile?.workplace} />
          </FieldRow>
        ) : null}
        {female && profile?.working ? (
          <FieldRow icon="work" label="מקצוע נלמד">
            <ReadValue value={profile?.workingInProfession === true ? "עובדת במקצוע שלמדתי" : "לא"} />
          </FieldRow>
        ) : null}
        <FieldRow icon="pin" label="עיר">
          <ReadValue value={profile?.city} />
        </FieldRow>
        <FieldRow icon="phone" label="טלפון נייד ליצירת קשר">
          <Box dir="ltr" sx={{ textAlign: "right" }}>
            <ReadValue value={profile?.phone} />
          </Box>
        </FieldRow>
        <FieldRow icon="ruler" label='גובה (בס"מ)'>
          <ReadValue value={height} />
        </FieldRow>
        <FieldRow icon="sliders" label="סגנון">
          <ReadValue value={labelOf(styleOptions, profile?.style)} pill tone="pending" />
        </FieldRow>
        <FieldRow icon="spark" label="מראה חיצוני">
          <ReadValue value={labelOf(appearanceOptions, profile?.appearance)} pill />
        </FieldRow>
        {male ? (
          <FieldRow icon="sliders" label="דרישה כספית">
            <ReadValue value={toText(profile?.financialDemand)} />
          </FieldRow>
        ) : null}
        {male ? (
          <FieldRow icon="sliders" label="השתתפות כספית">
            <ReadValue value={toText(profile?.financialParticipation)} />
          </FieldRow>
        ) : null}
        {female ? (
          <FieldRow icon="sliders" label="השתתפות כספית">
            <ReadValue value={toText(profile?.financialParticipation)} />
          </FieldRow>
        ) : null}
        {female ? (
          <FieldRow icon="sliders" label="דרישה כספית">
            <ReadValue value={toText(profile?.financialDemand)} />
          </FieldRow>
        ) : null}
      </Box>
      {profile?.description ? (
        <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
          <BlockTitle>{ABOUT_ME_TITLE}</BlockTitle>
          <Box sx={descriptionBoxSx}>{profile.description}</Box>
        </Box>
      ) : null}
    </>
  );
}

function ProfileForm({
  control,
  cities,
  onSubmit,
  submitting,
  formError,
  fileError,
  onCancel,
  resumeUrl,
  pdfFile,
  onPickPdf,
  onViewFile,
  onDownloadFile,
}) {
  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <GenderProfileFields control={control} cities={cities} />

            <ResumeBlock
        resumeUrl={resumeUrl}
        pdfFile={pdfFile}
        editing
        onPick={onPickPdf}
        onView={onViewFile}
        onDownload={onDownloadFile}
      />

      {fileError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {fileError}
        </Alert>
      )}
      {formError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {formError}
        </Alert>
      )}
      <FormActions submitting={submitting} saveLabel="שמירת פרופיל" onCancel={onCancel} />
    </Box>
  );
}

function PreferencesSummary({ preferences, profile }) {
  const female = profile?.gender === "female";
  const male = profile?.gender === "male";
  const names = asNameList(female ? preferences?.preferredYeshiva : preferences?.preferredSeminar, institutionKey);
  const occupations = asNameList(preferences?.preferredOccupation);
  const cities = asNameList(preferences?.city);
  const schoolLabel = female ? "ישיבה" : "סמינר";
  const noneLabel = female ? NO_YESHIVA_PREFERENCE : NO_SEMINAR_PREFERENCE;
  const title = lookingForTitle(profile?.gender);

  return (
    <>
      <Box component="ul" sx={listSx}>
        <FieldRow icon="user" label="טווח גילאים">
          <ReadValue value={formatRange(preferences?.ageMin, preferences?.ageMax)} />
        </FieldRow>
        <FieldRow icon="ruler" label="טווח גובה">
          <ReadValue value={formatRange(preferences?.heightMin, preferences?.heightMax, ' ס"מ')} />
        </FieldRow>
        {male ? (
          <FieldRow icon="school" label={schoolLabel}>
            <ReadValue value={names.length ? names.join(", ") : noneLabel} />
          </FieldRow>
        ) : null}
        {male ? (
          <FieldRow icon="work" label="מקצוע">
            <ReadValue value={occupations.length ? occupations.join(", ") : NO_OCCUPATION_PREFERENCE} />
          </FieldRow>
        ) : null}
        {male && preferences?.onlyWorking ? (
          <FieldRow icon="work" label="עבודה">
            <ReadValue value="רק בחורה עובדת" />
          </FieldRow>
        ) : null}
        {male && preferences?.onlyWorkingInProfession ? (
          <FieldRow icon="work" label="מקצוע נלמד">
            <ReadValue value="רק בחורה שעובדת במקצוע שלמדה" />
          </FieldRow>
        ) : null}
        <FieldRow icon="user" label="סטטוס">
          <ReadValue value={labelsOf(maritalStatusOptions, preferences?.preferredMaritalStatus)} />
        </FieldRow>
        <FieldRow icon="sliders" label="סגנון">
          <ReadValue value={labelsOf(styleOptions, preferences?.style)} pill tone="pending" />
        </FieldRow>
        <FieldRow icon="spark" label="מראה חיצוני">
          <ReadValue value={labelsOf(appearanceOptions, preferences?.preferredAppearance)} pill />
        </FieldRow>
        <FieldRow icon="star" label="עדה">
          <ReadValue value={labelsOf(ethnicityOptions, preferences?.preferredEthnicity)} pill tone="pending" />
        </FieldRow>
        <FieldRow icon="pin" label="עיר">
          <ReadValue value={cities.length ? cities.join(", ") : NO_CITY_PREFERENCE} />
        </FieldRow>
        <FieldRow icon="sliders" label="הצעות בלי פרטים">
          <ReadValue value={preferences?.excludeIncomplete === true ? "לא יוצגו" : "מוצגות"} />
        </FieldRow>
        {female ? (
          <FieldRow icon="school" label={schoolLabel}>
            <ReadValue value={names.length ? names.join(", ") : noneLabel} />
          </FieldRow>
        ) : null}
      </Box>
      {profile?.lookingFor ? (
        <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
          <BlockTitle>{title}</BlockTitle>
          <Box sx={descriptionBoxSx}>{profile.lookingFor}</Box>
        </Box>
      ) : null}
    </>
  );
}

function PreferencesForm({
  control,
  setValue,
  gender,
  yeshivas,
  seminars,
  professions,
  cities,
  listError,
  onSubmit,
  submitting,
  formError,
  onCancel,
  profileExists,
}) {
  const male = gender === "male";
  const female = gender === "female";
  const title = lookingForTitle(gender);
  const help = lookingForHelp(gender);

  if (!male && !female) {
    return <Alert severity="info">יש ליצור פרופיל ולבחור מגדר לפני מילוי ההעדפות.</Alert>;
  }

  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Typography sx={{ color: "text.secondary", mb: 2 }}>
        שדה שנשאר ריק לא מגביל את ההתאמות. סטטוס מתחיל ברווק/ה.
      </Typography>
      <RangePair title="טווח גילאים" minName="ageMin" maxName="ageMax" minLabel="מגיל" maxLabel="עד גיל" control={control} />
      <RangePair
        title="טווח גובה"
        minName="heightMin"
        maxName="heightMax"
        minLabel='מגובה (ס"מ)'
        maxLabel='עד גובה (ס"מ)'
        control={control}
      />
      <Box component="ul" sx={{ ...listSx, rowGap: 1.5 }}>
        {male ? (
          <Controller
            name="preferredSeminar"
            control={control}
            render={({ field }) => (
              <Box component="li" sx={{ display: "block" }}>
                <InstitutionChecklist
                  label="סמינר"
                  noneLabel={NO_SEMINAR_PREFERENCE}
                  options={seminars}
                  institutions
                  value={field.value}
                  onChange={field.onChange}
                />
              </Box>
            )}
          />
        ) : null}
        {male ? (
          <Controller
            name="preferredOccupation"
            control={control}
            render={({ field }) => (
              <Box component="li" sx={{ display: "block" }}>
                <InstitutionChecklist
                  label="מקצוע"
                  noneLabel={NO_OCCUPATION_PREFERENCE}
                  options={professions}
                  value={field.value}
                  onChange={field.onChange}
                />
              </Box>
            )}
          />
        ) : null}
        {male ? (
          <Box component="li" sx={{ display: "block" }}>
            <WorkFilters control={control} setValue={setValue} />
          </Box>
        ) : null}
        <Controller
          name="preferredMaritalStatus"
          control={control}
          render={({ field }) => (
            <Box component="li" sx={{ display: "block" }}>
              <OptionChecklist label="סטטוס" options={maritalStatusOptions} value={field.value} onChange={field.onChange} />
            </Box>
          )}
        />
        <Controller
          name="style"
          control={control}
          render={({ field }) => (
            <Box component="li" sx={{ display: "block" }}>
              <OptionChecklist label="סגנון" options={styleOptions} value={field.value} onChange={field.onChange} />
            </Box>
          )}
        />
        <Controller
          name="preferredAppearance"
          control={control}
          render={({ field }) => (
            <Box component="li" sx={{ display: "block" }}>
              <OptionChecklist label="מראה חיצוני" options={appearanceOptions} value={field.value} onChange={field.onChange} />
            </Box>
          )}
        />
        <Controller
          name="preferredEthnicity"
          control={control}
          render={({ field }) => (
            <Box component="li" sx={{ display: "block" }}>
              <OptionChecklist label="עדה" options={ethnicityOptions} value={field.value} onChange={field.onChange} />
            </Box>
          )}
        />
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <Box component="li" sx={{ display: "block" }}>
              <InstitutionChecklist
                label="עיר"
                noneLabel={NO_CITY_PREFERENCE}
                options={cities}
                emptyHint="ערים חדשות יתווספו לרשימה אוטומטית"
                value={field.value}
                onChange={field.onChange}
              />
            </Box>
          )}
        />
        {female ? (
          <Controller
            name="preferredYeshiva"
            control={control}
            render={({ field }) => (
              <Box component="li" sx={{ display: "block" }}>
                <InstitutionChecklist
                  label="ישיבה"
                  noneLabel={NO_YESHIVA_PREFERENCE}
                  options={yeshivas}
                  institutions
                  value={field.value}
                  onChange={field.onChange}
                />
              </Box>
            )}
          />
        ) : null}
        <Box component="li" sx={{ display: "block" }}>
          <ExcludeIncomplete control={control} />
        </Box>
      </Box>
      <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
        <BlockTitle>{title}</BlockTitle>
        <Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.5, mb: 1 }}>{help}</Typography>
        <Controller
          name="lookingFor"
          control={control}
          rules={{ maxLength: { value: 1000, message: "הטקסט יכול להכיל עד 1000 תווים" } }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              hiddenLabel
              multiline
              minRows={4}
              fullWidth
              placeholder={title}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              slotProps={{ htmlInput: { "aria-label": title } }}
            />
          )}
        />
      </Box>
      {!profileExists ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {title} נשמר אחרי יצירת פרופיל.
        </Alert>
      ) : null}
      {listError ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {listError}
        </Alert>
      ) : null}
      {formError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {formError}
        </Alert>
      ) : null}
      <FormActions submitting={submitting} saveLabel="שמירת העדפות" onCancel={onCancel} />
    </Box>
  );
}

export default function PersonalAreaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, user, isAdmin } = getSession();
  const { yeshivas, seminars, professions, cities, error: listError } = useInstitutionLists();
  const canLoadData = !isAdmin && Boolean(token);

  const [profileExists, setProfileExists] = useState(false);
  const [preferencesExists, setPreferencesExists] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [preferencesData, setPreferencesData] = useState(null);

  // The open edit form ("profile" / "preferences"); ?edit=... in the address opens one directly
  const [openForm, setOpenForm] = useState(() => {
    const requested = searchParams.get("edit");
    return FORM_SECTIONS.includes(requested) ? requested : null;
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  const [loadingData, setLoadingData] = useState(canLoadData);
  const [submitting, setSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState(!isAdmin && !token ? "יש להתחבר כדי לצפות באזור האישי" : "");
  const [formError, setFormError] = useState("");
  const [fileError, setFileError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const profileFormRef = useRef(null);
  const preferencesFormRef = useRef(null);

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
  } = useForm({
    defaultValues: {
      fullName: getSession().user?.name || "",
      gender: getSession().user?.gender || "",
      ethnicity: "",
      age: "",
      city: "",
      height: "",
      style: "",
      appearance: "",
      financialRequirement: "",
      financialCapabilities: "",
      financialStatus: "",
      financialDemand: "",
      financialParticipation: "",
      maritalStatus: "",
      lookingFor: "",
      yeshiva: "",
      seminar: "",
      occupation: "",
      working: false,
      workingInProfession: false,
      workplace: "",
      phone: "",
      description: "",
    },
  });

  const {
    control: preferencesControl,
    handleSubmit: handlePreferencesSubmit,
    reset: resetPreferences,
    setValue: setPreferenceValue,
  } = useForm({
    defaultValues: {
      ageMin: "",
      ageMax: "",
      city: [],
      heightMin: "",
      heightMax: "",
      style: [],
      preferredAppearance: [],
      financialMin: "",
      financialMax: "",
      preferredMaritalStatus: ["single"],
      preferredEthnicity: [],
      excludeIncomplete: false,
      preferredYeshiva: [],
      preferredSeminar: [],
      preferredOccupation: [],
      onlyWorking: false,
      onlyWorkingInProfession: false,
      lookingFor: "",
    },
  });

  const fillProfileForm = useCallback(
    (profile) => {
      setProfileData(profile || null);

      resetProfile({
        fullName: profile?.name || getSession().user?.name || "",
        gender: profile?.gender || getSession().user?.gender || "",
        ethnicity: profile?.ethnicity || "",
        age: toText(profile?.age),
        city: profile?.city || "",
        height: toText(profile?.height),
        style: profile?.style || "",
        appearance: profile?.appearance || "",
        financialRequirement: toText(profile?.financialRequirement),
        financialCapabilities: toText(profile?.financialCapabilities),
        financialStatus: toText(profile?.financialStatus),
        financialDemand: toText(profile?.financialDemand),
        financialParticipation: toText(profile?.financialParticipation),
        maritalStatus: profile?.maritalStatus || "",
        lookingFor: profile?.lookingFor || "",
        yeshiva: profile?.yeshiva || "",
        seminar: profile?.seminar || "",
        occupation: profile?.occupation || "",
        working: Boolean(profile?.working),
        workingInProfession: Boolean(profile?.workingInProfession),
        workplace: profile?.workplace || "",
        phone: profile?.phone || "",
        description: profile?.description || "",
      });
    },
    [resetProfile]
  );

  const fillPreferencesForm = useCallback(
    (preferences, profile) => {
      setPreferencesData(preferences || null);
      const onlyWorkingInProfession = Boolean(preferences?.onlyWorkingInProfession);

      resetPreferences({
        ageMin: toText(preferences?.ageMin),
        ageMax: toText(preferences?.ageMax),
        city: asNameList(preferences?.city),
        heightMin: toText(preferences?.heightMin),
        heightMax: toText(preferences?.heightMax),
        style: asOptionList(preferences?.style, STYLE_VALUES),
        preferredAppearance: asOptionList(preferences?.preferredAppearance, APPEARANCE_VALUES),
        financialMin: toText(preferences?.financialMin),
        financialMax: toText(preferences?.financialMax),
        preferredMaritalStatus: preferences ? asOptionList(preferences.preferredMaritalStatus, MARITAL_VALUES) : ["single"],
        preferredEthnicity: asOptionList(preferences?.preferredEthnicity, ETHNICITY_VALUES),
        excludeIncomplete: preferences?.excludeIncomplete === true,
        preferredYeshiva: asNameList(preferences?.preferredYeshiva, institutionKey),
        preferredSeminar: asNameList(preferences?.preferredSeminar, institutionKey),
        preferredOccupation: asNameList(preferences?.preferredOccupation),
        onlyWorkingInProfession,
        onlyWorking: Boolean(preferences?.onlyWorking) || onlyWorkingInProfession,
        lookingFor: profile?.lookingFor || "",
      });
    },
    [resetPreferences]
  );

  // A 404 means the user hasn't created a profile/preferences yet; any other error is thrown
  const applyLoadedData = useCallback(
    ([profileResult, preferencesResult]) => {
      let profile = null;
      if (profileResult.status === "fulfilled") {
        profile = profileResult.value?.profile || profileResult.value;
        setProfileExists(true);
        fillProfileForm(profile);
      } else if (profileResult.reason?.response?.status === 404) {
        setProfileExists(false);
        fillProfileForm(null);
      } else {
        throw profileResult.reason;
      }

      if (preferencesResult.status === "fulfilled") {
        const preferences =
          preferencesResult.value?.preferences || preferencesResult.value;
        setPreferencesExists(true);
        fillPreferencesForm(preferences, profile);
      } else if (preferencesResult.reason?.response?.status === 404) {
        setPreferencesExists(false);
        fillPreferencesForm(null, profile);
      } else {
        throw preferencesResult.reason;
      }
    },
    [fillPreferencesForm, fillProfileForm]
  );

  useEffect(() => {
    if (!canLoadData) {
      return undefined;
    }

    // Ignore the response if the page was closed before it arrived
    let cancelled = false;

    Promise.allSettled([getMyProfile(), getMyPreferences()])
      .then((results) => {
        if (!cancelled) applyLoadedData(results);
      })
      .catch((error) => {
        if (!cancelled) setErrorMessage(error.message || "אירעה שגיאה בטעינת הנתונים");
      })
      .finally(() => {
        if (!cancelled) setLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyLoadedData, canLoadData]);

  // Bring the form that was just opened into view
  useEffect(() => {
    if (loadingData) return;
    const formRef = openForm === "profile" ? profileFormRef : openForm === "preferences" ? preferencesFormRef : null;
    formRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [openForm, loadingData]);

  const toggleForm = (name) => {
    setFormError("");
    setFileError("");
    setOpenForm((current) => (current === name ? null : name));
  };

  const clearImagePreview = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview("");
  };

  // Close the form and go back to the top of the page
  const closeForm = () => {
    setOpenForm(null);
    setFormError("");
    setFileError("");
    clearImagePreview();
    setImageFile(null);
    setPdfFile(null);
    if (searchParams.has("edit")) {
      setSearchParams({}, { replace: true });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildProfileFormData = (data) => {
    const formData = new FormData();
    // When updating, empty fields are sent too - that is how a value is removed.
    // lookingFor stays on the preferences form, so a profile save does not clear it.
    const append = profileExists
      ? (form, key, value) => form.append(key, value ?? "")
      : appendIfNotEmpty;
    const fields = buildProfileFields(data);

    for (const [key, value] of Object.entries(fields)) {
      append(formData, key, value);
    }

    if (imageFile) {
      formData.append("image", imageFile);
    }

    if (pdfFile) {
      formData.append("resumePdf", pdfFile);
    }

    return formData;
  };

  const onSaveProfile = async (data) => {
    try {
      setSubmitting(true);
      setFormError("");

      const formData = buildProfileFormData(data);
      const response = profileExists ? await updateProfile(formData) : await createProfile(formData);

      setProfileExists(true);
      rememberUser({ name: data.fullName.trim(), gender: data.gender || profileData?.gender });
      fillProfileForm(response?.profile || response);
      closeForm();
      setSuccessMessage("הפרופיל נשמר בהצלחה");
    } catch (error) {
      setFormError(error.message || "לא הצלחנו לשמור את הפרופיל");
    } finally {
      setSubmitting(false);
    }
  };

  const onSavePreferences = async (data) => {
    try {
      setSubmitting(true);
      setFormError("");

      const payload = buildPreferenceFields(data, profileData?.gender);
      const response = preferencesExists ? await updatePreferences(payload) : await createPreferences(payload);
      let profile = profileData;
      if (profileExists) {
        const updated = await updateProfile({ lookingFor: data.lookingFor || "" });
        profile = updated?.profile || { ...profileData, lookingFor: data.lookingFor || "" };
        setProfileData(profile);
      }

      setPreferencesExists(true);
      fillPreferencesForm(response?.preferences || response, profile);
      closeForm();
      setSuccessMessage("ההעדפות נשמרו בהצלחה");
    } catch (error) {
      setFormError(error.message || "לא הצלחנו לשמור את ההעדפות");
    } finally {
      setSubmitting(false);
    }
  };

  const onPickImage = (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? getImageFileError(file) : "";
    setFileError(error);
    const nextFile = error ? null : file;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(nextFile ? URL.createObjectURL(nextFile) : "");
    setImageFile(nextFile);
  };

  const onPickPdf = (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? getPdfFileError(file) : "";
    setFileError(error);
    setPdfFile(error ? null : file);
  };

  const onViewFile = (url) => {
    openProtectedFile(url).catch((error) => {
      setFileError(error.message || "לא הצלחנו לפתוח את הקובץ");
    });
  };

  const onDownloadFile = (url) => {
    downloadProtectedFile(url).catch((error) => {
      setFileError(error.message || "לא הצלחנו להוריד את הקובץ");
    });
  };

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (loadingData) {
    return (
      <FormSkeleton />
    );
  }

  const imageUrl = toSafeFileUrl(profileData?.image);
  const resumeUrl = toSafeFileUrl(profileData?.resumePdf);
  const shownImage = imagePreview || imageUrl;
  const subtitle = profileSubtitle(profileData);
  const editingProfile = openForm === "profile";

  return (
    <Box sx={{ maxWidth: 1120, mx: "auto", textAlign: "start" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "flex-end" },
          gap: 2,
          flexWrap: "wrap",
          mb: 2.5,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h1" variant="h2" sx={{ color: brand.navy }}>
            הפרופיל שלי
          </Typography>
          <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: "17px", maxWidth: 640 }}>
            {PAGE_SUBTITLE}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Button
            size="small"
            variant={editingProfile ? "outlined" : "contained"}
            startIcon={profileExists ? <Edit /> : <PersonAdd />}
            onClick={() => toggleForm("profile")}
          >
            {profileExists ? "עדכון פרופיל" : "יצירת פרופיל"}
          </Button>
          <Button
            size="small"
            variant={openForm === "preferences" ? "outlined" : "contained"}
            startIcon={<Tune />}
            onClick={() => toggleForm("preferences")}
          >
            {preferencesExists ? "עדכון העדפות" : "יצירת העדפות"}
          </Button>
          <Button size="small" variant="contained" color="secondary" startIcon={<HowToReg />} onClick={() => navigate("/matches")}>
            התאמות
          </Button>
          <Button size="small" variant="contained" color="secondary" startIcon={<Forum />} onClick={() => navigate("/interests")}>
            התעניינויות
          </Button>
        </Stack>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Paper ref={profileFormRef} sx={{ ...cardSx, mb: 4, scrollMarginTop: 88 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(230px, 300px)" },
            gap: { xs: 2.5, lg: 5 },
          }}
        >
          <Box
            sx={{
              order: { xs: 0, lg: 2 },
              display: "flex",
              flexDirection: "column",
              gap: 1.75,
              alignSelf: "start",
              position: { lg: "sticky" },
              top: { lg: brand.topBarHeight + 16 },
            }}
          >
            <PhotoFrame
              src={shownImage}
              alt={user?.name ? `תמונה של ${user.name}` : "תמונת פרופיל"}
              gender={profileData?.gender}
              onOpen={imageUrl && !imagePreview ? onViewFile : undefined}
            />
            {editingProfile ? (
              <Button
                component="label"
                variant="outlined"
                fullWidth
                disabled={submitting}
                startIcon={<StrokeIcon name="camera" size={17} />}
              >
                {shownImage ? "החלפת תמונה" : "העלאת תמונה"}
                <input hidden type="file" accept={IMAGE_ACCEPT} onChange={onPickImage} />
              </Button>
            ) : (
              <Button
                variant="outlined"
                fullWidth
                startIcon={<StrokeIcon name="camera" size={17} />}
                onClick={() => toggleForm("profile")}
              >
                {shownImage ? "החלפת תמונה" : "העלאת תמונה"}
              </Button>
            )}
            {imageFile && (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                נבחר: {imageFile.name}
              </Typography>
            )}
            {!shownImage && (
              <Typography variant="body2" color="text.disabled">
                לא הועלתה תמונה
              </Typography>
            )}
            {fileError && !editingProfile && (
              <Alert severity="error">{fileError}</Alert>
            )}
            <Typography
              component="div"
              variant="body2"
              sx={{ display: "flex", gap: 1, alignItems: "flex-start", color: "text.secondary", lineHeight: 1.5 }}
            >
              <Box sx={{ color: brand.goldDeep, mt: "2px" }}>
                <StrokeIcon name="lock" size={15} />
              </Box>
              {PHOTO_NOTE}
            </Typography>
          </Box>

          <Box sx={{ order: 1, minWidth: 0 }}>
            <Box sx={{ pb: 2.5, mb: 2.5, borderBottom: `1px solid ${brand.line}` }}>
              <Typography
                component="h2"
                sx={{
                  fontWeight: 600,
                  letterSpacing: "-0.3px",
                  color: brand.navy,
                  fontSize: { xs: "1.625rem", md: "2.125rem" },
                  lineHeight: 1.15,
                }}
              >
                {user?.name || "הפרופיל שלי"}
              </Typography>
              {subtitle && (
                <Typography component="div" sx={{ display: "flex", gap: 0.75, alignItems: "center", mt: 1, color: "text.secondary" }}>
                  <Box sx={{ color: "text.secondary", display: "flex" }}>
                    <StrokeIcon name="pin" />
                  </Box>
                  {subtitle}
                </Typography>
              )}
            </Box>

            {editingProfile ? (
              <ProfileForm
                control={profileControl}
                cities={cities}
                onSubmit={handleProfileSubmit(onSaveProfile)}
                submitting={submitting}
                formError={formError}
                fileError={fileError}
                onCancel={closeForm}
                resumeUrl={resumeUrl}
                pdfFile={pdfFile}
                onPickPdf={onPickPdf}
                onViewFile={onViewFile}
                onDownloadFile={onDownloadFile}
              />
            ) : profileExists ? (
              <>
                <ProfileSummary profile={profileData} />
                <ResumeBlock
                  resumeUrl={resumeUrl}
                  editing={false}
                  onEdit={() => toggleForm("profile")}
                  onView={onViewFile}
                  onDownload={onDownloadFile}
                />
                <Box sx={actionsSx}>
                  <Button variant="contained" onClick={() => toggleForm("profile")} sx={{ flex: { sm: 1 }, minWidth: 160 }}>
                    עדכון פרופיל
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ py: 1 }}>
                <Typography sx={{ color: "text.secondary", mb: 2 }}>
                  עדיין לא יצרת פרופיל. בלי פרופיל לא נוכל להציע לך התאמות.
                </Typography>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => toggleForm("profile")}>
                  יצירת פרופיל
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      <Box sx={{ mb: 2 }}>
        <Typography component="h2" variant="h2" sx={{ color: brand.navy }}>
          העדפות התאמה
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: "17px" }}>
          מה חשוב לך אצל הצד השני. שדה שלא צוין אינו מגביל את ההתאמות.
        </Typography>
      </Box>

      <Paper ref={preferencesFormRef} sx={{ ...cardSx, scrollMarginTop: 88 }}>
        {openForm === "preferences" ? (
          <PreferencesForm
            control={preferencesControl}
            setValue={setPreferenceValue}
            gender={profileData?.gender}
            yeshivas={yeshivas}
            seminars={seminars}
            professions={professions}
            cities={cities}
            listError={listError}
            profileExists={profileExists}
            onSubmit={handlePreferencesSubmit(onSavePreferences)}
            submitting={submitting}
            formError={formError}
            onCancel={closeForm}
          />
        ) : preferencesExists ? (
          <>
            <PreferencesSummary preferences={preferencesData} profile={profileData} />
            <Box sx={actionsSx}>
              <Button variant="contained" onClick={() => toggleForm("preferences")} sx={{ minWidth: 160 }}>
                עדכון העדפות
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ py: 1 }}>
            <Typography sx={{ color: "text.secondary", mb: 2 }}>
              עדיין לא הגדרת העדפות, ולכן יוצגו לך כל ההתאמות האפשריות.
            </Typography>
            <Button variant="outlined" startIcon={<Tune />} onClick={() => toggleForm("preferences")}>
              הגדרת העדפות
            </Button>
          </Box>
        )}
      </Paper>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={() => setSuccessMessage("")} severity="success" sx={{ width: "100%" }}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
