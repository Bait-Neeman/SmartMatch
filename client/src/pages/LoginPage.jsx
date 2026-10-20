import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
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
import { authErrorMessage, destinationAfterLogin, emailError, normalizeEmail, passwordError } from "../utils/authForm.js";
import { identityComplete, setOnboardingPath } from "../utils/session.js";

const readOptional = async (request) => {
  try {
    await request();
    return { missing: false };
  } catch (error) {
    if (error?.response?.status === 404) return { missing: true };
    return { error };
  }
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const signedOutNotice = location.state?.notice || "";

  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    setIsSubmitting(true);

    try {
      const res = await loginUser({
        email: normalizeEmail(data.email),
        password: data.password,
      });

      if (!res?.token || !res?.user) {
        setApiError("ההתחברות נכשלה. נסו שוב.");
        return;
      }

      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      localStorage.setItem("role", res.user.role || "user");

      if (res.user.role === "admin") {
        setOnboardingPath(null);
        navigate("/admin");
        return;
      }

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
        role: res.user.role,
        hasIdentity: identityComplete(res.user) || !profile.missing,
        hasProfile: !profile.missing,
        hasPreferences: !preferences.missing,
      });
      setOnboardingPath(destination);
      navigate(destination);
    } catch (err) {
      setApiError(authErrorMessage(err, "ההתחברות נכשלה. נסו שוב."));
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
            validate: (value) => emailError(value) || true,
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

        <Box>
          <Controller
            name="password"
            control={control}
            rules={{
              validate: (value) => passwordError(value, "סיסמה היא שדה חובה") || true,
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
          <Link
            component={RouterLink}
            to="/forgot-password"
            underline="none"
            sx={{
              display: "inline-flex",
              mt: "10px",
              p: 0,
              fontSize: 13,
              fontWeight: 600,
              color: brand.goldDark,
              background: "none",
              "&&": { color: brand.goldDark },
            }}
          >
            שכחת סיסמה?
          </Link>
        </Box>

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
