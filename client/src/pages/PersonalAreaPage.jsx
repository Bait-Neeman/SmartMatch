import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Edit,
  Favorite,
  Forum,
  Image as ImageIcon,
  PersonAdd,
  PictureAsPdf,
  Tune,
  UploadFile,
} from "@mui/icons-material";
import { brand } from "../theme/tokens.js";
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
  toSafeFileUrl,
} from "../utils/files.js";
import { openProtectedFile } from "../utils/protectedFile.js";
import {
  appearanceOptions,
  ethnicityOptions,
  genderOptions,
  labelOf,
  styleOptions,
} from "../constants/profileOptions.js";
import { getSession } from "../utils/session.js";

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

const cardSx = {
  p: { xs: 2.5, sm: 3.5 },
  borderRadius: "16px",
  border: `1px solid ${brand.slateLine}`,
  boxShadow: brand.cardShadow,
  bgcolor: brand.paper,
};

const fullRow = { gridColumn: "1 / -1" };

function InfoRow({ label, value }) {
  return (
    <Box sx={{ display: "flex", gap: 1, py: 0.75, borderBottom: `1px dashed ${brand.slateDash}` }}>
      <Typography sx={{ fontWeight: 700, color: "text.primary", minWidth: 110 }}>{label}</Typography>
      <Typography sx={{ color: value ? "text.primary" : "text.disabled", wordBreak: "break-word" }}>
        {value || "לא צוין"}
      </Typography>
    </Box>
  );
}

function SectionCard({ title, icon, action, children }) {
  return (
    <Paper sx={cardSx}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: "text.primary", flexGrow: 1 }}>
          {title}
        </Typography>
        {action}
      </Box>
      {children}
    </Paper>
  );
}

function SelectField({ field, label, options, error, required = false }) {
  const id = `${field.name}-label`;
  return (
    <FormControl fullWidth required={required} error={Boolean(error)}>
      <InputLabel id={id}>{label}</InputLabel>
      <Select labelId={id} label={label} {...field}>
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

  // Close the form and go back to the top of the page
  const closeForm = () => {
    setOpenForm(null);
    setFormError("");
    setFileError("");
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

  const formActions = (saveLabel) => (
    <Box sx={fullRow}>
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {formError}
        </Alert>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button variant="contained" type="submit" disabled={submitting} sx={{ minWidth: 160 }}>
          {submitting ? "שומר..." : saveLabel}
        </Button>
        <Button variant="outlined" onClick={closeForm} disabled={submitting} sx={{ minWidth: 120, boxShadow: "none" }}>
          ביטול
        </Button>
      </Stack>
    </Box>
  );

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 5 } }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontWeight: 700, color: "text.primary" }}
        >
          האזור האישי
        </Typography>
        {user?.name && (
          <Typography sx={{ mt: 1, color: "text.secondary", fontSize: "1.05rem" }}>שלום, {user.name}</Typography>
        )}
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          mb: 4,
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
        }}
      >
        <Button
          variant={openForm === "profile" ? "outlined" : "contained"}
          startIcon={profileExists ? <Edit /> : <PersonAdd />}
          onClick={() => toggleForm("profile")}
        >
          {profileExists ? "עדכון פרופיל" : "יצירת פרופיל"}
        </Button>
        <Button
          variant={openForm === "preferences" ? "outlined" : "contained"}
          startIcon={<Tune />}
          onClick={() => toggleForm("preferences")}
        >
          {preferencesExists ? "עדכון העדפות" : "יצירת העדפות"}
        </Button>
        <Button variant="contained" color="secondary" startIcon={<Favorite />} onClick={() => navigate("/matches")}>
          התאמות
        </Button>
        <Button variant="contained" color="secondary" startIcon={<Forum />} onClick={() => navigate("/interests")}>
          התעניינויות
        </Button>
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mb: 4 }}>
        <SectionCard title="הפרופיל שלי" icon={<Edit />}>
          {profileExists ? (
            <>
              <InfoRow label="מגדר" value={labelOf(genderOptions, profileData?.gender)} />
              <InfoRow label="גיל" value={toText(profileData?.age)} />
              <InfoRow label="עיר" value={profileData?.city} />
              <InfoRow label="גובה" value={profileData?.height ? `${profileData.height} ס"מ` : ""} />
              <InfoRow label="עדה" value={labelOf(ethnicityOptions, profileData?.ethnicity)} />
              <InfoRow label="סגנון" value={labelOf(styleOptions, profileData?.style)} />
              <InfoRow label="מראה" value={labelOf(appearanceOptions, profileData?.appearance)} />
              {profileData?.yeshiva && <InfoRow label="ישיבה" value={profileData.yeshiva} />}
              {profileData?.seminar && <InfoRow label="סמינר" value={profileData.seminar} />}
              {profileData?.occupation && <InfoRow label="עיסוק" value={profileData.occupation} />}
              {profileData?.description && (
                <Typography sx={{ mt: 2, color: "text.secondary", wordBreak: "break-word" }}>
                  {profileData.description}
                </Typography>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography sx={{ color: "text.secondary", mb: 2 }}>
                עדיין לא יצרת פרופיל. בלי פרופיל לא נוכל להציע לך התאמות.
              </Typography>
              <Button variant="contained" startIcon={<PersonAdd />} onClick={() => toggleForm("profile")}>
                יצירת פרופיל
              </Button>
            </Box>
          )}
        </SectionCard>

        <SectionCard title="ההעדפות שלי" icon={<Tune />}>
          {preferencesExists ? (
            <>
              <InfoRow label="גיל" value={formatRange(preferencesData?.ageMin, preferencesData?.ageMax)} />
              <InfoRow label="גובה" value={formatRange(preferencesData?.heightMin, preferencesData?.heightMax, ' ס"מ')} />
              <InfoRow label="עיר" value={preferencesData?.city} />
              <InfoRow label="סגנון" value={labelOf(styleOptions, preferencesData?.style)} />
              <InfoRow label="מראה" value={labelOf(appearanceOptions, preferencesData?.preferredAppearance)} />
              <InfoRow label="מצב כלכלי" value={formatRange(preferencesData?.financialMin, preferencesData?.financialMax)} />
              <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
                שדה שלא צוין אינו מגביל את ההתאמות.
              </Typography>
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <Typography sx={{ color: "text.secondary", mb: 2 }}>
                עדיין לא הגדרת העדפות, ולכן יוצגו לך כל ההתאמות האפשריות.
              </Typography>
              <Button variant="outlined" startIcon={<Tune />} onClick={() => toggleForm("preferences")}>
                הגדרת העדפות
              </Button>
            </Box>
          )}
        </SectionCard>
      </Box>

      {profileExists && (
        <Box sx={{ mb: 4 }}>
          <SectionCard title="קבצים" icon={<UploadFile />}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {imageUrl ? (
                <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => openProtectedFile(imageUrl)}>
                  צפייה בתמונה
                </Button>
              ) : (
                <Typography sx={{ color: "text.disabled", display: "flex", alignItems: "center", gap: 1 }}>
                  <ImageIcon fontSize="small" /> לא הועלתה תמונה
                </Typography>
              )}
              {resumeUrl ? (
                <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={() => openProtectedFile(resumeUrl)}>
                  צפייה בקובץ PDF
                </Button>
              ) : (
                <Typography sx={{ color: "text.disabled", display: "flex", alignItems: "center", gap: 1 }}>
                  <PictureAsPdf fontSize="small" /> לא הועלה קובץ PDF
                </Typography>
              )}
            </Stack>
            <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary" }}>
              התמונה וקורות החיים גלויים רק לך, למנהל, ולמי שההתאמה איתו מאושרת כרגע.
            </Typography>
          </SectionCard>
        </Box>
      )}

      {openForm === "profile" && (
        <Paper ref={profileFormRef} sx={{ ...cardSx, mb: 4, scrollMarginTop: 88 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: "text.primary", mb: 3 }}>
            {profileExists ? "עדכון פרופיל" : "יצירת פרופיל"}
          </Typography>

          <Box
            component="form"
            onSubmit={handleProfileSubmit(onSaveProfile)}
            noValidate
            sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}
          >
            <Controller
              name="gender"
              control={profileControl}
              rules={{ required: "מין הוא שדה חובה" }}
              render={({ field, fieldState }) => (
                <SelectField field={field} label="מין" options={genderOptions} error={fieldState.error} required />
              )}
            />

            <Controller
              name="age"
              control={profileControl}
              rules={{ required: "גיל הוא שדה חובה" }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="גיל"
                  type="number"
                  required
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  fullWidth
                />
              )}
            />

            <Controller
              name="city"
              control={profileControl}
              render={({ field }) => <TextField {...field} label="עיר" fullWidth />}
            />

            <Controller
              name="height"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label='גובה (בס"מ)' type="number" placeholder="לדוגמה 175" fullWidth />
              )}
            />

            <Controller
              name="ethnicity"
              control={profileControl}
              render={({ field }) => <SelectField field={field} label="עדה" options={ethnicityOptions} />}
            />

            <Controller
              name="style"
              control={profileControl}
              render={({ field }) => <SelectField field={field} label="סגנון" options={styleOptions} />}
            />

            <Controller
              name="appearance"
              control={profileControl}
              render={({ field }) => <SelectField field={field} label="מראה" options={appearanceOptions} />}
            />

            <Controller
              name="financialStatus"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="מדד כספי להתאמה"
                  type="number"
                  helperText="מספר שמשמש להתאמה לפי מצב כלכלי"
                  fullWidth
                />
              )}
            />

            <Controller
              name="financialRequirement"
              control={profileControl}
              render={({ field }) => <TextField {...field} label="דרישה כספית" fullWidth />}
            />

            <Controller
              name="financialCapabilities"
              control={profileControl}
              render={({ field }) => <TextField {...field} label="יכולת כספית" fullWidth />}
            />

            <Controller
              name="yeshiva"
              control={profileControl}
              render={({ field }) => <TextField {...field} label="ישיבה" fullWidth />}
            />

            <Controller
              name="seminar"
              control={profileControl}
              render={({ field }) => <TextField {...field} label="סמינר" fullWidth />}
            />

            <Controller
              name="occupation"
              control={profileControl}
              render={({ field }) => <TextField {...field} label="עיסוק" fullWidth />}
            />

            <Controller
              name="description"
              control={profileControl}
              rules={{ maxLength: { value: 1000, message: "התיאור יכול להכיל עד 1000 תווים" } }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="תיאור"
                  multiline
                  minRows={3}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  fullWidth
                  sx={fullRow}
                />
              )}
            />

            <Divider sx={fullRow} />

            <Box sx={{ ...fullRow, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Button variant="outlined" component="label" startIcon={<ImageIcon />} sx={{ boxShadow: "none" }}>
                {imageUrl ? "החלפת תמונה" : "העלאת תמונה"}
                <input
                  hidden
                  type="file"
                  accept={IMAGE_ACCEPT}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    const error = file ? getImageFileError(file) : "";
                    setFileError(error);
                    setImageFile(error ? null : file);
                  }}
                />
              </Button>
              {imageFile && <Typography sx={{ color: "text.secondary" }}>נבחר: {imageFile.name}</Typography>}
            </Box>

            <Box sx={{ ...fullRow, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
              <Button variant="outlined" component="label" startIcon={<PictureAsPdf />} sx={{ boxShadow: "none" }}>
                {resumeUrl ? "החלפת קורות חיים" : "העלאת קורות חיים (PDF)"}
                <input
                  hidden
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    const error = file ? getPdfFileError(file) : "";
                    setFileError(error);
                    setPdfFile(error ? null : file);
                  }}
                />
              </Button>
              {pdfFile && <Typography sx={{ color: "text.secondary" }}>נבחר: {pdfFile.name}</Typography>}
            </Box>

            {fileError && (
              <Alert severity="error" sx={fullRow}>
                {fileError}
              </Alert>
            )}

            {formActions("שמירת פרופיל")}
          </Box>
        </Paper>
      )}

      {openForm === "preferences" && (
        <Paper ref={preferencesFormRef} sx={{ ...cardSx, mb: 4, scrollMarginTop: 88 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
            {preferencesExists ? "עדכון העדפות" : "יצירת העדפות"}
          </Typography>
          <Typography sx={{ color: "text.secondary", mb: 3 }}>
            כל השדות רשות. שדה שנשאר ריק לא מגביל את ההתאמות.
          </Typography>

          <Box
            component="form"
            onSubmit={handlePreferencesSubmit(onSavePreferences)}
            noValidate
            sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}
          >
            <Controller
              name="ageMin"
              control={preferencesControl}
              render={({ field }) => <TextField {...field} label="גיל מינימום" type="number" fullWidth />}
            />
            <Controller
              name="ageMax"
              control={preferencesControl}
              render={({ field }) => <TextField {...field} label="גיל מקסימום" type="number" fullWidth />}
            />
            <Controller
              name="heightMin"
              control={preferencesControl}
              render={({ field }) => <TextField {...field} label='גובה מינימום (ס"מ)' type="number" fullWidth />}
            />
            <Controller
              name="heightMax"
              control={preferencesControl}
              render={({ field }) => <TextField {...field} label='גובה מקסימום (ס"מ)' type="number" fullWidth />}
            />
            <Controller
              name="city"
              control={preferencesControl}
              render={({ field }) => <TextField {...field} label="עיר" fullWidth />}
            />
            <Controller
              name="style"
              control={preferencesControl}
              render={({ field }) => <SelectField field={field} label="סגנון" options={styleOptions} />}
            />
            <Controller
              name="preferredAppearance"
              control={preferencesControl}
              render={({ field }) => <SelectField field={field} label="מראה מועדף" options={appearanceOptions} />}
            />
            <Box sx={{ display: { xs: "none", sm: "block" } }} />
            <Controller
              name="financialMin"
              control={preferencesControl}
              render={({ field }) => <TextField {...field} label="מדד כספי מינימום" type="number" fullWidth />}
            />
            <Controller
              name="financialMax"
              control={preferencesControl}
              render={({ field }) => <TextField {...field} label="מדד כספי מקסימום" type="number" fullWidth />}
            />

            {formActions("שמירת העדפות")}
          </Box>
        </Paper>
      )}

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
    </Container>
  );
}
