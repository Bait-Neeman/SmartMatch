import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
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
  return Number(value);
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

  if (path.startsWith("/")) {
    return `${baseUrl}${path}`;
  }

  if (path.startsWith("uploads/")) {
    return `${baseUrl}/${path}`;
  }

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

export default function PersonalAreaPage() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const token = localStorage.getItem("token");

  const [profileExists, setProfileExists] = useState(false);
  const [preferencesExists, setPreferencesExists] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const [loadingData, setLoadingData] = useState(true);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [preferencesSubmitting, setPreferencesSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const storedUserName = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"))?.name || "";
    } catch {
      return "";
    }
  })();

  const displayName = storedUserName || profileData?.name || profileData?.user?.name || "לא צוין";

  const previewButtonSx = {
    borderColor: '#1f4aac',
    color: '#1f4aac',
    '&:hover': { bgcolor: 'rgba(31,63,149,0.05)' },
    width: 170,
    minWidth: 170,
    py: 1,
    textTransform: 'none',
  };

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
    appendIfNotEmpty(formData, "financialRequirement", data.financialRequirement);
    appendIfNotEmpty(formData, "financialCapabilities", data.financialCapabilities);
    appendIfNotEmpty(formData, "financialStatus", toNumberOrEmpty(data.financialStatus));
    appendIfNotEmpty(formData, "yeshiva", data.yeshiva);
    appendIfNotEmpty(formData, "seminar", data.seminar);
    appendIfNotEmpty(formData, "occupation", data.occupation);
    appendIfNotEmpty(formData, "description", data.description);

    if (imageFile) {
      formData.append("image", imageFile);
    }

    if (pdfFile) {
      formData.append("resumePdf", pdfFile);
    }

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
    city: data.city || "",
    heightMin: toNumberOrEmpty(data.heightMin),
    heightMax: toNumberOrEmpty(data.heightMax),
    style: data.style || "",
    preferredAppearance: data.preferredAppearance || "",
    financialMin: toNumberOrEmpty(data.financialMin),
    financialMax: toNumberOrEmpty(data.financialMax),
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

          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
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
    <Container
      maxWidth="md"
      sx={{
        py: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{ color: "#1f3f95", textAlign: "center", fontWeight: 700 }}
      >
        האזור האישי
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3, flexWrap: "wrap", justifyContent: "center", width: "100%" }}
      >
        <Button
          variant="contained"
          onClick={() => setIsEditingProfile((prev) => !prev)}
          sx={{
            bgcolor: "#1f4aac",
            color: "#f8d25d",
            '&:hover': { bgcolor: '#163e86' },
          }}
        >
          {profileExists ? "עדכון פרופיל" : "יצירת פרופיל"}
        </Button>

        <Button
          variant="contained"
          onClick={() => setIsEditingPreferences((prev) => !prev)}
          sx={{
            bgcolor: "#1f4aac",
            color: "#f8d25d",
            '&:hover': { bgcolor: '#163e86' },
          }}
        >
          {preferencesExists ? "עדכון העדפות" : "יצירת העדפות"}
        </Button>

<Button
          variant="contained"
          onClick={() => navigate("/matches")}
          sx={{
            bgcolor: "#1f4aac",
            color: "#f8d25d",
            '&:hover': { bgcolor: '#163e86' },
          }}
        >
          התאמות
        </Button>

        <Button
          variant="contained"
          onClick={() => navigate("/interests")}
          sx={{
            bgcolor: "#1f4aac",
            color: "#f8d25d",
            '&:hover': { bgcolor: '#163e86' },
          }}
        >
          התעניינויות
        </Button>
      </Stack>

      <Paper
        sx={{
          p: 3,
          mb: 3,
          textAlign: "center",
          bgcolor: "#f8fbff",
          border: "1px solid rgba(31,63,149,0.12)",
        }}
        elevation={2}
      >
        <Typography variant="h5" gutterBottom sx={{ textAlign: "center", color: '#1f3f95' }}>
          הפרופיל שלי
        </Typography>

        {profileExists ? (
          <Stack spacing={1} alignItems="center" sx={{ width: '100%', textAlign: 'center', wordBreak: 'break-word' }}>
            <Typography sx={{ wordBreak: 'break-word' }}>שם: {displayName}</Typography>
            <Typography>גיל: {profileData?.age || "לא צוין"}</Typography>
            <Typography>גובה: {profileData?.height || "לא צוין"}</Typography>
            <Typography>סגנון: {profileData?.style || "לא צוין"}</Typography>
            <Typography>תיאור: {profileData?.description || "לא צוין"}</Typography>
          </Stack>
        ) : (
          <Typography>עדיין לא נוצר פרופיל.</Typography>
        )}
      </Paper>

      {profileExists && (
        <Paper
          sx={{
            p: 3,
            mb: 3,
            textAlign: "center",
            bgcolor: "#f8fbff",
            border: "1px solid rgba(31,63,149,0.12)",
          }}
          elevation={2}
        >
          <Typography variant="h5" gutterBottom sx={{ textAlign: "center", color: '#1f3f95' }}>
            קבצים
          </Typography>

          <Stack spacing={2} alignItems="center">
            {profileData?.image ? (
              <Button
                variant="outlined"
                href={normalizeFileUrl(profileData.image)}
                target="_blank"
                rel="noreferrer"
                sx={previewButtonSx}
              >
                צפייה בתמונה
              </Button>
            ) : (
              <Typography sx={{ color: '#999' }}>לא הוערה תמונה</Typography>
            )}

            {profileData?.resumePdf ? (
              <Button
                variant="outlined"
                href={normalizeFileUrl(profileData.resumePdf)}
                target="_blank"
                rel="noreferrer"
                sx={previewButtonSx}
              >
                צפייה בקובץ PDF
              </Button>
            ) : (
              <Typography sx={{ color: '#999' }}>לא הועלה קובץ PDF</Typography>
            )}
          </Stack>
        </Paper>
      )}

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
                  <InputLabel>מראה</InputLabel>
                  <Select label="מראה" {...field}>
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
              name="financialRequirement"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="דרישה כספית" fullWidth />
              )}
            />

            <Controller
              name="financialCapabilities"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="יכולת כספית" fullWidth />
              )}
            />

            <Controller
              name="financialStatus"
              control={profileControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="מדד כספי להתאמה"
                  type="number"
                  fullWidth
                />
              )}
            />

            <Controller
              name="yeshiva"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="ישיבה" fullWidth />
              )}
            />

            <Controller
              name="seminar"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="סמינר" fullWidth />
              )}
            />

            <Controller
              name="occupation"
              control={profileControl}
              render={({ field }) => (
                <TextField {...field} label="עיסוק" fullWidth />
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

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
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

              {profileData?.image && !imageFile && (
                <Button
                  variant="outlined"
                  href={normalizeFileUrl(profileData.image)}
                  target="_blank"
                  rel="noreferrer"
                  sx={previewButtonSx}
                >
                  צפייה בתמונה הנוכחית
                </Button>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
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

              {profileData?.resumePdf && !pdfFile && (
                <Button
                  variant="outlined"
                  href={normalizeFileUrl(profileData.resumePdf)}
                  target="_blank"
                  rel="noreferrer"
                  sx={previewButtonSx}
                >
                  צפייה בקובץ PDF הנוכחי
                </Button>
              )}
            </Box>

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
              name="city"
              control={preferencesControl}
              render={({ field }) => (
                <TextField {...field} label="עיר" fullWidth />
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
              name="preferredAppearance"
              control={preferencesControl}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>מראה מועדף</InputLabel>
                  <Select label="מראה מועדף" {...field}>
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
              name="financialMin"
              control={preferencesControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="מדד כספי מינימום"
                  type="number"
                  fullWidth
                />
              )}
            />

            <Controller
              name="financialMax"
              control={preferencesControl}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="מדד כספי מקסימום"
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