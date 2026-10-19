import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
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
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import AuthLayout, { AuthFooter } from "../components/layout/AuthLayout.jsx";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";
import { brand } from "../theme/tokens.js";
import { resetPassword } from "../services/auth.service.js";
import { authErrorMessage, passwordError } from "../utils/authForm.js";
import { clearSession } from "../utils/session.js";

// A second click before the first request finishes must not burn the one-time link.
const resetSubmitLocks = new Set();

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = async (data) => {
    if (resetSubmitLocks.has(token)) return;
    resetSubmitLocks.add(token);
    setApiError("");
    setSuccess("");
    setIsSubmitting(true);
    let saved = false;
    try {
      const res = await resetPassword({ token, password: data.password });
      clearSession();
      setSuccess(res?.message || "הסיסמה עודכנה. אפשר להתחבר עם הסיסמה החדשה.");
      saved = true;
    } catch (error) {
      setApiError(authErrorMessage(error, "לא הצלחנו לעדכן את הסיסמה. נסו שוב."));
    } finally {
      if (!saved) resetSubmitLocks.delete(token);
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="סיסמה חדשה" subtitle="הקישור לאיפוס הסיסמה אינו תקין.">
        <Alert severity="warning">הקישור חסר או אינו תקין. אפשר לבקש קישור חדש.</Alert>
        <AuthFooter question="צריך קישור חדש?" label="שכחתי סיסמה" to="/forgot-password" />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="סיסמה חדשה"
      subtitle="בחרו סיסמה חדשה. הסיסמה לא יכולה להיות ריקה, והאורך המרבי הוא 72 בתים."
    >
      {success ? (
        <Box>
          <Alert severity="success">{success}</Alert>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            sx={{ ...authSubmitSx, width: "100%" }}
          >
            להתחברות
          </Button>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <Controller
            name="password"
            control={control}
            rules={{ validate: (value) => passwordError(value) || true }}
            render={({ field }) => (
              <FormControl fullWidth error={Boolean(errors.password)} sx={authFieldSx}>
                <InputLabel htmlFor="reset-password">סיסמה חדשה</InputLabel>
                <OutlinedInput
                  {...field}
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  label="סיסמה חדשה"
                  autoComplete="new-password"
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                        aria-label={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                />
                {errors.password ? <FormHelperText>{errors.password.message}</FormHelperText> : null}
              </FormControl>
            )}
          />

          <Controller
            name="confirm"
            control={control}
            rules={{
              validate: (value) => value === getValues("password") || "הסיסמאות אינן תואמות",
            }}
            render={({ field }) => (
              <FormControl fullWidth error={Boolean(errors.confirm)} sx={authFieldSx}>
                <InputLabel htmlFor="reset-password-confirm">אימות סיסמה</InputLabel>
                <OutlinedInput
                  {...field}
                  id="reset-password-confirm"
                  type={showPassword ? "text" : "password"}
                  label="אימות סיסמה"
                  autoComplete="new-password"
                />
                {errors.confirm ? <FormHelperText>{errors.confirm.message}</FormHelperText> : null}
              </FormControl>
            )}
          />

          {apiError ? <Alert severity="error">{apiError}</Alert> : null}

          <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ ...authSubmitSx, width: "100%" }}>
            {isSubmitting ? "שומרים..." : "שמירת הסיסמה"}
          </Button>
        </Box>
      )}

      {success ? null : (
        <Box sx={{ mt: 2.25, textAlign: "center" }}>
          <Link
            component={RouterLink}
            to="/forgot-password"
            sx={{ color: brand.goldDark, fontWeight: 700, textDecoration: "none", fontSize: 15 }}
          >
            לבקשת קישור חדש
          </Link>
        </Box>
      )}
    </AuthLayout>
  );
}
