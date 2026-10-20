import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup, TextField } from "@mui/material";
import { genderOptions } from "../constants/profileOptions.js";
import { pendingCopy } from "../copy/pendingCopy.js";
import OnboardingSteps from "../components/common/OnboardingSteps.jsx";
import { saveIdentity } from "../services/auth.service.js";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";
import { getSession, rememberUser, setOnboardingPath } from "../utils/session.js";

const NAME_REQUIRED = "יש להזין שם מלא";
const GENDER_REQUIRED = "מגדר הוא שדה חובה";

export default function IdentityPage() {
  const navigate = useNavigate();
  const { user } = getSession();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { control, handleSubmit } = useForm({
    defaultValues: {
      name: user?.name || "",
      gender: user?.gender === "male" || user?.gender === "female" ? user.gender : "",
    },
  });

  const onSubmit = async (values) => {
    setApiError("");
    setIsSubmitting(true);
    try {
      const res = await saveIdentity({ name: values.name.trim(), gender: values.gender });
      rememberUser(res?.user || { name: values.name.trim(), gender: values.gender });
      setOnboardingPath("/profile");
      navigate("/profile");
    } catch (error) {
      setApiError(error?.response?.data?.message || error?.message || "יש להזין שם מלא");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto" }}>
      <OnboardingSteps current={2} />
      <Box component="h1" sx={{ m: 0, fontSize: "clamp(22px, 1.9vw, 28px)", fontWeight: 600, color: "secondary.main" }}>
        {pendingCopy.identityTitle}
      </Box>
      <Box component="p" sx={{ mt: 0.75, mb: 2.5, color: "text.secondary", fontSize: 17 }}>
        {pendingCopy.identitySubtitle}
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{
          display: "grid",
          gap: 2.5,
          p: "clamp(16px, 1.6vw, 24px)",
          borderRadius: "16px",
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Controller
          name="name"
          control={control}
          rules={{ validate: (value) => (typeof value === "string" && value.trim() ? true : NAME_REQUIRED) }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label={pendingCopy.nameLabel}
              fullWidth
              autoComplete="name"
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message || ""}
              sx={authFieldSx}
            />
          )}
        />
        <Controller
          name="gender"
          control={control}
          rules={{ validate: (value) => (value === "male" || value === "female" ? true : GENDER_REQUIRED) }}
          render={({ field, fieldState }) => (
            <FormControl error={Boolean(fieldState.error)}>
              <FormLabel id="identity-gender" sx={{ fontWeight: 600, color: "secondary.main", mb: 0.5 }}>
                מגדר
              </FormLabel>
              <RadioGroup aria-labelledby="identity-gender" value={field.value} onChange={(event) => field.onChange(event.target.value)}>
                {genderOptions.map((option) => (
                  <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
                ))}
              </RadioGroup>
              {fieldState.error ? (
                <Box component="p" role="alert" sx={{ m: 0, color: "error.main", fontSize: 12 }}>
                  {fieldState.error.message}
                </Box>
              ) : null}
            </FormControl>
          )}
        />
        {apiError ? <Alert severity="error">{apiError}</Alert> : null}
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={authSubmitSx}>
          {isSubmitting ? "שומר..." : pendingCopy.continueLabel}
        </Button>
      </Box>
    </Box>
  );
}
