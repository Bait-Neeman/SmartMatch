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
import AuthLayout, { AuthSwitch } from "../components/layout/AuthLayout.jsx";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";
import { loginUser } from "../services/auth.service.js";
import { getMyProfile } from "../services/profile.service.js";
import { getMyPreferences } from "../services/preference.service.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      idNumber: "",
      password: "",
    },
  });

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const onSubmit = async (data) => {
    setApiError("");

    const payload = {
      idNumber: data.idNumber?.trim(),
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
        setApiError("פרטי ההתחברות שגויים");
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
    <AuthLayout title="התחברות" subtitle="כניסה עם תעודת זהות וסיסמה">
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Controller
          name="idNumber"
          control={control}
          rules={{
            required: "תעודת זהות היא שדה חובה",
            pattern: {
              value: /^\d{9}$/,
              message: "תעודת זהות חייבת להכיל 9 ספרות",
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="תעודת זהות"
              placeholder="9 ספרות"
              fullWidth
              type="tel"
              autoComplete="username"
              error={Boolean(errors.idNumber)}
              helperText={errors.idNumber ? errors.idNumber.message : ""}
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

        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={authSubmitSx}>
          {isSubmitting ? "ממשיכים..." : "התחברות"}
        </Button>
      </Box>

      <AuthSwitch question="אין לך עדיין חשבון?" label="יצירת חשבון חדש" to="/register" />
    </AuthLayout>
  );
}
