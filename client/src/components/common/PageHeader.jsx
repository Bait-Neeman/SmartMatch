import { Box, Typography } from "@mui/material";

// The title block at the top of a page
export default function PageHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 4, textAlign: "center" }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 800, color: "#1f3f95", fontSize: { xs: "1.8rem", sm: "2.2rem" } }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ mt: 1, color: "text.secondary", fontSize: "1.05rem" }}>{subtitle}</Typography>
      )}
    </Box>
  );
}
