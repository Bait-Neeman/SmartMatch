import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { brand } from "../theme/tokens.js";
import { setOnboardingPath } from "../utils/session.js";
import { createPreferences, getMyPreferences, updatePreferences } from "../services/preference.service.js";
import { getMyProfile, updateProfile } from "../services/profile.service.js";
import { appearanceOptions, ethnicityOptions, maritalStatusOptions, styleOptions } from "../constants/profileOptions.js";

const empty = {
  ageMin: "",
  ageMax: "",
  city: "",
  heightMin: "",
  heightMax: "",
  style: "",
  preferredAppearance: "",
  financialMin: "",
  financialMax: "",
  preferredMaritalStatus: "",
  preferredEthnicity: "",
  preferredYeshiva: "",
  preferredSeminar: "",
  lookingFor: "",
  maritalStatus: "",
  financialDemand: "",
  financialParticipation: "",
};

const numberOrEmpty = (value) => (value === "" || value == null ? "" : Number(value));

const pageTitleSx = {
  m: 0,
  fontWeight: 600,
  letterSpacing: "-0.3px",
  color: brand.navy,
  fontSize: "clamp(22px, 1.9vw, 28px)",
  lineHeight: 1.2,
};

export default function PreferencesPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferencesExist, setPreferencesExist] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ defaultValues: empty });

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([getMyPreferences(), getMyProfile()])
      .then(([preferencesResult, profileResult]) => {
        if (ignore) return;
        const next = { ...empty };
        if (preferencesResult.status === "fulfilled") {
          const preferences = preferencesResult.value?.preferences;
          setPreferencesExist(Boolean(preferences));
          if (preferences) {
            next.ageMin = preferences.ageMin ?? "";
            next.ageMax = preferences.ageMax ?? "";
            next.city = preferences.city || "";
            next.heightMin = preferences.heightMin ?? "";
            next.heightMax = preferences.heightMax ?? "";
            next.style = preferences.style || "";
            next.preferredAppearance = preferences.preferredAppearance || "";
            next.financialMin = preferences.financialMin ?? "";
            next.financialMax = preferences.financialMax ?? "";
            next.preferredMaritalStatus = preferences.preferredMaritalStatus || "";
            next.preferredEthnicity = preferences.preferredEthnicity || "";
            next.preferredYeshiva = preferences.preferredYeshiva || "";
            next.preferredSeminar = preferences.preferredSeminar || "";
          }
        } else if (preferencesResult.reason?.response?.status !== 404) {
          throw preferencesResult.reason;
        }
        if (profileResult.status === "fulfilled") {
          const profile = profileResult.value?.profile;
          setProfileExists(Boolean(profile));
          if (profile) {
            next.lookingFor = profile.lookingFor || "";
            next.maritalStatus = profile.maritalStatus || "";
            next.financialDemand = profile.financialDemand ?? "";
            next.financialParticipation = profile.financialParticipation ?? "";
          }
        }
        reset(next);
      })
      .catch((error) => {
        if (!ignore) setApiError(error?.message || "לא הצלחנו לטעון העדפות");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reset]);

  const onSubmit = async (values) => {
    setApiError("");
    setIsSubmitting(true);

    const preferencePayload = {
      ageMin: numberOrEmpty(values.ageMin),
      ageMax: numberOrEmpty(values.ageMax),
      city: values.city || "",
      heightMin: numberOrEmpty(values.heightMin),
      heightMax: numberOrEmpty(values.heightMax),
      style: values.style || "",
      preferredAppearance: values.preferredAppearance || "",
      financialMin: numberOrEmpty(values.financialMin),
      financialMax: numberOrEmpty(values.financialMax),
      preferredMaritalStatus: values.preferredMaritalStatus || "",
      preferredEthnicity: values.preferredEthnicity || "",
      preferredYeshiva: values.preferredYeshiva || "",
      preferredSeminar: values.preferredSeminar || "",
    };

    try {
      if (preferencesExist) await updatePreferences(preferencePayload);
      else await createPreferences(preferencePayload);
      setPreferencesExist(true);

      if (profileExists) {
        await updateProfile({
          lookingFor: values.lookingFor || "",
          maritalStatus: values.maritalStatus || "",
          financialDemand: numberOrEmpty(values.financialDemand),
          financialParticipation: numberOrEmpty(values.financialParticipation),
          ageMin: numberOrEmpty(values.ageMin),
          ageMax: numberOrEmpty(values.ageMax),
          preferredMaritalStatus: values.preferredMaritalStatus || "",
        });
      }

      setOnboardingPath(null);
      navigate("/home");
    } catch (error) {
      setApiError(error?.response?.data?.message || error.message || "שגיאה בשמירת העדפות");
    } finally {
      setIsSubmitting(false);
    }
  };

  const numberField = (name, label, sx) => (
    <Controller
      name={name}
      control={control}
      rules={{ pattern: { value: /^[0-9]*$/, message: "הזן מספר תקין" } }}
      render={({ field }) => (
        <TextField
          {...field}
          label={label}
          type="number"
          error={Boolean(errors[name])}
          helperText={errors[name]?.message || ""}
          fullWidth={!sx}
          sx={sx}
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
          <Typography component="label" sx={{ mb: 0.5, color: "text.secondary", fontSize: 14 }}>
            {label}
          </Typography>
          <Select {...field} displayEmpty aria-label={label}>
            <MenuItem value="">לא משנה</MenuItem>
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {errors[name] && <FormHelperText error>{errors[name].message}</FormHelperText>}
        </FormControl>
      )}
    />
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography component="h1" sx={pageTitleSx}>
        העדפות התאמה
      </Typography>
      <Typography sx={{ mt: 0.75, mb: 2.25, color: "text.secondary", fontSize: 17 }}>
        מה חשוב לך אצל הצד השני – לפי ההעדפות האלה נבחרות ההצעות שלך
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{
          p: "clamp(16px, 1.6vw, 24px)",
          borderRadius: `${brand.radiusCard}px`,
          border: `1px solid ${brand.line}`,
          boxShadow: brand.shadow,
          bgcolor: "background.paper",
          maxWidth: 640,
        }}
      >
        <Typography component="h2" sx={{ m: 0, mb: 1.5, color: brand.navy, fontWeight: 600, fontSize: 15 }}>
          טווח גילאים
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, maxWidth: 420, mb: 2 }}>
          {numberField("ageMin", "מגיל", { width: 110, flex: "none" })}
          <Box sx={{ flex: 1, height: 4, borderRadius: 3, bgcolor: brand.navyWash }} />
          {numberField("ageMax", "עד גיל", { width: 110, flex: "none" })}
        </Box>

        <Typography component="h2" sx={{ m: 0, mb: 1, color: brand.navy, fontWeight: 600, fontSize: 15 }}>
          פרטים מועדפים
        </Typography>
        <Box sx={{ display: "grid", rowGap: 1.25 }}>
          {numberField("heightMin", 'גובה מינימום (ס"מ)')}
          {numberField("heightMax", 'גובה מקסימום (ס"מ)')}
          <Controller
            name="city"
            control={control}
            render={({ field }) => <TextField {...field} label="מגורים" placeholder="עיר או כמה ערים" fullWidth />}
          />
          {selectField("preferredMaritalStatus", "סטטוס", maritalStatusOptions)}
          {selectField("style", "סגנון", styleOptions)}
          {selectField("preferredAppearance", "מראה חיצוני", appearanceOptions)}
          {selectField("preferredEthnicity", "עדה", ethnicityOptions)}
          <Controller
            name="preferredYeshiva"
            control={control}
            render={({ field }) => <TextField {...field} label="ישיבה" fullWidth />}
          />
          <Controller
            name="preferredSeminar"
            control={control}
            render={({ field }) => <TextField {...field} label="סמינר" fullWidth />}
          />
          {numberField("financialMin", "מצב כלכלי מינימום")}
          {numberField("financialMax", "מצב כלכלי מקסימום")}
          {selectField("maritalStatus", "הסטטוס שלי", maritalStatusOptions)}
          {numberField("financialDemand", "דרישה כספית")}
          {numberField("financialParticipation", "השתתפות כספית")}
        </Box>

        <Typography component="h3" sx={{ mt: 2.5, mb: 1, color: brand.navy, fontWeight: 600, fontSize: 17 }}>
          מה אני מחפש/ת
        </Typography>
        <Controller
          name="lookingFor"
          control={control}
          render={({ field }) => (
            <TextField {...field} hiddenLabel multiline minRows={4} fullWidth placeholder="מה אני מחפש/ת" slotProps={{ htmlInput: { "aria-label": "מה אני מחפש/ת" } }} />
          )}
        />

        {!profileExists && (
          <Alert severity="info" sx={{ mt: 2 }}>
            סטטוס, דרישה כספית ומה אני מחפש/ת נשמרים אחרי יצירת פרופיל.
          </Alert>
        )}
        {apiError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {apiError}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 3, pt: 3, borderTop: `1px solid ${brand.line}` }}>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "שומר..." : "שמירת העדפות"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
