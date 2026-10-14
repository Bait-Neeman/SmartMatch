import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Container, Divider, Paper, Typography } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";

// Shared look of the login and registration pages (form styles are in authStyles.js)

// "Don't have an account?" / "Already have an account?" with a button to the other page
export function AuthSwitch({ question, label, to }) {
  return (
    <Box sx={{ mt: 4 }}>
      <Divider
        sx={{
          mb: 3,
          color: "#9CA3AF",
          fontSize: "0.9rem",
          "&::before, &::after": { borderColor: "rgba(63, 113, 213, 0.15)" },
        }}
      >
        או
      </Divider>

      <Typography sx={{ mb: 2, textAlign: "center", color: "#6B7280", fontSize: "1rem" }}>{question}</Typography>

      <Button
        component={RouterLink}
        to={to}
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
        {label}
      </Button>
    </Box>
  );
}

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #eef4ff 0%, #f7fbff 40%, #ffffff 100%)",
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

      <Container maxWidth="sm" sx={{ position: "relative" }}>
        <Button component={RouterLink} to="/" startIcon={<ArrowForward />} sx={{ mb: 1.5, boxShadow: "none", color: "text.secondary" }}>
          לדף הבית
        </Button>

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
              background: "linear-gradient(90deg, #3f71d5 0%, #c4a24f 100%)",
            }}
          />

          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                mb: 1,
                fontSize: { xs: "2.2rem", sm: "2.8rem" },
                background: "linear-gradient(90deg, #3f71d5, #5c85db, #c4a24f)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {title}
            </Typography>
            {subtitle && <Typography sx={{ color: "#6B7280", fontSize: "1rem" }}>{subtitle}</Typography>}
          </Box>

          {children}
        </Paper>
      </Container>
    </Box>
  );
}
