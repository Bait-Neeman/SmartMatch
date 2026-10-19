import { Alert, Box, Card, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import StatusPill from "../common/StatusPill.jsx";
import { LockedAvatar } from "./LockedMedia.jsx";
import { SUGGESTION_KINDS } from "../../utils/suggestionView.js";

export default function SuggestionRow({
  view,
  icon,
  actions,
  error,
  onOpen,
  reservePercent = false,
  leading,
  showStatus = true,
  statusPlacement = "center",
  percentNode,
}) {
  const meta = SUGGESTION_KINDS[view.kind] || SUGGESTION_KINDS.new;
  const statusBelow = statusPlacement === "below";
  const status =
    showStatus && meta.label ? <StatusPill tone={meta.tone} label={meta.label} icon={icon} /> : null;
  const percent =
    percentNode || reservePercent ? (
      <Box
        sx={{
          width: percentNode ? "auto" : 64,
          flex: "none",
          fontWeight: 700,
          fontSize: 15,
          color: brand.pillGreenText,
          textAlign: "center",
          "@media (max-width:1280px)": percentNode ? undefined : { display: "none" },
        }}
      >
        {percentNode || null}
      </Box>
    ) : null;

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
        {leading || <LockedAvatar gender={view?.gender} />}
        <Box sx={{ flex: statusBelow ? "0 1 auto" : "0 1 260px", minWidth: statusBelow ? "auto" : 0, maxWidth: statusBelow ? 520 : undefined }}>
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
          {statusBelow && status ? <Box sx={{ mt: "6px" }}>{status}</Box> : null}
        </Box>

        {statusBelow ? null : percent}

        {statusBelow ? (
          <Box sx={{ flex: "1 1 16px" }} />
        ) : (
          <Box sx={{ flex: "1 1 auto", minWidth: 0, display: "flex", justifyContent: "center" }}>{status}</Box>
        )}

        {statusBelow ? percent : null}

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
            <Box
              component="svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              sx={{ width: 18, height: 18, display: "block" }}
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </Box>
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
