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
        px: 1.5,
        height: 30,
        borderRadius: "8px",
        bgcolor: colors.background,
        color: colors.color,
        boxShadow: `inset 0 0 0 1px ${colors.border}`,
        fontWeight: 600,
        fontSize: "13px",
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </Box>
  );
}
