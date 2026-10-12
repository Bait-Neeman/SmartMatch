import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
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

    console.log("Login payload before request:", payload);

    setIsSubmitting(true);

    try {
      const res = await loginUser(payload);

      console.log("Login response:", res);

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
            console.error("Profile fetch error:", profileError);
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
            console.error("Preferences fetch error:", preferencesError);
          }
        }

        if (!hasPreferences) {
          navigate("/preferences");
        } else {
          navigate("/personal-area");
        }
      } else {
        setApiError("Login failed: no token returned");
      }
    } catch (err) {
      console.error("Login error:", err);

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
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        background:
          "linear-gradient(135deg, #eef4ff 0%, #f7fbff 40%, #ffffff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        px: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background circles */}
      <Box
        sx={{
          position: "absolute",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "rgba(63, 113, 213, 0.14)",
          top: -80,
          right: -80,
          filter: "blur(40px)",
        }}
      />

      <Box
        sx={{
          position: "absolute",
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: "rgba(196, 162, 79, 0.14)",
          bottom: -60,
          left: -60,
          filter: "blur(40px)",
        }}
      />

      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            overflow: "hidden",
            p: { xs: 3, sm: 5 },
            borderRadius: "32px",
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(63, 113, 213, 0.12)",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
          }}
        >
          {/* top glow */}
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background:
                "linear-gradient(90deg, #3f71d5 0%, #c4a24f 100%)",
            }}
          />

          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                mb: 1,
                fontSize: { xs: "2.2rem", sm: "2.8rem" },
                background:
                  "linear-gradient(90deg, #3f71d5, #5c85db, #c4a24f)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              התחברות
            </Typography>

            <Typography
              sx={{
                color: "#6B7280",
                fontSize: "1rem",
              }}
            >
              היכנס עם תעודת זהות וסיסמה כדי להמשיך
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
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
                  placeholder="הכנס תעודת זהות"
                  fullWidth
                  type="tel"
                  error={Boolean(errors.idNumber)}
                  helperText={
                    errors.idNumber
                      ? errors.idNumber.message
                      : ""
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "18px",
                      backgroundColor: "rgba(255,255,255,0.7)",
                      transition: "0.3s",

                      "& fieldset": {
                        borderColor: "rgba(63, 113, 213, 0.2)",
                      },

                      "&:hover fieldset": {
                        borderColor: "#3f71d5",
                      },

                      "&.Mui-focused fieldset": {
                        borderWidth: "2px",
                        borderColor: "#3f71d5",
                        boxShadow:
                          "0 0 0 4px rgba(63, 113, 213, 0.14)",
                      },
                    },

                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#3f71d5",
                    },
                  }}
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
                <FormControl
                  fullWidth
                  error={Boolean(errors.password)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "18px",
                      backgroundColor: "rgba(255,255,255,0.7)",
                      transition: "0.3s",

                      "& fieldset": {
                        borderColor: "rgba(63, 113, 213, 0.2)",
                      },

                      "&:hover fieldset": {
                        borderColor: "#3f71d5",
                      },

                      "&.Mui-focused fieldset": {
                        borderWidth: "2px",
                        borderColor: "#3f71d5",
                        boxShadow:
                          "0 0 0 4px rgba(63, 113, 213, 0.14)",
                      },
                    },

                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#3f71d5",
                    },
                  }}
                >
                  <InputLabel htmlFor="login-password">
                    סיסמה
                  </InputLabel>

                  <OutlinedInput
                    {...field}
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    label="סיסמה"
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleTogglePassword}
                          edge="end"
                        >
                          {showPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    }
                  />

                  {errors.password && (
                    <FormHelperText>
                      {errors.password.message}
                    </FormHelperText>
                  )}
                </FormControl>
              )}
            />

            {apiError && (
              <Typography
                color="error"
                sx={{
                  textAlign: "center",
                  fontWeight: 500,
                }}
              >
                {apiError}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{
                mt: 1,
                py: 1.7,
                borderRadius: "18px",
                fontWeight: 800,
                fontSize: "1rem",
                textTransform: "none",
                background:
                  "linear-gradient(90deg, #3f71d5 0%, #5c85db 50%, #c4a24f 100%)",
                boxShadow:
                  "0 15px 30px rgba(63, 113, 213, 0.2)",
                transition: "0.35s",

                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow:
                    "0 20px 40px rgba(63, 113, 213, 0.25)",
                  background:
                    "linear-gradient(90deg, #315bb0 0%, #4d78d4 50%, #b18f3c 100%)",
                },

                "&:disabled": {
                  background: "#a8b9e7",
                  color: "#fff",
                },
              }}
            >
              {isSubmitting ? "ממשיכים..." : "התחברות"}
            </Button>
          </Box>

          {/* Register option */}
          <Box sx={{ mt: 4 }}>
            <Divider
              sx={{
                mb: 3,
                color: "#9CA3AF",
                fontSize: "0.9rem",

                "&::before, &::after": {
                  borderColor: "rgba(63, 113, 213, 0.15)",
                },
              }}
            >
              או
            </Divider>

            <Typography
              dir="rtl"
              sx={{
                mb: 2,
                textAlign: "center",
                color: "#6B7280",
                fontSize: "1rem",
              }}
            >
              אין לך עדיין חשבון?
            </Typography>

            <Button
              component={RouterLink}
              to="/register"
              variant="outlined"
              size="large"
              fullWidth
              sx={{
                py: 1.5,
                borderRadius: "18px",
                borderWidth: "2px",
                borderColor: "rgba(63, 113, 213, 0.3)",
                backgroundColor: "rgba(255,255,255,0.7)",
                color: "#3f71d5",
                fontWeight: 800,
                fontSize: "1rem",
                textTransform: "none",
                transition: "0.35s",

                "&:hover": {
                  borderWidth: "2px",
                  borderColor: "#c4a24f",
                  backgroundColor: "rgba(196, 162, 79, 0.08)",
                  color: "#315bb0",
                  transform: "translateY(-2px)",
                  boxShadow: "0 15px 30px rgba(63, 113, 213, 0.12)",
                },
              }}
            >
              יצירת חשבון חדש
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}