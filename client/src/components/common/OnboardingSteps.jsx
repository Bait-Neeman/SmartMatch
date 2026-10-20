import { Box, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { pendingCopy } from "../../copy/pendingCopy.js";

const LABELS = ["פרטי חשבון", pendingCopy.identityTitle, "הפרופיל", "העדפות התאמה"];

export default function OnboardingSteps({ current }) {
  return (
    <Box
      aria-label={pendingCopy.stepOf(current, LABELS.length)}
      sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25, mb: 2.5 }}
    >
      {LABELS.map((label, index) => {
        const step = index + 1;
        const active = step === current;
        const done = step < current;
        return (
          <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
            {index > 0 ? <Box sx={{ width: 18, height: 1, bgcolor: done || active ? brand.gold : brand.inputLine }} /> : null}
            <Box
              aria-current={active ? "step" : undefined}
              sx={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                flex: "none",
                fontSize: 13,
                fontWeight: 700,
                color: active || done ? brand.goldText : brand.mut,
                bgcolor: active || done ? brand.tabOn : brand.paper,
                boxShadow: `inset 0 0 0 1px ${active || done ? brand.gold : brand.inputLine}`,
              }}
            >
              {step}
            </Box>
            <Typography sx={{ color: active ? brand.navy : brand.mut, fontWeight: active ? 700 : 500, fontSize: 14 }}>
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
