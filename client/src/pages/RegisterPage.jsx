import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
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
import { registerUser } from "../services/auth.service.js";
import AuthLayout, { AuthSwitch } from "../components/layout/AuthLayout.jsx";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";

const PASSWORD_HINT = "8-16 תווים, לפחות אות אחת באנגלית";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      idNumber: "",
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

    const payload = {
      name: data.name.trim(),
      idNumber: data.idNumber.trim(),
      email: data.email.trim(),
      password: data.password,
    };

    try {
      await registerUser(payload);
      localStorage.setItem("onboarding", "true");
      navigate("/login", { state: { onboarding: true } });
    } catch (error) {
      const message = error?.response?.data?.message || error.message || "שגיאה בהרשמה";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="הרשמה" subtitle="פתיחת חשבון חדש לוקחת פחות מדקה">
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <TextField
          label="שם מלא"
          autoComplete="name"
          {...register("name", { required: "שם מלא הוא שדה חובה" })}
          error={Boolean(errors.name)}
          helperText={errors.name ? errors.name.message : ""}
          fullWidth
          sx={authFieldSx}
        />

        <TextField
          label="תעודת זהות"
          placeholder="9 ספרות"
          {...register("idNumber", {
            required: "תעודת זהות היא שדה חובה",
            pattern: {
              value: /^\d{9}$/,
              message: "תעודת זהות חייבת להכיל 9 ספרות",
            },
          })}
          error={Boolean(errors.idNumber)}
          helperText={errors.idNumber ? errors.idNumber.message : ""}
          fullWidth
          type="tel"
          sx={authFieldSx}
        />

        <TextField
          label="אימייל"
          type="email"
          autoComplete="email"
          {...register("email", {
            required: "אימייל הוא שדה חובה",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "הזן כתובת אימייל תקינה",
            },
          })}
          error={Boolean(errors.email)}
          helperText={errors.email ? errors.email.message : ""}
          fullWidth
          sx={authFieldSx}
        />

        <Controller
          name="password"
          control={control}
          rules={{
            required: "סיסמה היא שדה חובה",
            minLength: { value: 8, message: "הסיסמה חייבת להכיל לפחות 8 תווים" },
            maxLength: { value: 16, message: "הסיסמה חייבת להכיל עד 16 תווים" },
            pattern: { value: /[A-Za-z]/, message: "הסיסמה חייבת לכלול אות אנגלית אחת לפחות" },
          }}
          render={({ field }) => (
            <FormControl fullWidth error={Boolean(errors.password)} sx={authFieldSx}>
              <InputLabel htmlFor="register-password">סיסמה</InputLabel>
              <OutlinedInput
                {...field}
                id="register-password"
                type={showPassword ? "text" : "password"}
                label="סיסמה"
                autoComplete="new-password"
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
              <FormHelperText>{errors.password ? errors.password.message : PASSWORD_HINT}</FormHelperText>
            </FormControl>
          )}
        />

        {apiError && <Alert severity="error">{apiError}</Alert>}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={authSubmitSx}>
          {isSubmitting ? "נרשמים..." : "הרשמה"}
        </Button>
      </Box>

      <AuthSwitch question="כבר יש לך חשבון?" label="התחברות" to="/login" />
    </AuthLayout>
  );
}
