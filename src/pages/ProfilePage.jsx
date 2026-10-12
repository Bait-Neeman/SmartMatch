import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  Input,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { createProfile } from "../services/profile.service.js";

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
  { value: "open", label: "פתוח" },
];

const appearanceOptions = [
  { value: "slim", label: "רזה" },
  { value: "classic", label: "קלאסי" },
  { value: "full", label: "מלא" },
  { value: "chubby", label: "שמן" },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [imageError, setImageError] = useState("");
  const [resumeError, setResumeError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
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
      description: "",
    },
  });

  const isValidImageFile = (file) => file && file.type.startsWith("image/");
  const isValidPdfFile = (file) =>
    file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));

  const handleImageChange = (event) => {
    setImageError("");
    const file = event.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!isValidImageFile(file)) {
      setImageFile(null);
      setImageError("בחר קובץ תמונה חוקי (JPEG, PNG וכו')");
      return;
    }
    setImageFile(file);
  };

  const handleResumeChange = (event) => {
    setResumeError("");
    const file = event.target.files?.[0] || null;
    if (!file) {
      setPdfFile(null);
      return;
    }
    if (!isValidPdfFile(file)) {
      setPdfFile(null);
      setResumeError("בחר קובץ PDF חוקי");
      return;
    }
    setPdfFile(file);
  };

  const onSubmit = async (data) => {
    setApiError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    if (imageFile && !isValidImageFile(imageFile)) {
      setImageError("בחר קובץ תמונה חוקי (JPEG, PNG וכו')");
      setIsSubmitting(false);
      return;
    }
    if (pdfFile && !isValidPdfFile(pdfFile)) {
      setResumeError("בחר קובץ PDF חוקי");
      setIsSubmitting(false);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setApiError("נדרש אימות לפני שליחת הפרופיל");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      gender: data.gender,
      age: data.age === "" ? undefined : Number(data.age),
      city: data.city,
      height: data.height === "" ? undefined : Number(data.height),
      ethnicity: data.ethnicity || undefined,
      style: data.style || undefined,
      appearance: data.appearance || undefined,
      financialRequirement: data.financialRequirement === "" ? undefined : Number(data.financialRequirement),
      description: data.description || undefined,
    };

    const hasFiles = Boolean(imageFile || pdfFile);
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      requestData.append("gender", data.gender || "");
      requestData.append("age", data.age ?? "");
      requestData.append("city", data.city || "");
      requestData.append("height", data.height ?? "");
      requestData.append("ethnicity", data.ethnicity || "");
      requestData.append("style", data.style || "");
      requestData.append("appearance", data.appearance || "");
      requestData.append("financialRequirement", data.financialRequirement ?? "");
      requestData.append("description", data.description || "");
      if (imageFile) {
        requestData.append("image", imageFile);
      }
      if (pdfFile) {
        requestData.append("resumePdf", pdfFile);
      }
    }

    console.log("Profile payload:", hasFiles ? "FormData" : payload);

    try {
      const response = await createProfile(requestData, token);

      console.log("Profile response:", response);
      setSuccessMessage("הפרופיל נוצר בהצלחה");
      setTimeout(() => navigate("/preferences"), 750);
    } catch (error) {
      console.error("Create profile error:", error);
      const message = error?.response?.data?.message || error.message || "שגיאה בשמירת הפרופיל";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        יצירת פרופיל
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: "grid", gap: 2 }}>
        <Controller
          name="gender"
          control={control}
          rules={{ required: "מגדר הוא שדה חובה" }}
          render={({ field }) => (
            <FormControl fullWidth error={Boolean(errors.gender)}>
              <InputLabel id="gender-label">מגדר</InputLabel>
              <Select labelId="gender-label" label="מגדר" {...field}>
                {genderOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              {errors.gender && <FormHelperText>{errors.gender.message}</FormHelperText>}
            </FormControl>
          )}
        />

        <Controller
          name="ethnicity"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="ethnicity-label">עדה</InputLabel>
              <Select labelId="ethnicity-label" label="עדה" {...field}>
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
          control={control}
          rules={{
            required: "גיל הוא שדה חובה",
            pattern: { value: /^[0-9]+$/, message: "הזן גיל תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="גיל"
              type="number"
              error={Boolean(errors.age)}
              helperText={errors.age ? errors.age.message : ""}
              fullWidth
            />
          )}
        />

        <Controller
          name="city"
          control={control}
          rules={{ required: "עיר היא שדה חובה" }}
          render={({ field }) => (
            <TextField
              {...field}
              label="עיר"
              error={Boolean(errors.city)}
              helperText={errors.city ? errors.city.message : ""}
              fullWidth
            />
          )}
        />

        <Controller
          name="height"
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן גובה תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="גובה"
              type="number"
              error={Boolean(errors.height)}
              helperText={errors.height ? errors.height.message : ""}
              fullWidth
            />
          )}
        />

        <Controller
          name="style"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="style-label">סגנון</InputLabel>
              <Select labelId="style-label" label="סגנון" {...field}>
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
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="appearance-label">מראה חיצוני</InputLabel>
              <Select labelId="appearance-label" label="מראה חיצוני" {...field}>
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
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן מצב כלכלי תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="מצב כלכלי"
              type="number"
              error={Boolean(errors.financialRequirement)}
              helperText={errors.financialRequirement ? errors.financialRequirement.message : ""}
              fullWidth
            />
          )}
        />

        <Controller
          name="description"
          control={control}
          rules={{ maxLength: { value: 500, message: "תיאור יכול להכיל עד 500 תווים" } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="תיאור"
              multiline
              minRows={4}
              error={Boolean(errors.description)}
              helperText={errors.description ? errors.description.message : ""}
              fullWidth
            />
          )}
        />

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            תמונת פרופיל (אופציונלי)
          </Typography>
          <Input
            type="file"
            inputProps={{ accept: "image/*" }}
            onChange={handleImageChange}
            disableUnderline
          />
          {imageFile && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              נבחר קובץ: {imageFile.name}
            </Typography>
          )}
          {imageError && (
            <Typography color="error.main" variant="body2" sx={{ mt: 1 }}>
              {imageError}
            </Typography>
          )}
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            קובץ קורות חיים PDF (אופציונלי)
          </Typography>
          <Input
            type="file"
            inputProps={{ accept: ".pdf,application/pdf" }}
            onChange={handleResumeChange}
            disableUnderline
          />
          {pdfFile && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              נבחר קובץ: {pdfFile.name}
            </Typography>
          )}
          {resumeError && (
            <Typography color="error.main" variant="body2" sx={{ mt: 1 }}>
              {resumeError}
            </Typography>
          )}
        </Box>

        {apiError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {apiError}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 1 }}>
            {successMessage}
          </Alert>
        )}

        <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
          {isSubmitting ? "שולח..." : "שמור והמשך"}
        </Button>
      </Box>
    </Container>
  );
}