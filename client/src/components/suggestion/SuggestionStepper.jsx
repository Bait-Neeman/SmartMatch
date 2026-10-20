import { Box, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { SUGGESTION_KINDS } from "../../utils/suggestionView.js";

const ORDER = ["new", "sent", "accepted", "forwarded", "matchmaker"];

const currentIndex = (kind) => {
  if (kind === "received") return 1;
  if (kind === "other-forwarded") return 3;
  const index = ORDER.indexOf(kind);
  return index;
};

export default function SuggestionStepper({ kind }) {
  const active = currentIndex(kind);
  if (active < 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        mb: 2,
        pb: 0.5,
      }}
    >
      {ORDER.map((step, index) => {
        const labelKind = index === active ? kind : step;
        const meta = SUGGESTION_KINDS[labelKind] || SUGGESTION_KINDS[step];
        const done = index < active;
        const on = index === active;
        return (
          <Box
            key={step}
            aria-current={on ? "step" : undefined}
            sx={{
              flex: "1 0 120px",
              minWidth: 0,
              px: 1.25,
              py: 1,
              borderRadius: "12px",
              bgcolor: on ? brand.tabOn : brand.paper,
              border: `1px solid ${on ? brand.gold : brand.line}`,
              opacity: done || on ? 1 : 0.72,
            }}
          >
            <Typography sx={{ m: 0, fontSize: 12, fontWeight: 700, color: on ? brand.goldText : brand.mut }}>{index + 1}</Typography>
            <Typography sx={{ m: 0, mt: 0.25, fontSize: 13, fontWeight: 600, color: brand.navy, lineHeight: 1.35 }}>
              {meta.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
