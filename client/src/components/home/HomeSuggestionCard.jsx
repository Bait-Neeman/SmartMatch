import { Box, CircularProgress, IconButton, Typography } from "@mui/material";
import {
  AccountBalanceWalletOutlined,
  AutoAwesome,
  FavoriteBorder,
  GroupsOutlined,
  HeightOutlined,
  LockOutlined,
  PersonOutlined,
  WorkOutlined,
} from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";
import StatusPill from "../common/StatusPill.jsx";

const LINE_ICONS = {
  community: GroupsOutlined,
  occupation: WorkOutlined,
  height: HeightOutlined,
  maritalStatus: PersonOutlined,
  financialDemand: AccountBalanceWalletOutlined,
  financialRequirement: AccountBalanceWalletOutlined,
  financialParticipation: AccountBalanceWalletOutlined,
  financialStatus: AccountBalanceWalletOutlined,
};

function Chevron() {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      sx={{ width: 15, height: 15, display: "block" }}
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </Box>
  );
}

export default function HomeSuggestionCard({ card, onOpen, onInterest, sending = false, error = "" }) {
  const open = () => onOpen?.(card);

  return (
    <Box>
      <Box
        role="link"
        tabIndex={0}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === "Enter") open();
        }}
        sx={{
          position: "relative",
          p: "10px",
          borderRadius: `${brand.radiusCard}px`,
          bgcolor: brand.paper,
          border: `1px solid ${brand.line}`,
          boxShadow: brand.shadow,
          cursor: "pointer",
          transition: "transform .18s ease, box-shadow .18s ease",
          "&:hover": {
            transform: "translateY(-2px)",
            borderColor: brand.rowHoverBorder,
            boxShadow: brand.rowHoverShadow,
          },
        }}
      >
        <Box
          aria-hidden
          sx={{
            height: "clamp(150px, 11.5vw, 175px)",
            borderRadius: "22px",
            display: "grid",
            placeItems: "center",
            color: brand.paper,
            background: brand.lockedPhoto,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: "rgba(11, 31, 58, 0.35)",
            }}
          >
            <LockOutlined sx={{ fontSize: 22 }} />
          </Box>
        </Box>

        <Box sx={{ position: "absolute", top: 22, insetInlineStart: 22 }}>
          <StatusPill tone="pending" label="הצעה חדשה" icon={<AutoAwesome />} />
        </Box>

        <Box sx={{ px: "10px", pt: 2, pb: 1 }}>
          <Typography
            component="h3"
            sx={{ m: 0, fontWeight: 600, fontSize: "clamp(17px, 1.3vw, 20px)", color: brand.navy, letterSpacing: "-0.3px" }}
          >
            {card.title}
          </Typography>
          {card.city ? (
            <Typography component="small" sx={{ display: "block", color: brand.mut, fontSize: 14 }}>
              {card.city}
            </Typography>
          ) : null}

          {card.lines.map((line) => {
            const Icon = LINE_ICONS[line.key] || PersonOutlined;
            return (
              <Typography
                key={line.key}
                sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, color: brand.ink2, fontSize: 14 }}
              >
                <Icon sx={{ fontSize: 16, color: brand.mut2 }} />
                <Box component="span" sx={{ color: brand.mut, flex: "none" }}>
                  {line.label}
                </Box>
                <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {line.value}
                </Box>
              </Typography>
            );
          })}

          {card.percent != null ? (
            <Typography sx={{ mt: 1, fontWeight: 700, fontSize: 14, color: brand.pillGreenText }}>התאמה {card.percent}%</Typography>
          ) : null}

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: "14px" }}>
            <Box
              component="span"
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontWeight: 600, fontSize: 14, color: brand.goldDark }}
            >
              פרטים מלאים
              <Chevron />
            </Box>
            <IconButton
              aria-label="שלח התעניינות"
              title="שלח התעניינות"
              disabled={sending}
              onClick={(event) => {
                event.stopPropagation();
                onInterest?.(card);
              }}
              sx={{
                width: 44,
                height: 44,
                borderRadius: "10px",
                color: brand.gold,
                bgcolor: brand.paper,
                boxShadow: `inset 0 0 0 1.5px ${brand.gold}`,
                "&:hover": { bgcolor: brand.pillGoldBg },
              }}
            >
              {sending ? <CircularProgress size={18} color="inherit" /> : <FavoriteBorder />}
            </IconButton>
          </Box>
        </Box>
      </Box>
      {error ? (
        <Typography sx={{ mt: 1, color: "error.main", fontSize: 13 }}>{error}</Typography>
      ) : null}
    </Box>
  );
}
