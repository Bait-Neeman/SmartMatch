import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { registerUser } from "../services/auth.service.js";

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

    console.log("Register payload:", payload);

    try {
      const response = await registerUser(payload);
      console.log("Register response:", response);
      localStorage.setItem("onboarding", "true");
      navigate("/login", { state: { onboarding: true } });
    } catch (error) {
      console.error("Register error:", error);
      const message = error?.response?.data?.message || error.message || "שגיאה בהרשמה";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        הרשמה
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ display: "grid", gap: 2 }}>
        <TextField
          label="שם מלא"
          placeholder="הכנס שם מלא"
          {...register("name", { required: "שם מלא הוא שדה חובה" })}
          error={Boolean(errors.name)}
          helperText={errors.name ? errors.name.message : ""}
          fullWidth
        />

        <TextField
          label="תעודת זהות"
          placeholder="הכנס תעודת זהות בעלת 9 ספרות"
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
        />

        <TextField
          label="אימייל"
          placeholder="הכנס כתובת אימייל"
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
            <FormControl fullWidth error={Boolean(errors.password)}>
              <InputLabel htmlFor="register-password">סיסמה</InputLabel>
              <OutlinedInput
                {...field}
                id="register-password"
                type={showPassword ? "text" : "password"}
                label="סיסמה"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton onClick={handleTogglePassword} edge="end" aria-label="Toggle password visibility">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
                  {errors.password && <FormHelperText>{errors.password.message}</FormHelperText>}
            </FormControl>
          )}
        />

        <Button type="submit" variant="contained" disabled={isSubmitting} size="large">
          {isSubmitting ? "שולח..." : "הרשמה"}
        </Button>
      </Box>
    </Container>
  );
}
