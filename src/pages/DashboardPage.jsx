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
        background: "linear-gradient(135deg, #fff5f7 0%, #f0f8ff 50%, #fff5f7 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: "-50%",
          right: "-20%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 192, 203, 0.15) 0%, transparent 70%)",
          pointerEvents: "none",
        },
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: "-30%",
          left: "-15%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(173, 216, 230, 0.15) 0%, transparent 70%)",
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
            <Favorite sx={{ color: "#ff69b4", fontSize: 28, opacity: 0.7 }} />
            <Favorite sx={{ color: "#87ceeb", fontSize: 28, opacity: 0.5 }} />
            <Favorite sx={{ color: "#ff1493", fontSize: 28, opacity: 0.6 }} />
          </Box>

          {/* Main Title */}
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "2.5rem", md: "3.5rem" },
              background: "linear-gradient(135deg, #1a237e 0%, #c2185b 100%)",
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
              background: "rgba(255, 255, 255, 0.6)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 192, 203, 0.2)",
              borderRadius: "20px",
              p: 3,
              mb: 4,
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.05)",
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
            color: "#5B2EFF", // סגול מודרני יפה
           fontSize: "1.05rem",
           fontWeight: 500,
            lineHeight: 1.8,
        textAlign: "center",
        fontFamily: "Rubik, Arial, sans-serif",
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
                <Favorite sx={{ color: "#ff69b4", fontSize: 20 }} />
                <Typography sx={{ color: "#c2185b", fontWeight: 600, fontSize: "0.9rem" }}>
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
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "50px",
                padding: "14px 40px",
                fontSize: "1.05rem",
                fontWeight: 600,
                textTransform: "none",
                boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 12px 32px rgba(102, 126, 234, 0.45)",
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
                color: "#c2185b",
                borderColor: "#c2185b",
                borderRadius: "50px",
                padding: "14px 40px",
                fontSize: "1.05rem",
                fontWeight: 600,
                textTransform: "none",
                border: "2.5px solid #c2185b",
                transition: "all 0.3s ease",
                backgroundColor: "rgba(194, 24, 91, 0.03)",
                "&:hover": {
                  backgroundColor: "rgba(194, 24, 91, 0.08)",
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 24px rgba(194, 24, 91, 0.2)",
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