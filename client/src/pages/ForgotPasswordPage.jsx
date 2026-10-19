import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Box, Button, TextField } from "@mui/material";
import AuthLayout, { AuthFooter } from "../components/layout/AuthLayout.jsx";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";
import { requestPasswordReset } from "../services/auth.service.js";
import { authErrorMessage, emailError, normalizeEmail } from "../utils/authForm.js";

export default function ForgotPasswordPage() {
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: "" },
  });

  const onSubmit = async (data) => {
    setApiError("");
    setSuccess("");
    setIsSubmitting(true);
    try {
      const res = await requestPasswordReset({ email: normalizeEmail(data.email) });
      setSuccess(res?.message || "אם קיים חשבון עם הכתובת הזו, נשלח אליו קישור לאיפוס הסיסמה. הקישור תקף לשעה אחת.");
    } catch (error) {
      setApiError(authErrorMessage(error, "לא הצלחנו לשלוח את הבקשה. נסו שוב."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="שכחתי סיסמה"
      subtitle="הזינו את כתובת האימייל. אם יש חשבון עם הכתובת הזו, נשלח קישור לאיפוס הסיסמה."
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Controller
          name="email"
          control={control}
          rules={{ validate: (value) => emailError(value) || true }}
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
              slotProps={{ htmlInput: { dir: "ltr" } }}
              sx={authFieldSx}
            />
          )}
        />

        {success ? <Alert severity="success">{success}</Alert> : null}
        {apiError ? <Alert severity="error">{apiError}</Alert> : null}

        <Button type="submit" variant="contained" size="large" disabled={isSubmitting} sx={{ ...authSubmitSx, width: "100%" }}>
          {isSubmitting ? "שולחים..." : "שליחת קישור"}
        </Button>
      </Box>

      <AuthFooter question="נזכרתם בסיסמה?" label="להתחברות" to="/login" />
    </AuthLayout>
  );
}
