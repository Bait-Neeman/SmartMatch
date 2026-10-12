import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Paper,
} from "@mui/material";
import { Favorite, Link as LinkIcon } from "@mui/icons-material";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #eef4ff 0%, #f7fbff 45%, #ffffff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-45%",
          right: "-15%",
          width: "450px",
          height: "450px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(63, 113, 213, 0.14) 0%, transparent 70%)",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-25%",
          left: "-10%",
          width: "380px",
          height: "380px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(196, 162, 79, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        },
      }}
    >
      <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            background: "transparent",
            textAlign: "center",
            px: 3,
          }}
        >
          {/* Decorative heart icons */}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mb: 3 }}>
            <Favorite sx={{ color: "rgba(63,113,213,0.24)", fontSize: 28, opacity: 0.75 }} />
            <Favorite sx={{ color: "rgba(196,162,79,0.24)", fontSize: 28, opacity: 0.75 }} />
            <Favorite sx={{ color: "rgba(63,113,213,0.18)", fontSize: 28, opacity: 0.65 }} />
          </Box>

          {/* Main Title */}
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              background: "linear-gradient(135deg, #3f71d5 0%, #5c85db 50%, #c4a24f 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              mb: 1,
              letterSpacing: "-0.5px",
            }}
          >
            SmartMatch
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="h6"
            sx={{
              color: "#666",
              fontWeight: 500,
              fontSize: "1rem",
              mb: 3,
              letterSpacing: "0.5px",
            }}
          >
            פלטפורמה חכמה למציאת התאמה מושלמת
          </Typography>

          {/* Description Box */}
          <Paper
            sx={{
              background: "rgba(255, 255, 255, 0.72)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(63, 113, 213, 0.14)",
              borderRadius: "20px",
              p: 3,
              mb: 4,
              boxShadow: "0 12px 36px rgba(15, 23, 42, 0.08)",
            }}
          >
            <Stack spacing={2}>
              <Typography
                sx={{
                  color: "#555",
                  fontSize: "1.05rem",
                  lineHeight: 1.7,
                  fontWeight: 500,
                }}
              >
                {/* במשכרת "השדכן" המיוחדת שלנו, מציאת בן/בת זוג נעשית פשוטה וטבעית. */}
              </Typography>
              <Typography
                sx={{
            color: "#3f71d5",
           fontSize: "1.05rem",
           fontWeight: 500,
            lineHeight: 1.8,
        textAlign: "center",
        fontFamily: "Inter, Arial, sans-serif",
        letterSpacing: "0.3px",
        padding: "10px 20px",
                }}
              >
              תמצאו מאגר עצום של משודכי "SmartMatch" במערכת
מבחירי עולם הישיבות והסמינרים,
טכנולוגיה חכמה לסינון ולהתאמה מדויקת,
והכל בדיסקרטיות מלאה, בקצב שלכם ובשליטה שלכם.
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, pt: 1 }}>
                <Favorite sx={{ color: "rgba(63,113,213,0.5)", fontSize: 20 }} />
                <Typography sx={{ color: "#3f71d5", fontWeight: 600, fontSize: "0.9rem" }}>
                 מפסיקים לבזבז זמן על הצעות לא רלוונטיות
ועושים השתדלות ראויה לזיווג הגון בקרוב  
                </Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Action Buttons */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{
              justifyContent: "center",
            }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate("/register")}
              startIcon={<LinkIcon />}
              sx={{
                background: "linear-gradient(135deg, #3f71d5 0%, #5c85db 100%)",
                color: "white",
                borderRadius: "50px",
                padding: "14px 40px",
                fontSize: "1.05rem",
                fontWeight: 600,
                textTransform: "none",
                boxShadow: "0 10px 28px rgba(63, 113, 213, 0.22)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 12px 34px rgba(63, 113, 213, 0.3)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                },
              }}
            >
              הרשמה
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate("/login")}
              startIcon={<Favorite />}
              sx={{
                color: "#3f71d5",
                borderColor: "#3f71d5",
                borderRadius: "50px",
                padding: "14px 40px",
                fontSize: "1.05rem",
                fontWeight: 600,
                textTransform: "none",
                border: "2px solid rgba(63, 113, 213, 0.45)",
                backgroundColor: "rgba(63, 113, 213, 0.05)",
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: "rgba(63, 113, 213, 0.14)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(63, 113, 213, 0.12)",
                },
                "&:active": {
                  transform: "translateY(0px)",
                },
              }}
            >
              התחברות
            </Button>
          </Stack>

          {/* Bottom decorative text */}
          <Typography
            sx={{
              color: "#999",
              fontSize: "0.85rem",
              mt: 4,
              fontStyle: "italic",
            }}
          >
            ✨ התאמה חכמה. אהבה אמיתית. ✨
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}