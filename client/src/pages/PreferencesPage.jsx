import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createPreferences } from "../services/preference.service.js";
import { appearanceOptions, styleOptions } from "../constants/profileOptions.js";

const numberRule = (message) => ({ pattern: { value: /^[0-9]*$/, message } });

const fullRow = { gridColumn: "1 / -1" };

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

    try {
      await createPreferences(payload);
      navigate("/personal-area");
    } catch (error) {
      const message = error?.response?.data?.message || error.message || "שגיאה בשמירת העדפות";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const numberField = (name, label, message) => (
    <Controller
      name={name}
      control={control}
      rules={numberRule(message)}
      render={({ field }) => (
        <TextField
          {...field}
          label={label}
          type="number"
          error={Boolean(errors[name])}
          helperText={errors[name] ? errors[name].message : ""}
          fullWidth
        />
      )}
    />
  );

  const selectField = (name, label, options) => (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControl fullWidth>
          <InputLabel id={`${name}-label`}>{label}</InputLabel>
          <Select labelId={`${name}-label`} label={label} {...field}>
            <MenuItem value="">לא משנה</MenuItem>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    />
  );

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Chip label="שלב 2 מתוך 2" color="primary" variant="outlined" sx={{ fontWeight: 700, mb: 1.5 }} />
        <Typography variant="h4" component="h1" sx={{ color: "text.primary", fontWeight: 700 }}>
          מה חשוב לך?
        </Typography>
        <Typography sx={{ color: "text.secondary", mt: 1 }}>
          ההעדפות עוזרות לנו להציג לך התאמות מדויקות. כל השדות רשות – שדה שנשאר ריק לא מגביל את החיפוש.
        </Typography>
      </Box>

      <Paper
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: "16px",
          border: "1px solid rgba(29, 53, 87, 0.08)",
          boxShadow: "0 10px 28px rgba(4, 15, 32, 0.06)",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}
        >
          {numberField("ageMin", "גיל מינימום", "הזן גיל מינימום תקין")}
          {numberField("ageMax", "גיל מקסימום", "הזן גיל מקסימום תקין")}
          {numberField("heightMin", 'גובה מינימום (ס"מ)', "הזן גובה מינימום תקין")}
          {numberField("heightMax", 'גובה מקסימום (ס"מ)', "הזן גובה מקסימום תקין")}

          <Controller
            name="city"
            control={control}
            render={({ field }) => <TextField {...field} label="עיר" fullWidth sx={fullRow} />}
          />

          {selectField("style", "סגנון", styleOptions)}
          {selectField("preferredAppearance", "מראה חיצוני מועדף", appearanceOptions)}
          {numberField("financialMin", "מצב כלכלי מינימום", "הזן סכום כלכלי מינימלי תקין")}
          {numberField("financialMax", "מצב כלכלי מקסימום", "הזן סכום כלכלי מקסימלי תקין")}

          {apiError && (
            <Alert severity="error" sx={fullRow}>
              {apiError}
            </Alert>
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ ...fullRow, mt: 1 }}>
            <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ flexGrow: 1 }}>
              {isSubmitting ? "שומר..." : "שמירת העדפות"}
            </Button>
            <Button
              variant="outlined"
              disabled={isSubmitting}
              onClick={() => navigate("/personal-area")}
              sx={{ boxShadow: "none" }}
            >
              דילוג – אמלא אחר כך
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Container>
  );
}
