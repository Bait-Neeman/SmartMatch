import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Link, Paper, Typography } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";
import BrandLogo from "./BrandLogo.jsx";

export function AuthFooter({ question, label, to }) {
  return (
    <Typography sx={{ mt: 2.25, textAlign: "center", color: "text.secondary", fontSize: 15 }}>
      {question}{" "}
      <Link component={RouterLink} to={to} sx={{ color: brand.goldText, fontWeight: 700, textDecoration: "none" }}>
        {label}
      </Link>
    </Typography>
  );
}

export default function AuthLayout({ title, subtitle, children, wide = false }) {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1.1fr)" },
        bgcolor: brand.background,
      }}
    >
      <Box
        sx={{
          bgcolor: brand.navy,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: { md: "sticky" },
          top: 0,
          height: { md: "100vh" },
          minHeight: { xs: 280, md: "100vh" },
          px: 3,
          py: { xs: 4, md: 0 },
        }}
      >
        <BrandLogo maxWidth={400} />
      </Box>

      <Box
        sx={{
          minHeight: { md: "100vh" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflowY: "auto",
          px: { xs: 2, sm: 4 },
          py: { xs: 4, md: 5 },
          bgcolor: brand.background,
        }}
      >
        <Box sx={{ width: wide ? "min(620px, 100%)" : "min(420px, 100%)" }}>
          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowForward />}
            sx={{ mb: 1.5, color: brand.goldDeep, boxShadow: "none" }}
          >
            לדף הבית
          </Button>

          <Paper
            sx={{
              p: { xs: 3, sm: 4.5 },
              borderRadius: "18px",
              bgcolor: brand.paper,
              border: `1px solid ${brand.lineSoft}`,
              boxShadow: brand.shadowLift,
            }}
          >
            <Box sx={{ textAlign: "start", mb: 3 }}>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
                {title}
              </Typography>
              {subtitle && <Typography sx={{ color: "text.secondary" }}>{subtitle}</Typography>}
            </Box>

            {children}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
