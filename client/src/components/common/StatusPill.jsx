import { Box } from "@mui/material";
import { statusTones } from "../../theme/tokens.js";

export default function StatusPill({ tone = "neutral", label, children }) {
  const colors = statusTones[tone] || statusTones.neutral;
  const text = label ?? children;

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        px: 1.25,
        height: 28,
        borderRadius: 999,
        bgcolor: colors.background,
        color: colors.color,
        fontWeight: 600,
        fontSize: "0.8125rem",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </Box>
  );
}
