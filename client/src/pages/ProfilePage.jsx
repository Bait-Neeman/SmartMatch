import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
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
  { value: "average", label: "ממוצע" },
  { value: "full", label: "מלא" },
  { value: "chubby", label: "שמן" },
];

const fieldSx = {
  width: "100%",
  '& .MuiOutlinedInput-root': {
    borderRadius: 3,
    minHeight: 56,
  },
  '& .MuiInputBase-input': {
    py: 1.5,
  },
  // Ensure Selects match TextField height and vertical alignment
  '& .MuiSelect-select': {
    display: 'flex',
    alignItems: 'center',
    height: 56,
    padding: '0 14px',
    boxSizing: 'border-box',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderRadius: 3,
  },
};

const selectSx = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 56,
  height: 56,
  px: 1.75,
  boxSizing: 'border-box',
};

const previewButtonSx = {
  minWidth: 130,
  height: 40,
  textTransform: 'none',
  borderRadius: 2,
  px: 2,
};

export default function ProfilePage() {
  const navigate = useNavigate();

  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [pdfPreview, setPdfPreview] = useState(null);
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

  // Create object URLs for previews and clean up
  useEffect(() => {
    let imgUrl;
    if (imageFile) {
      imgUrl = URL.createObjectURL(imageFile);
      setImagePreview(imgUrl);
    } else {
      setImagePreview(null);
    }
    return () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
  }, [imageFile]);

  useEffect(() => {
    let pdfUrl;
    if (pdfFile) {
      pdfUrl = URL.createObjectURL(pdfFile);
      setPdfPreview(pdfUrl);
    } else {
      setPdfPreview(null);
    }
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfFile]);

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
      if (imageFile) requestData.append("image", imageFile);
      if (pdfFile) requestData.append("resumePdf", pdfFile);
    }

    try {
      const response = await createProfile(requestData, token);
      setSuccessMessage("הפרופיל נוצר בהצלחה");
      setTimeout(() => navigate("/preferences"), 750);
    } catch (error) {
      const message = error?.response?.data?.message || error.message || "שגיאה בשמירת הפרופיל";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container
      maxWidth="sm"
      sx={{
        backgroundColor: "#f3f6ff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        py: 6,
      }}
    >
      <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#1f3f95', textAlign: 'center' }}>
        יצירת פרופיל
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: "grid", gap: 2, width: "100%", maxWidth: 720, backgroundColor: '#ffffff', borderRadius: 3, boxShadow: '0 6px 20px rgba(31,63,149,0.08)', p: 4 }}>
        <Controller
          name="gender"
          control={control}
          rules={{ required: "מגדר הוא שדה חובה" }}
          render={({ field }) => (
            <FormControl fullWidth error={Boolean(errors.gender)} sx={fieldSx}>
              <InputLabel id="gender-label">מגדר</InputLabel>
              <Select sx={selectSx} labelId="gender-label" label="מגדר" {...field}>
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
            <FormControl fullWidth sx={fieldSx}>
              <InputLabel id="ethnicity-label">עדה</InputLabel>
              <Select sx={selectSx} labelId="ethnicity-label" label="עדה" {...field}>
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
              sx={fieldSx}
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
              sx={fieldSx}
            />
          )}
        />

        <Controller
          name="height"
          control={control}
          rules={{ pattern: { value: /^[0-9]*$/, message: "הזן גובה תקין" } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="גובה"
              type="number"
              error={Boolean(errors.height)}
              helperText={errors.height ? errors.height.message : ""}
              fullWidth
              sx={fieldSx}
            />
          )}
        />

        <Grid container spacing={2} justifyContent="center" sx={{ width: "100%" }}>
          <Grid item xs={12} sm={6}>
            <Controller
              name="style"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={fieldSx}>
                  <InputLabel id="style-label">סגנון</InputLabel>
                  <Select sx={selectSx} labelId="style-label" label="סגנון" {...field}>
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
          </Grid>

          <Grid item xs={12} sm={6}>
            <Controller
              name="appearance"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth sx={fieldSx}>
                  <InputLabel id="appearance-label">מראה חיצוני</InputLabel>
                  <Select sx={selectSx} labelId="appearance-label" label="מראה חיצוני" {...field}>
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
          </Grid>
        </Grid>

        <Controller
          name="financialRequirement"
          control={control}
          rules={{ pattern: { value: /^[0-9]*$/, message: "הזן מצב כלכלי תקין" } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="מצב כלכלי"
              type="number"
              error={Boolean(errors.financialRequirement)}
              helperText={errors.financialRequirement ? errors.financialRequirement.message : ""}
              fullWidth
              sx={fieldSx}
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
              sx={fieldSx}
            />
          )}
        />

        <Grid container spacing={2} justifyContent="center" alignItems="stretch" sx={{ width: "100%" }}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1, textAlign: "center" }}>
              תמונת פרופיל (אופציונלי)
            </Typography>
            <Box
              component="label"
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                p: 2,
                borderRadius: 3,
                border: "1px dashed rgba(63, 113, 213, 0.35)",
                backgroundColor: "rgba(63, 113, 213, 0.06)",
                cursor: "pointer",
                textAlign: "center",
                minHeight: 120,
                transition: "background-color 0.2s ease",
                '&:hover': {
                  backgroundColor: "rgba(63, 113, 213, 0.1)",
                },
              }}
            >
              <input hidden type="file" accept="image/*" onChange={handleImageChange} />
              <CloudUpload sx={{ color: "#3f71d5", fontSize: 28 }} />
              <Typography sx={{ fontWeight: 600 }}>Upload Profile Image</Typography>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                PNG, JPG או GIF עד 5MB
              </Typography>
            </Box>
            {imageFile && (
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography variant="body2">נבחר קובץ: {imageFile.name}</Typography>
                {imagePreview && (
                  <Box component="img" src={imagePreview} alt="preview" sx={{ mt: 1, maxWidth: 240, maxHeight: 160, borderRadius: 1 }} />
                )}
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
                  {imagePreview && (
                    <Button component="a" href={imagePreview} target="_blank" rel="noopener" size="small" sx={{ ...previewButtonSx, bgcolor: '#3f71d5', color: '#fff', '&:hover': { bgcolor: '#345ec0' } }}>צפה</Button>
                  )}
                  {imagePreview && (
                    <Button component="a" href={imagePreview} download size="small" sx={previewButtonSx}>הורד</Button>
                  )}
                </Box>
              </Box>
            )}
            {imageError && (
              <Typography color="error.main" variant="body2" sx={{ mt: 1, textAlign: "center" }}>
                {imageError}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle1" sx={{ mb: 1, textAlign: "center" }}>
              קובץ קורות חיים PDF (אופציונלי)
            </Typography>
            <Box
              component="label"
              sx={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                p: 2,
                borderRadius: 3,
                border: "1px dashed rgba(63, 113, 213, 0.35)",
                backgroundColor: "rgba(63, 113, 213, 0.06)",
                cursor: "pointer",
                textAlign: "center",
                minHeight: 120,
                transition: "background-color 0.2s ease",
                '&:hover': {
                  backgroundColor: "rgba(63, 113, 213, 0.1)",
                },
              }}
            >
              <input hidden type="file" accept=".pdf,application/pdf" onChange={handleResumeChange} />
              <CloudUpload sx={{ color: "#3f71d5", fontSize: 28 }} />
              <Typography sx={{ fontWeight: 600 }}>Upload Resume PDF</Typography>
              <Typography variant="body2" sx={{ color: "#6b7280" }}>
                PDF עד 10MB
              </Typography>
            </Box>
            {pdfFile && (
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography variant="body2">נבחר קובץ: {pdfFile.name}</Typography>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
                  {pdfPreview && (
                    <Button component="a" href={pdfPreview} target="_blank" rel="noopener" size="small" sx={{ ...previewButtonSx, bgcolor: '#3f71d5', color: '#fff', '&:hover': { bgcolor: '#345ec0' } }}>צפה</Button>
                  )}
                  {pdfPreview && (
                    <Button component="a" href={pdfPreview} download size="small" sx={previewButtonSx}>הורד</Button>
                  )}
                </Box>
              </Box>
            )}
            {resumeError && (
              <Typography color="error.main" variant="body2" sx={{ mt: 1, textAlign: "center" }}>
                {resumeError}
              </Typography>
            )}
          </Grid>
        </Grid>

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

        <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ mx: 'auto', display: 'block', bgcolor: '#f6b042', color: '#10233b', borderRadius: 30, px: 4, py: 1.25, '&:hover': { bgcolor: '#e0a22f' } }}>
          {isSubmitting ? "שולח..." : "שמור והמשך"}
        </Button>
      </Box>
    </Container>
  );
}
