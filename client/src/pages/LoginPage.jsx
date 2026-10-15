import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import AuthLayout, { AuthFooter } from "../components/layout/AuthLayout.jsx";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";
import { brand } from "../theme/tokens.js";
import { loginUser } from "../services/auth.service.js";
import { getMyProfile } from "../services/profile.service.js";
import { getMyPreferences } from "../services/preference.service.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signedOutNotice = location.state?.notice || "";

  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetNote, setResetNote] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const onSubmit = async (data) => {
    setApiError("");

    const payload = {
      email: data.email?.trim(),
      password: data.password,
    };

    setIsSubmitting(true);

    try {
      const res = await loginUser(payload);

      if (res?.token) {
        const token = res.token;

        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(res.user));
        localStorage.setItem("role", res.user?.role || res.role || "user");  
              

        const isAdmin = res.user?.role === "admin";

        const shouldOnboard =
          location.state?.onboarding === true ||
          localStorage.getItem("onboarding") === "true";

        localStorage.removeItem("onboarding");

        if (isAdmin) {
          navigate("/admin");
          return;
        }

        if (!shouldOnboard) {
          navigate("/personal-area");
          return;
        }

        let hasProfile = false;
        let hasPreferences = false;

        try {
          const profileResult = await getMyProfile(token);
          hasProfile = Boolean(profileResult?.profile);
        } catch (profileError) {
          if (profileError?.response?.status !== 404) {
            console.error("Profile fetch error:", profileError.message);
          }
        }

        if (!hasProfile) {
          navigate("/profile");
          return;
        }

        try {
          const preferencesResult = await getMyPreferences(token);
          hasPreferences = Boolean(preferencesResult?.preferences);
        } catch (preferencesError) {
          if (preferencesError?.response?.status !== 404) {
            console.error("Preferences fetch error:", preferencesError.message);
          }
        }

        if (!hasPreferences) {
          navigate("/preferences");
        } else {
          navigate("/personal-area");
        }
      } else {
        setApiError("ההתחברות נכשלה, נסו שוב");
      }
    } catch (err) {
      const status = err?.response?.status;

      if (status === 401) {
        setApiError("אימייל או סיסמה שגויים");
      } else {
        const message =
          err?.response?.data?.message ||
          err.message ||
          "Login failed";

        setApiError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="ברוכים הבאים" subtitle="התחברו כדי לצפות בהצעות שלכם">
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Controller
          name="email"
          control={control}
          rules={{
            required: "אימייל הוא שדה חובה",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "הזן כתובת אימייל תקינה",
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="אימייל"
              placeholder="name@example.com"
              fullWidth
              type="email"
              autoComplete="email"
              error={Boolean(errors.email)}
              helperText={errors.email ? errors.email.message : ""}
              sx={authFieldSx}
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          rules={{
            required: "סיסמה היא שדה חובה",
          }}
          render={({ field }) => (
            <FormControl fullWidth error={Boolean(errors.password)} sx={authFieldSx}>
              <InputLabel htmlFor="login-password">סיסמה</InputLabel>
              <OutlinedInput
                {...field}
                id="login-password"
                type={showPassword ? "text" : "password"}
                label="סיסמה"
                autoComplete="current-password"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePassword}
                      edge="end"
                      aria-label={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {errors.password && <FormHelperText>{errors.password.message}</FormHelperText>}
            </FormControl>
          )}
        />

        <Button
          type="button"
          onClick={() => setResetNote(true)}
          sx={{ alignSelf: "flex-start", p: 0, minHeight: 0, color: brand.goldText, fontSize: 13, fontWeight: 600 }}
        >
          שכחת סיסמה?
        </Button>

        {resetNote ? <Alert severity="info">שחזור סיסמה עדיין לא זמין.</Alert> : null}
        {signedOutNotice && !apiError ? <Alert severity="info">{signedOutNotice}</Alert> : null}
        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ ...authSubmitSx, width: "100%" }}>
          {isSubmitting ? "ממשיכים..." : "התחברות"}
        </Button>
      </Box>

      <AuthFooter question="אין לך חשבון?" label="להרשמה" to="/register" />
    </AuthLayout>
  );
}
