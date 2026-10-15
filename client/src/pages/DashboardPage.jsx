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
import { brand } from "../theme/tokens.js";
import BrandLogo from "../components/layout/BrandLogo.jsx";

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: brand.navy,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            background: "transparent",
            textAlign: "center",
            px: 3,
          }}
        >
          {/* Decorative heart icons */}
          <Box component="h1" sx={{ m: 0, mb: 1 }}>
            <BrandLogo maxWidth={240} />
          </Box>

          {/* Subtitle */}
          <Typography
            variant="h6"
            sx={{
              color: brand.mist,
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
              bgcolor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(232, 213, 163, 0.28)",
              borderRadius: "16px",
              p: 3,
              mb: 4,
              boxShadow: "none",
            }}
          >
            <Stack spacing={2}>
              <Typography
                sx={{
            color: "#F4F6FA",
           fontSize: "1.05rem",
           fontWeight: 500,
            lineHeight: 1.8,
        textAlign: "center",
        fontFamily: "inherit",
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
                <Favorite sx={{ color: brand.gold, fontSize: 20 }} />
                <Typography sx={{ color: brand.goldLight, fontWeight: 600, fontSize: "0.9rem" }}>
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
              sx={{ px: 4, py: 1.4 }}
            >
              הרשמה
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate("/login")}
              startIcon={<Favorite />}
              sx={{
                px: 4,
                py: 1.4,
                color: brand.goldLight,
                borderColor: brand.gold,
                "&:hover": {
                  borderColor: brand.goldLight,
                  bgcolor: "rgba(196, 162, 79, 0.12)",
                },
              }}
            >
              התחברות
            </Button>
          </Stack>

          {/* Bottom decorative text */}
          <Typography
            sx={{
              color: brand.mist,
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