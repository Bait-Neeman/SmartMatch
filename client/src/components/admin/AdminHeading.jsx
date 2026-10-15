import { Box, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";

export default function AdminHeading({ title, subtitle, action }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: { xs: "flex-start", sm: "flex-end" },
        gap: 2,
        flexWrap: "wrap",
        mt: 1,
        mb: 2,
      }}
    >
      <Box>
        <Typography
          component="h2"
          sx={{
            m: 0,
            fontSize: "clamp(22px, 1.9vw, 28px)",
            fontWeight: 600,
            letterSpacing: "-0.3px",
            color: brand.navy,
            lineHeight: 1.15,
          }}
        >
          {title}
        </Typography>
        {subtitle ? (
          <Typography sx={{ color: brand.mut, mt: 0.5, fontSize: 15 }}>{subtitle}</Typography>
        ) : null}
      </Box>
      {action}
    </Box>
  );
}
