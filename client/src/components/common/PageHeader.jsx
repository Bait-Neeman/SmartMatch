import { Box, Typography } from "@mui/material";

// The title block at the top of a page
export default function PageHeader({ title, subtitle }) {
  return (
    <Box sx={{ mb: 3, textAlign: "start" }}>
      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 600 }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography sx={{ mt: 1, color: "text.secondary", fontSize: "1.05rem" }}>{subtitle}</Typography>
      )}
    </Box>
  );
}
