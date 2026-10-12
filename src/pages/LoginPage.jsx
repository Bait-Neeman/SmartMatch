import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
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
          "linear-gradient(135deg, #F7F4FF 0%, #EEF2FF 40%, #FDF2F8 100%)",
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
          background: "rgba(168, 85, 247, 0.12)",
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
          background: "rgba(236, 72, 153, 0.12)",
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
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 25px 60px rgba(124, 58, 237, 0.15)",
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
                "linear-gradient(90deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
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
                  "linear-gradient(90deg, #6366F1, #A855F7, #EC4899)",
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
                        borderColor: "rgba(139, 92, 246, 0.2)",
                      },

                      "&:hover fieldset": {
                        borderColor: "#A855F7",
                      },

                      "&.Mui-focused fieldset": {
                        borderWidth: "2px",
                        borderColor: "#8B5CF6",
                        boxShadow:
                          "0 0 0 4px rgba(168, 85, 247, 0.12)",
                      },
                    },

                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#8B5CF6",
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
                        borderColor: "rgba(139, 92, 246, 0.2)",
                      },

                      "&:hover fieldset": {
                        borderColor: "#A855F7",
                      },

                      "&.Mui-focused fieldset": {
                        borderWidth: "2px",
                        borderColor: "#8B5CF6",
                        boxShadow:
                          "0 0 0 4px rgba(168, 85, 247, 0.12)",
                      },
                    },

                    "& .MuiInputLabel-root.Mui-focused": {
                      color: "#8B5CF6",
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
                  "linear-gradient(90deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)",
                boxShadow:
                  "0 15px 30px rgba(168, 85, 247, 0.3)",
                transition: "0.35s",

                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow:
                    "0 20px 40px rgba(168, 85, 247, 0.35)",
                  background:
                    "linear-gradient(90deg, #5558E8 0%, #9333EA 50%, #DB2777 100%)",
                },

                "&:disabled": {
                  background: "#C4B5FD",
                  color: "#fff",
                },
              }}
            >
              {isSubmitting ? "ממשיכים..." : "התחברות"}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}