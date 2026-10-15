import { Box, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";

// Gold circle with the match percent in the middle.
export default function MatchRing({ value = 0, size = 68 }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <Box
      role="img"
      aria-label={`התאמה ${Math.round(percent)} אחוז`}
      sx={{ width: size, height: size, position: "relative", flexShrink: 0 }}
    >
      <Box component="svg" viewBox="0 0 64 64" sx={{ width: "100%", height: "100%", display: "block" }}>
        <circle cx="32" cy="32" r="24" fill="#F8F1DE" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke={brand.goldLight} strokeWidth="3.5" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={brand.gold}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 32 32)"
        />
      </Box>
      <Typography
        component="span"
        sx={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: size < 60 ? "0.75rem" : "0.875rem",
          color: brand.navy,
          lineHeight: 1,
        }}
      >
        {Math.round(percent)}%
      </Typography>
    </Box>
  );
}
