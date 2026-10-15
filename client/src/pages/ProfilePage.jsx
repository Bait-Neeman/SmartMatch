import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import { getImageFileError, getPdfFileError, IMAGE_ACCEPT } from "../utils/files.js";
import {
  appearanceOptions,
  ethnicityOptions,
  genderOptions,
  styleOptions,
} from "../constants/profileOptions.js";

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
      financialStatus: "",
      description: "",
    },
  });

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? getImageFileError(file) : "";
    setImageError(error);
    setImageFile(error ? null : file);
  };

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? getPdfFileError(file) : "";
    setResumeError(error);
    setPdfFile(error ? null : file);
  };

  // Local preview URLs for the chosen files, released when replaced or when the page closes
  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  const pdfPreview = useMemo(() => (pdfFile ? URL.createObjectURL(pdfFile) : null), [pdfFile]);

  useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview]);
  useEffect(() => () => pdfPreview && URL.revokeObjectURL(pdfPreview), [pdfPreview]);

  const onSubmit = async (data) => {
    setApiError("");
    setSuccessMessage("");
    setIsSubmitting(true);

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
      financialStatus: data.financialStatus === "" ? undefined : Number(data.financialStatus),
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
      requestData.append("financialStatus", data.financialStatus ?? "");
      requestData.append("description", data.description || "");
      if (imageFile) requestData.append("image", imageFile);
      if (pdfFile) requestData.append("resumePdf", pdfFile);
    }

    try {
      await createProfile(requestData);
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: { xs: 3, sm: 5 },
      }}
    >
      <Chip label="שלב 1 מתוך 2" color="primary" variant="outlined" sx={{ fontWeight: 700, mb: 1.5 }} />
      <Typography variant="h4" component="h1" sx={{ color: 'text.primary', textAlign: 'center', fontWeight: 700 }}>
        יצירת פרופיל
      </Typography>
      <Typography sx={{ color: "text.secondary", textAlign: "center", mt: 1, mb: 3 }}>
        כמה פרטים בסיסיים, כדי שנוכל להציע לך התאמות. שדות המסומנים בכוכבית הם חובה.
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: "grid", gap: 2, width: "100%", maxWidth: 720, backgroundColor: '#ffffff', borderRadius: 3, boxShadow: '0 10px 28px rgba(4, 15, 32, 0.06)', p: 4 }}>
        <Controller
          name="gender"
          control={control}
          rules={{ required: "מגדר הוא שדה חובה" }}
          render={({ field }) => (
            <FormControl fullWidth required error={Boolean(errors.gender)} sx={fieldSx}>
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
              required
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
              label='גובה (בס"מ)'
              type="number"
              error={Boolean(errors.height)}
              helperText={errors.height ? errors.height.message : ""}
              fullWidth
              sx={fieldSx}
            />
          )}
        />

        <Grid container spacing={2} sx={{ width: "100%", justifyContent: "center" }}>
          <Grid size={{ xs: 12, sm: 6 }}>
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

          <Grid size={{ xs: 12, sm: 6 }}>
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
          name="financialStatus"
          control={control}
          rules={{ pattern: { value: /^[0-9]*$/, message: "הזן מצב כלכלי תקין" } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="מצב כלכלי"
              type="number"
              error={Boolean(errors.financialStatus)}
              helperText={errors.financialStatus ? errors.financialStatus.message : ""}
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

        <Grid container spacing={2} sx={{ width: "100%", justifyContent: "center", alignItems: "stretch" }}>
          <Grid size={12}>
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
                border: "1px dashed rgba(151, 166, 188, 0.9)",
                backgroundColor: "rgba(29, 53, 87, 0.04)",
                cursor: "pointer",
                textAlign: "center",
                minHeight: 120,
                transition: "background-color 0.2s ease",
                '&:hover': {
                  backgroundColor: "rgba(29, 53, 87, 0.08)",
                },
              }}
            >
              <input hidden type="file" accept={IMAGE_ACCEPT} onChange={handleImageChange} />
              <CloudUpload sx={{ color: "primary.main", fontSize: 28 }} />
              <Typography sx={{ fontWeight: 600 }}>העלאת תמונת פרופיל</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                JPG, PNG, GIF או WEBP עד 10MB
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
                    <Button component="a" href={imagePreview} target="_blank" rel="noopener" size="small" sx={{ ...previewButtonSx, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}>צפה</Button>
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

          <Grid size={12}>
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
                border: "1px dashed rgba(151, 166, 188, 0.9)",
                backgroundColor: "rgba(29, 53, 87, 0.04)",
                cursor: "pointer",
                textAlign: "center",
                minHeight: 120,
                transition: "background-color 0.2s ease",
                '&:hover': {
                  backgroundColor: "rgba(29, 53, 87, 0.08)",
                },
              }}
            >
              <input hidden type="file" accept="application/pdf" onChange={handleResumeChange} />
              <CloudUpload sx={{ color: "primary.main", fontSize: 28 }} />
              <Typography sx={{ fontWeight: 600 }}>העלאת קורות חיים</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                PDF עד 10MB
              </Typography>
            </Box>
            {pdfFile && (
              <Box sx={{ mt: 1, textAlign: 'center' }}>
                <Typography variant="body2">נבחר קובץ: {pdfFile.name}</Typography>
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
                  {pdfPreview && (
                    <Button component="a" href={pdfPreview} target="_blank" rel="noopener" size="small" sx={{ ...previewButtonSx, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}>צפה</Button>
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

        <Button type="submit" variant="contained" disabled={isSubmitting} color="secondary" sx={{ mx: 'auto', display: 'block', px: 4, py: 1.25 }}>
          {isSubmitting ? "שולח..." : "שמור והמשך"}
        </Button>
      </Box>
    </Container>
  );
}
