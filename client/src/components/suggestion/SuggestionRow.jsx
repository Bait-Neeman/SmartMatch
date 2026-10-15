import { Alert, Box, Card, Typography } from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";
import StatusPill from "../common/StatusPill.jsx";
import { LockedAvatar } from "./LockedMedia.jsx";
import { SUGGESTION_KINDS } from "../../utils/suggestionView.js";

export default function SuggestionRow({ view, icon, actions, error, onOpen, reservePercent = false }) {
  const meta = SUGGESTION_KINDS[view.kind] || SUGGESTION_KINDS.new;

  return (
    <Box sx={{ mb: 1.5 }}>
      <Card
        role="link"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter") onOpen?.();
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "clamp(10px, 1.3vw, 20px)",
          py: "10px",
          paddingInlineStart: "18px",
          paddingInlineEnd: "10px",
          cursor: "pointer",
          flexWrap: "nowrap",
          transition: "transform .18s ease, box-shadow .18s ease, background-color .18s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            bgcolor: brand.rowHover,
            borderColor: brand.rowHoverBorder,
            boxShadow: brand.rowHoverShadow,
          },
          "@media (max-width:1180px)": {
            flexWrap: "wrap",
          },
        }}
      >
        <LockedAvatar />
        <Box sx={{ flex: "0 1 260px", minWidth: 0 }}>
          <Typography
            component="h3"
            sx={{
              m: 0,
              fontWeight: 600,
              fontSize: 21,
              letterSpacing: "-0.3px",
              color: brand.navy,
              lineHeight: 1.25,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {view.title}
          </Typography>
          {view.subtitle ? (
            <Typography
              component="small"
              sx={{
                display: "block",
                color: "text.secondary",
                fontSize: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {view.subtitle}
            </Typography>
          ) : null}
        </Box>

        {reservePercent ? (
          <Typography
            sx={{
              width: 64,
              flex: "none",
              fontWeight: 700,
              fontSize: 15,
              color: brand.pillGreenText,
              textAlign: "center",
              "@media (max-width:1280px)": { display: "none" },
            }}
          >
            {view.percent == null ? "" : `${view.percent}%`}
          </Typography>
        ) : null}

        <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", justifyContent: "center" }}>
          <StatusPill tone={meta.tone} label={meta.label} icon={icon} />
        </Box>

        <Box
          className="suggestion-actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flex: "none",
            "@media (max-width:1180px)": {
              width: "100%",
              justifyContent: "flex-start",
            },
          }}
        >
          {actions}
          <Box sx={{ width: 28, display: "grid", placeItems: "center", color: brand.goldDeep, flex: "none" }}>
            <ChevronLeft sx={{ fontSize: 18 }} />
          </Box>
        </Box>
      </Card>
      {error ? (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      ) : null}
    </Box>
  );
}
