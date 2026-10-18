import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, IconButton, Typography } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { registerUser } from "../services/auth.service.js";
import AuthLayout, { AuthFooter } from "../components/layout/AuthLayout.jsx";
import { authSubmitSx } from "../components/layout/authStyles.js";
import { brand } from "../theme/tokens.js";
import { authErrorMessage, emailError, normalizeEmail, passwordError } from "../utils/authForm.js";
import { setOnboardingPath } from "../utils/session.js";

const STEPS = ["פרטי חשבון", "הפרופיל"];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data) => {
    setApiError("");
    setIsSubmitting(true);
    try {
      const res = await registerUser({
        email: normalizeEmail(data.email),
        password: data.password,
      });
      if (res?.token) {
        localStorage.setItem("token", res.token);
        localStorage.setItem("user", JSON.stringify(res.user));
        localStorage.setItem("role", res.user?.role || "user");
        setOnboardingPath("/profile");
        navigate("/profile");
        return;
      }
      navigate("/login", {
        state: {
          notice: "החשבון נוצר. התחברו עם האימייל והסיסמה כדי להמשיך.",
        },
      });
    } catch (error) {
      setApiError(authErrorMessage(error, "שגיאה בהרשמה"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout wide title="הרשמה" subtitle="כמה פרטים כדי שנוכל להתחיל להציע לך הצעות מתאימות">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
        {STEPS.map((label, index) => {
          const current = index === 0;
          return (
            <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
              {index > 0 ? <Box sx={{ width: 28, height: 1, bgcolor: brand.inputLine }} /> : null}
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                  fontSize: 13,
                  fontWeight: 700,
                  color: current ? brand.goldText : brand.mut,
                  bgcolor: current ? brand.tabOn : brand.paper,
                  boxShadow: `inset 0 0 0 1px ${current ? brand.gold : brand.inputLine}`,
                }}
              >
                {index + 1}
              </Box>
              <Typography sx={{ color: current ? brand.navy : brand.mut, fontWeight: current ? 700 : 500, fontSize: 14 }}>
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Typography component="h2" sx={{ m: 0, mb: 1.5, color: brand.navy, fontWeight: 600, fontSize: 17 }}>
        פרטי חשבון
      </Typography>

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: "12px 16px" }}>
          <IconField
            id="register-email"
            label="אימייל"
            icon="mail"
            error={errors.email?.message}
          >
            <Box
              component="input"
              id="register-email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              dir="ltr"
              {...register("email", {
                validate: (value) => emailError(value) || true,
              })}
              sx={inputSx}
            />
          </IconField>

          <IconField id="register-password" label="סיסמה" icon="lock" error={errors.password?.message}>
            <Box
              component="input"
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password", {
                validate: (value) => passwordError(value, "סיסמה היא שדה חובה") || true,
              })}
              sx={inputSx}
            />
            <IconButton
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
              sx={{ color: brand.mut, p: 0.5 }}
            >
              {showPassword ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
            </IconButton>
          </IconField>
        </Box>

        {apiError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {apiError}
          </Alert>
        ) : null}

        <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting} sx={{ ...authSubmitSx, mt: 2.5 }}>
          {isSubmitting ? "נרשמים..." : "יצירת חשבון"}
        </Button>
      </Box>

      <AuthFooter question="כבר רשום/ה?" label="להתחברות" to="/login" />
    </AuthLayout>
  );
}

const inputSx = {
  border: 0,
  outline: "none",
  background: "transparent",
  font: "inherit",
  color: brand.navy,
  width: "100%",
  minWidth: 0,
  "&::placeholder": { color: brand.mut },
};

function IconField({ id, label, icon, error, children }) {
  return (
    <Box>
      <Typography component="label" htmlFor={id} sx={{ display: "block", fontWeight: 600, fontSize: 14, color: brand.navy, mb: 0.75 }}>
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1.25,
          alignItems: "center",
          height: 52,
          px: 2,
          borderRadius: "10px",
          bgcolor: brand.paper,
          color: brand.mut,
          boxShadow: `inset 0 0 0 1px ${error ? brand.pillRedLine : brand.inputLine}`,
          "&:focus-within": { boxShadow: `inset 0 0 0 1.5px ${brand.gold}` },
        }}
      >
        <FieldIcon name={icon} />
        {children}
      </Box>
      {error ? (
        <Typography role="alert" sx={{ mt: 0.5, color: "error.main", fontSize: 12 }}>
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}

function FieldIcon({ name }) {
  const paths = {
    mail: (
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-10 6L2 7" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  };
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      sx={{ width: 18, height: 18, flex: "none", color: brand.gold }}
    >
      {paths[name]}
    </Box>
  );
}
