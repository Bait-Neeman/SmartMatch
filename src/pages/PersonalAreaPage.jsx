import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
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

const getServerBaseUrl = () => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
  return base.replace(/\/api\/?$/, "");
};

const toText = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const toNumberOrEmpty = (value) => {
  if (value === "" || value === undefined || value === null) return "";
  const number = Number(value);
  return Number.isNaN(number) ? "" : number;
};

const appendIfNotEmpty = (formData, key, value) => {
  if (value !== undefined && value !== null && value !== "") {
    formData.append(key, value);
  }
};

const normalizeFileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const baseUrl = getServerBaseUrl();

  if (path.startsWith("/")) return `${baseUrl}${path}`;
  if (path.startsWith("uploads/")) return `${baseUrl}/${path}`;

  return `${baseUrl}/uploads/${path}`;
};

const genderOptions = [
  { value: "male", label: "זכר" },
  { value: "female", label: "נקבה" },
];

const ethnicityOptions = [
  { value: "ashkenazi", label: "אשכנזי" },
  { value: "sephardic", label: "ספרדי" },
  { value: "yemenite", label: "תימני" },
  { value: "other", label: "אחר" },
];

const styleOptions = [
  { value: "conservative", label: "שמור" },
  { value: "classic", label: "קלאסי" },
  { value: "modern", label: "מודרני" },
  { value: "open", label: "פתוח" },
];

const appearanceOptions = [
  { value: "slim", label: "רזה" },
  { value: "average", label: "ממוצע" },
  { value: "full", label: "מלא" },
  { value: "chubby", label: "רחב" },
];

const labelByValue = (options, value) =>
  options.find((option) => option.value === value)?.label || value || "לא צוין";

const labelsByValues = (options, values) => {
  if (!Array.isArray(values) || values.length === 0) return "לא צוין";
  return values.map((value) => labelByValue(options, value)).join(", ");
};

export default function PersonalAreaPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  const [profileExists, setProfileExists] = useState(false);
  const [preferencesExists, setPreferencesExists] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [preferencesData, setPreferencesData] = useState(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const [loadingData, setLoadingData] = useState(true);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [preferencesSubmitting, setPreferencesSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

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
      studyPlace: "",
      occupation: "",
      financialCapabilities: "",
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
      heightMin: "",
      heightMax: "",
      style: "",
      preferredAppearances: [],
      financialRequirementMin: "",
    },
  });

  const fillProfileForm = useCallback(
    (profile) => {
      const normalizedProfile = profile
        ? {
            ...profile,
            studyPlace: profile.studyPlace || profile.yeshiva || profile.seminar || "",
            financialCapabilities:
              profile.financialCapabilities ?? profile.financialStatus ?? "",
          }
        : null;

      setProfileData(normalizedProfile);

      resetProfile({
        gender: normalizedProfile?.gender || "",
        ethnicity: normalizedProfile?.ethnicity || "",
        age: toText(normalizedProfile?.age),
        city: normalizedProfile?.city || "",
        height: toText(normalizedProfile?.height),
        style: normalizedProfile?.style || "",
        appearance: normalizedProfile?.appearance || "",
        studyPlace: normalizedProfile?.studyPlace || "",
        occupation: normalizedProfile?.occupation || "",
        financialCapabilities: toText(normalizedProfile?.financialCapabilities),
        description: normalizedProfile?.description || "",
      });
    },
    [resetProfile]
  );

  const fillPreferencesForm = useCallback(
    (preferences) => {
      const preferredAppearances =
        preferences?.preferredAppearances ||
        (preferences?.preferredAppearance ? [preferences.preferredAppearance] : []);

      const normalizedPreferences = preferences
        ? {
            ...preferences,
            preferredAppearances,
            financialRequirementMin:
              preferences.financialRequirementMin ?? preferences.financialMin ?? "",
          }
        : null;

      setPreferencesData(normalizedPreferences);

      resetPreferences({
        ageMin: toText(normalizedPreferences?.ageMin),
        ageMax: toText(normalizedPreferences?.ageMax),
        heightMin: toText(normalizedPreferences?.heightMin),
        heightMax: toText(normalizedPreferences?.heightMax),
        style: normalizedPreferences?.style || "",
        preferredAppearances: normalizedPreferences?.preferredAppearances || [],
        financialRequirementMin: toText(normalizedPreferences?.financialRequirementMin),
      });
    },
    [resetPreferences]
  );

  const loadData = useCallback(async () => {
    if (role === "admin") {
      setLoadingData(false);
      return;
    }

    if (!token) {
      setErrorMessage("יש להתחבר כדי לצפות באזור האישי");
      setLoadingData(false);
      return;
    }

    try {
      setLoadingData(true);
      setErrorMessage("");

      const [profileResult, preferencesResult] = await Promise.allSettled([
        getMyProfile(),
        getMyPreferences(),
      ]);

      if (profileResult.status === "fulfilled") {
        const profile = profileResult.value?.profile || profileResult.value;
        setProfileExists(true);
        fillProfileForm(profile);
      } else {
        setProfileExists(false);
        fillProfileForm(null);
      }

      if (preferencesResult.status === "fulfilled") {
        const preferences =
          preferencesResult.value?.preferences || preferencesResult.value;
        setPreferencesExists(true);
        fillPreferencesForm(preferences);
      } else {
        setPreferencesExists(false);
        fillPreferencesForm(null);
      }
    } catch (error) {
      setErrorMessage(error.message || "אירעה שגיאה בטעינת הנתונים");
    } finally {
      setLoadingData(false);
    }
  }, [fillPreferencesForm, fillProfileForm, role, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const buildProfileFormData = (data) => {
    const formData = new FormData();

    appendIfNotEmpty(formData, "gender", data.gender);
    appendIfNotEmpty(formData, "ethnicity", data.ethnicity);
    appendIfNotEmpty(formData, "age", toNumberOrEmpty(data.age));
    appendIfNotEmpty(formData, "city", data.city);
    appendIfNotEmpty(formData, "height", toNumberOrEmpty(data.height));
    appendIfNotEmpty(formData, "style", data.style);
    appendIfNotEmpty(formData, "appearance", data.appearance);
    appendIfNotEmpty(formData, "studyPlace", data.studyPlace);
    appendIfNotEmpty(formData, "occupation", data.occupation);
    appendIfNotEmpty(formData, "financialCapabilities", toNumberOrEmpty(data.financialCapabilities));
    appendIfNotEmpty(formData, "description", data.description);

    if (imageFile) formData.append("image", imageFile);
    if (pdfFile) formData.append("resumePdf", pdfFile);

    return formData;
  };

  const onUpdateProfile = async (data) => {
    try {
      setProfileSubmitting(true);
      setErrorMessage("");

      const formData = buildProfileFormData(data);

      const response = profileExists
        ? await updateProfile(formData)
        : await createProfile(formData);

      const profile = response?.profile || response;

      setProfileExists(true);
      setImageFile(null);
      setPdfFile(null);
      fillProfileForm(profile);
      setIsEditingProfile(false);
      setSuccessOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "לא הצלחנו לשמור את הפרופיל");
    } finally {
      setProfileSubmitting(false);
    }
  };

  const buildPreferencesPayload = (data) => ({
    ageMin: toNumberOrEmpty(data.ageMin),
    ageMax: toNumberOrEmpty(data.ageMax),
    heightMin: toNumberOrEmpty(data.heightMin),
    heightMax: toNumberOrEmpty(data.heightMax),
    style: data.style || "",
    preferredAppearances: Array.isArray(data.preferredAppearances)
      ? data.preferredAppearances
      : [],
    financialRequirementMin: toNumberOrEmpty(data.financialRequirementMin),
  });

  const onUpdatePreferences = async (data) => {
    try {
      setPreferencesSubmitting(true);
      setErrorMessage("");

      const payload = buildPreferencesPayload(data);

      const response = preferencesExists
        ? await updatePreferences(payload)
        : await createPreferences(payload);

      const preferences = response?.preferences || response;

      setPreferencesExists(true);
      fillPreferencesForm(preferences);
      setIsEditingPreferences(false);
      setSuccessOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "לא הצלחנו לשמור את ההעדפות");
    } finally {
      setPreferencesSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (role === "admin") {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          אזור מנהל
        </Typography>

        <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
          <Button variant="contained" onClick={() => navigate("/admin")}>
            אזור מנהל
          </Button>

          <Button variant="contained" onClick={() => navigate("/admin/users")}>
            כל המשתמשים
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate("/admin/pending-matches")}
          >
            הצעות שממתינות לטיפול
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        האזור האישי
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          onClick={() => setIsEditingProfile((prev) => !prev)}
        >
          {profileExists ? "עדכון פרופיל" : "יצירת פרופיל"}
        </Button>

        <Button
          variant="contained"
          onClick={() => setIsEditingPreferences((prev) => !prev)}
        >
          {preferencesExists ? "עדכון העדפות" : "יצירת העדפות"}
        </Button>

        <Button variant="contained" onClick={() => navigate("/matches")}>
          התאמות
        </Button>

        <Button variant="contained" onClick={() => navigate("/interests")}>
          התעניינויות
        </Button>
      </Stack>

      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Typography variant="h5" gutterBottom>
          הפרופיל שלי
        </Typography>

        {profileExists ? (
          <Stack spacing={1}>
            <Typography>מקום לימודים: {profileData?.studyPlace || "לא צוין"}</Typography>
            <Typography>מקצוע: {profileData?.occupation || "לא צוין"}</Typography>
            <Typography>עיר: {profileData?.city || "לא צוין"}</Typography>
            <Typography>גיל: {profileData?.age || "לא צוין"}</Typography>
            <Typography>גובה: {profileData?.height || "לא צוין"}</Typography>
            <Typography>סגנון: {labelByValue(styleOptions, profileData?.style)}</Typography>
            <Typography>מראה חיצוני: {labelByValue(appearanceOptions, profileData?.appearance)}</Typography>
            <Typography>
              יכולות כספיות: {profileData?.financialCapabilities ?? "לא צוין"}
            </Typography>
            <Typography>תיאור: {profileData?.description || "לא צוין"}</Typography>

            {profileData?.image && (
              <Button
                variant="outlined"
                href={normalizeFileUrl(profileData.image)}
                target="_blank"
                rel="noreferrer"
              >
                צפייה בתמונה
              </Button>
            )}

            {profileData?.resumePdf && (
              <Button
                variant="outlined"
                href={normalizeFileUrl(profileData.resumePdf)}
                target="_blank"
                rel="noreferrer"
              >
                צפייה בקובץ PDF
              </Button>
            )}
          </Stack>
        ) : (
          <Typography>עדיין לא נוצר פרופיל.</Typography>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Typography variant="h5" gutterBottom>
          ההעדפות שלי
        </Typography>

        {preferencesExists ? (
          <Stack spacing={1}>
            <Typography>גיל: {preferencesData?.ageMin || "לא צוין"} - {preferencesData?.ageMax || "לא צוין"}</Typography>
            <Typography>גובה: {preferencesData?.heightMin || "לא צוין"} - {preferencesData?.heightMax || "לא צוין"}</Typography>
            <Typography>סגנון: {labelByValue(styleOptions, preferencesData?.style)}</Typography>
            <Typography>
              מראה חיצוני מועדף: {labelsByValues(appearanceOptions, preferencesData?.preferredAppearances)}
            </Typography>
            <Typography>
              מינימום דרישות כספיות: {preferencesData?.financialRequirementMin ?? "לא צוין"}
            </Typography>
          </Stack>
        ) : (
          <Typography>עדיין לא נוצרו העדפות.</Typography>
        )}
      </Paper>

      {isEditingProfile && (
        <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
          <Typography variant="h5" gutterBottom>
            {profileExists ? "עדכון פרופיל" : "יצירת פרופיל"}
          </Typography>

          <Box
            component="form"
            onSubmit={handleProfileSubmit(onUpdateProfile)}
            noValidate
            sx={{ display: "grid", gap: 2 }}
          >
            <Controller
              name="gender"
              control={profileControl}
              render={({ field }) => (
                <FormControl fullWidth required>
                  <InputLabel>מין</InputLabel>
                  <Select label="מין" {...field}>
                    {genderOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="ethnicity"
              control={profileControl}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>עדה</InputLabel>
                  <Select label="עדה" {...field}>
                    <MenuItem value="">לא נבחר</MenuItem>
                    {ethnicityOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="age"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="גיל" type="number" fullWidth />
              )}
            />

            <Controller
              name="city"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="עיר" fullWidth />
              )}
            />

            <Controller
              name="height"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="גובה" type="number" fullWidth />
              )}
            />

            <Controller
              name="style"
              control={profileControl}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>סגנון</InputLabel>
                  <Select label="סגנון" {...field}>
                    <MenuItem value="">לא נבחר</MenuItem>
                    {styleOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="appearance"
              control={profileControl}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>מראה חיצוני</InputLabel>
                  <Select label="מראה חיצוני" {...field}>
                    <MenuItem value="">לא נבחר</MenuItem>
                    {appearanceOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="studyPlace"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="מקום לימודים" fullWidth />
              )}
            />

            <Controller
              name="occupation"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="מקצוע" fullWidth />
              )}
            />

            <Controller
              name="financialCapabilities"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="יכולות כספיות"
                  type="number"
                  fullWidth
                />
              )}
            />

            <Controller
              name="description"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="תיאור"
                  multiline
                  minRows={3}
                  fullWidth
                />
              )}
            />

            <Button variant="outlined" component="label">
              העלאת תמונה
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] || null)
                }
              />
            </Button>

            {imageFile && <Typography>{imageFile.name}</Typography>}

            <Button variant="outlined" component="label">
              העלאת PDF
              <input
                hidden
                type="file"
                accept="application/pdf"
                onChange={(event) =>
                  setPdfFile(event.target.files?.[0] || null)
                }
              />
            </Button>

            {pdfFile && <Typography>{pdfFile.name}</Typography>}

            <Button
              variant="contained"
              type="submit"
              disabled={profileSubmitting}
            >
              {profileSubmitting ? "שומר..." : "שמירת פרופיל"}
            </Button>
          </Box>
        </Paper>
      )}

      {isEditingPreferences && (
        <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
          <Typography variant="h5" gutterBottom>
            {preferencesExists ? "עדכון העדפות" : "יצירת העדפות"}
          </Typography>

          <Box
            component="form"
            onSubmit={handlePreferencesSubmit(onUpdatePreferences)}
            noValidate
            sx={{ display: "grid", gap: 2 }}
          >
            <Controller
              name="ageMin"
              control={preferencesControl}
              render={({ field }) => (
                <TextField {...field} label="גיל מינימום" type="number" fullWidth />
              )}
            />

            <Controller
              name="ageMax"
              control={preferencesControl}
              render={({ field }) => (
                <TextField {...field} label="גיל מקסימום" type="number" fullWidth />
              )}
            />

            <Controller
              name="heightMin"
              control={preferencesControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="גובה מינימום"
                  type="number"
                  fullWidth
                />
              )}
            />

            <Controller
              name="heightMax"
              control={preferencesControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="גובה מקסימום"
                  type="number"
                  fullWidth
                />
              )}
            />

            <Controller
              name="style"
              control={preferencesControl}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>סגנון</InputLabel>
                  <Select label="סגנון" {...field}>
                    <MenuItem value="">לא נבחר</MenuItem>
                    {styleOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="preferredAppearances"
              control={preferencesControl}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>מראה חיצוני מועדף</InputLabel>
                  <Select
                    multiple
                    label="מראה חיצוני מועדף"
                    value={field.value || []}
                    onChange={field.onChange}
                    input={<OutlinedInput label="מראה חיצוני מועדף" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((value) => (
                          <Chip key={value} label={labelByValue(appearanceOptions, value)} />
                        ))}
                      </Box>
                    )}
                  >
                    {appearanceOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Checkbox checked={(field.value || []).includes(option.value)} />
                        <ListItemText primary={option.label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="financialRequirementMin"
              control={preferencesControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="מינימום דרישות כספיות"
                  type="number"
                  fullWidth
                />
              )}
            />

            <Button
              variant="contained"
              type="submit"
              disabled={preferencesSubmitting}
            >
              {preferencesSubmitting ? "שומר..." : "שמירת העדפות"}
            </Button>
          </Box>
        </Paper>
      )}

      <Snackbar
        open={successOpen}
        autoHideDuration={4000}
        onClose={() => setSuccessOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          נשמר בהצלחה
        </Alert>
      </Snackbar>
    </Container>
  );
}
