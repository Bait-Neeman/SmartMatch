import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, TextField } from "@mui/material";
import { pendingCopy } from "../copy/pendingCopy.js";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";
import { saveAccountCredentials } from "../services/auth.service.js";
import { getMyProfile } from "../services/profile.service.js";
import { getMyPreferences } from "../services/preference.service.js";
import { authErrorMessage, destinationAfterLogin, emailError, normalizeEmail, passwordError } from "../utils/authForm.js";
import { getSession, identityComplete, rememberUser, setOnboardingPath } from "../utils/session.js";

const readOptional = async (request) => {
  try {
    await request();
    return { missing: false };
  } catch (error) {
    if (error?.response?.status === 404) return { missing: true };
    return { error };
  }
};

export default function AccountSetupPage() {
  const navigate = useNavigate();
  const { user } = getSession();
  const canSkip = user?.allowCodeLogin === true;
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit } = useForm({
    defaultValues: { email: user?.email || "", password: "" },
  });

  const continueIn = async (nextUser) => {
    const profile = await readOptional(getMyProfile);
    if (profile.error) {
      setApiError(authErrorMessage(profile.error, "לא הצלחנו להשלים את ההתחברות. נסו שוב."));
      return;
    }
    const preferences = profile.missing ? { missing: true } : await readOptional(getMyPreferences);
    if (preferences.error) {
      setApiError(authErrorMessage(preferences.error, "לא הצלחנו להשלים את ההתחברות. נסו שוב."));
      return;
    }
    const destination = destinationAfterLogin({
      role: nextUser?.role,
      hasIdentity: identityComplete(nextUser),
      hasProfile: !profile.missing,
      hasPreferences: !preferences.missing,
    });
    setOnboardingPath(destination === "/home" ? null : destination);
    navigate(destination);
  };

  const onSubmit = async (values) => {
    setApiError("");
    setBusy(true);
    try {
      const res = await saveAccountCredentials({
        email: normalizeEmail(values.email),
        password: values.password,
      });
      if (!res?.token || !res?.user) {
        setApiError("ההתחברות נכשלה. נסו שוב.");
        return;
      }
      localStorage.setItem("token", res.token);
      rememberUser(res.user);
      await continueIn(res.user);
    } catch (error) {
      setApiError(authErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 560, mx: "auto" }}>
      <Box component="h1" sx={{ m: 0, fontSize: "clamp(22px, 1.9vw, 28px)", fontWeight: 600, color: "secondary.main" }}>
        {pendingCopy.accountSetupTitle}
      </Box>
      <Box component="p" sx={{ mt: 0.75, mb: 2.5, color: "text.secondary", fontSize: 17 }}>
        {pendingCopy.accountSetupSubtitle}
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
          name="email"
          control={control}
          rules={{ validate: (value) => emailError(value) || true }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="אימייל"
              type="email"
              autoComplete="email"
              fullWidth
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message || ""}
              sx={authFieldSx}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={{ validate: (value) => passwordError(value) || true }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="סיסמה"
              type="password"
              autoComplete="new-password"
              fullWidth
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message || ""}
              sx={authFieldSx}
            />
          )}
        />
        {apiError ? <Alert severity="error">{apiError}</Alert> : null}
        <Button type="submit" variant="contained" size="large" disabled={busy} sx={authSubmitSx}>
          {busy ? "שומר..." : pendingCopy.continueLabel}
        </Button>
        {canSkip ? (
          <Button type="button" variant="text" disabled={busy} onClick={() => continueIn(user)}>
            {pendingCopy.accountSetupSkip}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
