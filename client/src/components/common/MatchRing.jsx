import { Box, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";

// Gold disc from the stylesheet: 64px, radial gold fill, percent in Rubik.
export default function MatchRing({ value = 0, size = 64, caption }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <Box
      role="img"
      aria-label={`התאמה ${Math.round(percent)} אחוז`}
      sx={{
        width: size,
        height: size,
        position: "relative",
        flexShrink: 0,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #FDF6E3, #F1DCA6)",
      }}
    >
      <Box component="svg" viewBox="0 0 64 64" sx={{ width: "100%", height: "100%", display: "block" }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(201, 162, 74, 0.18)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={brand.gold}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 32 32)"
        />
      </Box>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontWeight: 600,
            fontSize: size >= 80 ? "22px" : size >= 64 ? "18px" : "14px",
            letterSpacing: "-0.3px",
            color: brand.navy,
            lineHeight: 1,
          }}
        >
          {Math.round(percent)}%
        </Typography>
        {caption ? (
          <Typography component="small" sx={{ fontSize: 11, color: brand.mut, mt: "3px" }}>
            {caption}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
