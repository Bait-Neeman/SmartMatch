import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { createPreferences } from "../services/preference.service.js";

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

export default function PreferencesPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
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

  const onSubmit = async (values) => {
    setApiError("");
    setIsSubmitting(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setApiError("נדרש אימות לפני שמירת העדפות");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      ageMin: values.ageMin === "" ? undefined : Number(values.ageMin),
      ageMax: values.ageMax === "" ? undefined : Number(values.ageMax),
      city: values.city || undefined,
      heightMin: values.heightMin === "" ? undefined : Number(values.heightMin),
      heightMax: values.heightMax === "" ? undefined : Number(values.heightMax),
      style: values.style || undefined,
      preferredAppearance: values.preferredAppearance || undefined,
      financialMin: values.financialMin === "" ? undefined : Number(values.financialMin),
      financialMax: values.financialMax === "" ? undefined : Number(values.financialMax),
    };

    console.log("Preferences payload:", payload);

    try {
      const response = await createPreferences(payload, token);
      console.log("Preferences response:", response);
      navigate("/personal-area");
    } catch (error) {
      console.error("Preferences error:", error);
      const message = error?.response?.data?.message || error.message || "שגיאה בשמירת העדפות";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        העדפות
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: "grid", gap: 2 }}>
        <Controller
          name="ageMin"
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן גיל מינימום תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="גיל מינימום"
              type="number"
              error={Boolean(errors.ageMin)}
              helperText={errors.ageMin ? errors.ageMin.message : ""}
              fullWidth
            />
          )}
        />

        <Controller
          name="ageMax"
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן גיל מקסימום תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="גיל מקסימום"
              type="number"
              error={Boolean(errors.ageMax)}
              helperText={errors.ageMax ? errors.ageMax.message : ""}
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
          name="heightMin"
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן גובה מינימום תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="גובה מינימום"
              type="number"
              error={Boolean(errors.heightMin)}
              helperText={errors.heightMin ? errors.heightMin.message : ""}
              fullWidth
            />
          )}
        />

        <Controller
          name="heightMax"
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן גובה מקסימום תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="גובה מקסימום"
              type="number"
              error={Boolean(errors.heightMax)}
              helperText={errors.heightMax ? errors.heightMax.message : ""}
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
          name="preferredAppearance"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel id="appearance-label">מראה חיצוני מועדף</InputLabel>
              <Select labelId="appearance-label" label="מראה חיצוני מועדף" {...field}>
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
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן סכום כלכלי מינימלי תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="מצב כלכלי מינימום"
              type="number"
              error={Boolean(errors.financialMin)}
              helperText={errors.financialMin ? errors.financialMin.message : ""}
              fullWidth
            />
          )}
        />

        <Controller
          name="financialMax"
          control={control}
          rules={{
            pattern: { value: /^[0-9]*$/, message: "הזן סכום כלכלי מקסימלי תקין" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="מצב כלכלי מקסימום"
              type="number"
              error={Boolean(errors.financialMax)}
              helperText={errors.financialMax ? errors.financialMax.message : ""}
              fullWidth
            />
          )}
        />

        {apiError && (
          <Typography color="error.main" sx={{ mt: 1 }}>
            {apiError}
          </Typography>
        )}

        <Button type="submit" variant="contained" color="primary" disabled={isSubmitting}>
          {isSubmitting ? "שולח..." : "שמירת העדפות"}
        </Button>
      </Box>
    </Container>
  );
}
