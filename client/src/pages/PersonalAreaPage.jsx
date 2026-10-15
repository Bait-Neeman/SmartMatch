import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit, Favorite, Forum, PersonAdd, Tune } from "@mui/icons-material";
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
  styleOptions,
} from "../constants/profileOptions.js";
import { getSession } from "../utils/session.js";
import { brand } from "../theme/tokens.js";
import PersonAvatar from "../components/common/PersonAvatar.jsx";
import ProtectedImage from "../components/common/ProtectedFile.jsx";
import StatusPill from "../components/common/StatusPill.jsx";

const toText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const toNumberOrEmpty = (value) => {
  if (value === "" || value === undefined || value === null) return "";
  return Number(value);
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

const lineFieldSx = {
  "& .MuiInputBase-root": {
    fontWeight: 600,
    color: brand.navy,
    fontSize: "15.5px",
  },
  "& .MuiInput-underline:before": {
    borderBottomColor: brand.fieldLine,
  },
  "& .MuiInput-underline:hover:not(.Mui-disabled, .Mui-error):before": {
    borderBottomColor: brand.gold,
  },
  "& .MuiInput-underline:after": {
    borderBottomColor: brand.gold,
  },
  "& .MuiInputBase-input": {
    padding: "6px 2px",
  },
  "& .MuiSelect-select": {
    padding: "6px 2px",
  },
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
  bgcolor: brand.avatarBg,
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

function LineText({ field, label, error, helperText, ...rest }) {
  return (
    <TextField
      {...field}
      {...rest}
      variant="standard"
      fullWidth
      hiddenLabel
      error={Boolean(error)}
      helperText={error?.message || helperText}
      slotProps={{ htmlInput: { "aria-label": label } }}
      sx={lineFieldSx}
    />
  );
}

function SelectField({ field, label, options, error, required = false }) {
  return (
    <FormControl fullWidth required={required} error={Boolean(error)} variant="standard" sx={lineFieldSx}>
      <Select {...field} displayEmpty slotProps={{ input: { "aria-label": label } }}>
        {!required && <MenuItem value="">לא נבחר</MenuItem>}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText>{error.message}</FormHelperText>}
    </FormControl>
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

function PhotoFrame({ src, alt, onOpen }) {
  let picture = <PersonAvatar size="100%" sx={{ width: "100%", height: "100%", borderRadius: 0 }} />;
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
  const height = profile?.height ? `${profile.height} ס"מ` : "";
  const showSchool = Boolean(profile?.yeshiva || profile?.seminar);

  return (
    <>
      <Box component="ul" sx={listSx}>
        <FieldRow icon="user" label="מגדר">
          <ReadValue value={labelOf(genderOptions, profile?.gender)} pill />
        </FieldRow>
        <FieldRow icon="user" label="גיל">
          <ReadValue value={toText(profile?.age)} />
        </FieldRow>
        <FieldRow icon="ruler" label="גובה">
          <ReadValue value={height} />
        </FieldRow>
        <FieldRow icon="star" label="עדה">
          <ReadValue value={labelOf(ethnicityOptions, profile?.ethnicity)} pill tone="pending" />
        </FieldRow>
        <FieldRow icon="pin" label="עיר">
          <ReadValue value={profile?.city} />
        </FieldRow>
        <FieldRow icon="sliders" label="סגנון">
          <ReadValue value={labelOf(styleOptions, profile?.style)} pill tone="pending" />
        </FieldRow>
        <FieldRow icon="spark" label="מראה">
          <ReadValue value={labelOf(appearanceOptions, profile?.appearance)} pill />
        </FieldRow>
        {showSchool && (
          <Box component="li" sx={{ display: "block" }}>
            <BlockTitle>מוסד לימוד</BlockTitle>
          </Box>
        )}
        {profile?.yeshiva && (
          <FieldRow icon="school" label="ישיבה">
            <ReadValue value={profile.yeshiva} />
          </FieldRow>
        )}
        {profile?.seminar && (
          <FieldRow icon="school" label="סמינר">
            <ReadValue value={profile.seminar} />
          </FieldRow>
        )}
        {profile?.occupation && (
          <FieldRow icon="work" label="עיסוק">
            <ReadValue value={profile.occupation} />
          </FieldRow>
        )}
      </Box>
      {profile?.description && (
        <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
          <BlockTitle>קצת עליי / תכונות</BlockTitle>
          <Box sx={descriptionBoxSx}>{profile.description}</Box>
        </Box>
      )}
    </>
  );
}

function ProfileForm({
  control,
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
      <Box component="ul" sx={listSx}>
        <Controller
          name="gender"
          control={control}
          rules={{ required: "מין הוא שדה חובה" }}
          render={({ field, fieldState }) => (
            <FieldRow icon="user" label="מין" required>
              <SelectField field={field} label="מין" options={genderOptions} error={fieldState.error} required />
            </FieldRow>
          )}
        />
        <Controller
          name="age"
          control={control}
          rules={{ required: "גיל הוא שדה חובה" }}
          render={({ field, fieldState }) => (
            <FieldRow icon="user" label="גיל" required>
              <LineText field={field} label="גיל" type="number" error={fieldState.error} />
            </FieldRow>
          )}
        />
        <Controller
          name="height"
          control={control}
          render={({ field }) => (
            <FieldRow icon="ruler" label='גובה (בס"מ)'>
              <LineText field={field} label='גובה (בס"מ)' type="number" placeholder="לדוגמה 175" />
            </FieldRow>
          )}
        />
        <Controller
          name="ethnicity"
          control={control}
          render={({ field }) => (
            <FieldRow icon="star" label="עדה">
              <SelectField field={field} label="עדה" options={ethnicityOptions} />
            </FieldRow>
          )}
        />
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <FieldRow icon="pin" label="עיר">
              <LineText field={field} label="עיר" />
            </FieldRow>
          )}
        />
        <Controller
          name="style"
          control={control}
          render={({ field }) => (
            <FieldRow icon="sliders" label="סגנון">
              <SelectField field={field} label="סגנון" options={styleOptions} />
            </FieldRow>
          )}
        />
        <Controller
          name="appearance"
          control={control}
          render={({ field }) => (
            <FieldRow icon="spark" label="מראה">
              <SelectField field={field} label="מראה" options={appearanceOptions} />
            </FieldRow>
          )}
        />
        <Box component="li" sx={{ display: "block" }}>
          <BlockTitle>מוסד לימוד</BlockTitle>
        </Box>
        <Controller
          name="yeshiva"
          control={control}
          render={({ field }) => (
            <FieldRow icon="school" label="ישיבה">
              <LineText field={field} label="ישיבה" />
            </FieldRow>
          )}
        />
        <Controller
          name="seminar"
          control={control}
          render={({ field }) => (
            <FieldRow icon="school" label="סמינר">
              <LineText field={field} label="סמינר" />
            </FieldRow>
          )}
        />
        <Controller
          name="occupation"
          control={control}
          render={({ field }) => (
            <FieldRow icon="work" label="עיסוק">
              <LineText field={field} label="עיסוק" />
            </FieldRow>
          )}
        />
        <Controller
          name="financialStatus"
          control={control}
          render={({ field }) => (
            <FieldRow icon="sliders" label="מדד כספי להתאמה">
              <LineText
                field={field}
                label="מדד כספי להתאמה"
                type="number"
                helperText="מספר שמשמש להתאמה לפי מצב כלכלי"
              />
            </FieldRow>
          )}
        />
        <Controller
          name="financialRequirement"
          control={control}
          render={({ field }) => (
            <FieldRow icon="sliders" label="דרישה כספית">
              <LineText field={field} label="דרישה כספית" />
            </FieldRow>
          )}
        />
        <Controller
          name="financialCapabilities"
          control={control}
          render={({ field }) => (
            <FieldRow icon="sliders" label="יכולת כספית">
              <LineText field={field} label="יכולת כספית" />
            </FieldRow>
          )}
        />
      </Box>

      <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
        <BlockTitle>קצת עליי / תכונות</BlockTitle>
        <Controller
          name="description"
          control={control}
          rules={{ maxLength: { value: 1000, message: "התיאור יכול להכיל עד 1000 תווים" } }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              hiddenLabel
              multiline
              minRows={4}
              fullWidth
              placeholder="תיאור"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
              slotProps={{ htmlInput: { "aria-label": "תיאור" } }}
              sx={{
                "& .MuiInputBase-root": { lineHeight: 1.75, bgcolor: "background.paper" },
                "& .MuiOutlinedInput-notchedOutline": { borderColor: brand.inputLine },
              }}
            />
          )}
        />
      </Box>

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

function PreferencesSummary({ preferences }) {
  return (
    <>
      <Box component="ul" sx={listSx}>
        <FieldRow icon="user" label="גיל">
          <ReadValue value={formatRange(preferences?.ageMin, preferences?.ageMax)} />
        </FieldRow>
        <FieldRow icon="ruler" label="גובה">
          <ReadValue value={formatRange(preferences?.heightMin, preferences?.heightMax, ' ס"מ')} />
        </FieldRow>
        <FieldRow icon="pin" label="עיר">
          <ReadValue value={preferences?.city} />
        </FieldRow>
        <FieldRow icon="sliders" label="סגנון">
          <ReadValue value={labelOf(styleOptions, preferences?.style)} pill tone="pending" />
        </FieldRow>
        <FieldRow icon="spark" label="מראה">
          <ReadValue value={labelOf(appearanceOptions, preferences?.preferredAppearance)} pill />
        </FieldRow>
        <FieldRow icon="sliders" label="מצב כלכלי">
          <ReadValue value={formatRange(preferences?.financialMin, preferences?.financialMax)} />
        </FieldRow>
      </Box>
      <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
        שדה שלא צוין אינו מגביל את ההתאמות.
      </Typography>
    </>
  );
}

function PreferencesForm({ control, onSubmit, submitting, formError, onCancel }) {
  return (
    <Box component="form" onSubmit={onSubmit} noValidate>
      <Typography sx={{ color: "text.secondary", mb: 2 }}>
        כל השדות רשות. שדה שנשאר ריק לא מגביל את ההתאמות.
      </Typography>
      <BlockTitle first>טווח גילאים</BlockTitle>
      <Box component="ul" sx={listSx}>
        <Controller
          name="ageMin"
          control={control}
          render={({ field }) => (
            <FieldRow icon="user" label="גיל מינימום">
              <LineText field={field} label="גיל מינימום" type="number" />
            </FieldRow>
          )}
        />
        <Controller
          name="ageMax"
          control={control}
          render={({ field }) => (
            <FieldRow icon="user" label="גיל מקסימום">
              <LineText field={field} label="גיל מקסימום" type="number" />
            </FieldRow>
          )}
        />
      </Box>
      <BlockTitle>פרטים מועדפים</BlockTitle>
      <Box component="ul" sx={listSx}>
        <Controller
          name="heightMin"
          control={control}
          render={({ field }) => (
            <FieldRow icon="ruler" label='גובה מינימום (ס"מ)'>
              <LineText field={field} label='גובה מינימום (ס"מ)' type="number" />
            </FieldRow>
          )}
        />
        <Controller
          name="heightMax"
          control={control}
          render={({ field }) => (
            <FieldRow icon="ruler" label='גובה מקסימום (ס"מ)'>
              <LineText field={field} label='גובה מקסימום (ס"מ)' type="number" />
            </FieldRow>
          )}
        />
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <FieldRow icon="pin" label="עיר">
              <LineText field={field} label="עיר" />
            </FieldRow>
          )}
        />
        <Controller
          name="style"
          control={control}
          render={({ field }) => (
            <FieldRow icon="sliders" label="סגנון">
              <SelectField field={field} label="סגנון" options={styleOptions} />
            </FieldRow>
          )}
        />
        <Controller
          name="preferredAppearance"
          control={control}
          render={({ field }) => (
            <FieldRow icon="spark" label="מראה מועדף">
              <SelectField field={field} label="מראה מועדף" options={appearanceOptions} />
            </FieldRow>
          )}
        />
        <Controller
          name="financialMin"
          control={control}
          render={({ field }) => (
            <FieldRow icon="sliders" label="מדד כספי מינימום">
              <LineText field={field} label="מדד כספי מינימום" type="number" />
            </FieldRow>
          )}
        />
        <Controller
          name="financialMax"
          control={control}
          render={({ field }) => (
            <FieldRow icon="sliders" label="מדד כספי מקסימום">
              <LineText field={field} label="מדד כספי מקסימום" type="number" />
            </FieldRow>
          )}
        />
      </Box>
      {formError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {formError}
        </Alert>
      )}
      <FormActions submitting={submitting} saveLabel="שמירת העדפות" onCancel={onCancel} />
    </Box>
  );
}

export default function PersonalAreaPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { token, user, isAdmin } = getSession();
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
      gender: "",
      ethnicity: "",
      age: "",
      city: "",
      height: "",
      style: "",
      appearance: "",
      financialRequirement: "",
      financialCapabilities: "",
      financialStatus: "",
      yeshiva: "",
      seminar: "",
      occupation: "",
      description: "",
    },
  });

  const {
    control: preferencesControl,
    handleSubmit: handlePreferencesSubmit,
    reset: resetPreferences,
  } = useForm({
    defaultValues: {
      ageMin: "",
      ageMax: "",
      city: "",
      heightMin: "",
      heightMax: "",
      style: "",
      preferredAppearance: "",
      financialMin: "",
      financialMax: "",
    },
  });

  const fillProfileForm = useCallback(
    (profile) => {
      setProfileData(profile || null);

      resetProfile({
        gender: profile?.gender || "",
        ethnicity: profile?.ethnicity || "",
        age: toText(profile?.age),
        city: profile?.city || "",
        height: toText(profile?.height),
        style: profile?.style || "",
        appearance: profile?.appearance || "",
        financialRequirement: toText(profile?.financialRequirement),
        financialCapabilities: toText(profile?.financialCapabilities),
        financialStatus: toText(profile?.financialStatus),
        yeshiva: profile?.yeshiva || "",
        seminar: profile?.seminar || "",
        occupation: profile?.occupation || "",
        description: profile?.description || "",
      });
    },
    [resetProfile]
  );

  const fillPreferencesForm = useCallback(
    (preferences) => {
      setPreferencesData(preferences || null);

      resetPreferences({
        ageMin: toText(preferences?.ageMin),
        ageMax: toText(preferences?.ageMax),
        city: preferences?.city || "",
        heightMin: toText(preferences?.heightMin),
        heightMax: toText(preferences?.heightMax),
        style: preferences?.style || "",
        preferredAppearance: preferences?.preferredAppearance || "",
        financialMin: toText(preferences?.financialMin),
        financialMax: toText(preferences?.financialMax),
      });
    },
    [resetPreferences]
  );

  // A 404 means the user hasn't created a profile/preferences yet; any other error is thrown
  const applyLoadedData = useCallback(
    ([profileResult, preferencesResult]) => {
      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value?.profile || profileResult.value;
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
        fillPreferencesForm(preferences);
      } else if (preferencesResult.reason?.response?.status === 404) {
        setPreferencesExists(false);
        fillPreferencesForm(null);
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
    // When updating, empty fields are sent too - that is how a value is removed
    const append = profileExists
      ? (form, key, value) => form.append(key, value ?? "")
      : appendIfNotEmpty;

    append(formData, "gender", data.gender);
    append(formData, "ethnicity", data.ethnicity);
    append(formData, "age", toNumberOrEmpty(data.age));
    append(formData, "city", data.city);
    append(formData, "height", toNumberOrEmpty(data.height));
    append(formData, "style", data.style);
    append(formData, "appearance", data.appearance);
    append(formData, "financialRequirement", data.financialRequirement);
    append(formData, "financialCapabilities", data.financialCapabilities);
    append(formData, "financialStatus", toNumberOrEmpty(data.financialStatus));
    append(formData, "yeshiva", data.yeshiva);
    append(formData, "seminar", data.seminar);
    append(formData, "occupation", data.occupation);
    append(formData, "description", data.description);

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
      fillProfileForm(response?.profile || response);
      closeForm();
      setSuccessMessage("הפרופיל נשמר בהצלחה");
    } catch (error) {
      setFormError(error.message || "לא הצלחנו לשמור את הפרופיל");
    } finally {
      setSubmitting(false);
    }
  };

  const buildPreferencesPayload = (data) => ({
    ageMin: toNumberOrEmpty(data.ageMin),
    ageMax: toNumberOrEmpty(data.ageMax),
    city: data.city || "",
    heightMin: toNumberOrEmpty(data.heightMin),
    heightMax: toNumberOrEmpty(data.heightMax),
    style: data.style || "",
    preferredAppearance: data.preferredAppearance || "",
    financialMin: toNumberOrEmpty(data.financialMin),
    financialMax: toNumberOrEmpty(data.financialMax),
  });

  const onSavePreferences = async (data) => {
    try {
      setSubmitting(true);
      setFormError("");

      const payload = buildPreferencesPayload(data);
      const response = preferencesExists ? await updatePreferences(payload) : await createPreferences(payload);

      setPreferencesExists(true);
      fillPreferencesForm(response?.preferences || response);
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
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
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
          <Button size="small" variant="contained" color="secondary" startIcon={<Favorite />} onClick={() => navigate("/matches")}>
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
            onSubmit={handlePreferencesSubmit(onSavePreferences)}
            submitting={submitting}
            formError={formError}
            onCancel={closeForm}
          />
        ) : preferencesExists ? (
          <>
            <PreferencesSummary preferences={preferencesData} />
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
