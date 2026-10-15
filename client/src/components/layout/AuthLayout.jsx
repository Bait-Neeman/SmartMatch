import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Container, Divider, Paper, Typography } from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";
import BrandLogo from "./BrandLogo.jsx";

export function AuthSwitch({ question, label, to }) {
  return (
    <Box sx={{ mt: 4 }}>
      <Divider sx={{ mb: 3, color: "text.secondary", fontSize: "0.9rem" }}>או</Divider>

      <Typography sx={{ mb: 2, textAlign: "center", color: "text.secondary", fontSize: "1rem" }}>{question}</Typography>

      <Button component={RouterLink} to={to} variant="outlined" size="large" fullWidth sx={{ py: 1.25, fontWeight: 700 }}>
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
        bgcolor: brand.navyDeep,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 5,
        px: 2,
      }}
    >
      <Container maxWidth="sm">
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowForward />}
          sx={{ mb: 1.5, color: brand.goldLight, boxShadow: "none" }}
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
          <Box
            sx={{
              bgcolor: brand.navyDeep,
              borderRadius: "14px",
              mb: 3,
              pt: 0.5,
              pb: 0.5,
            }}
          >
            <BrandLogo maxWidth={200} />
          </Box>

          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: "text.primary", mb: 1 }}>
              {title}
            </Typography>
            {subtitle && <Typography sx={{ color: "text.secondary" }}>{subtitle}</Typography>}
          </Box>

          {children}
        </Paper>
      </Container>
    </Box>
  );
}
