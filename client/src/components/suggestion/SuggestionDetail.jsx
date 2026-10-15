import { Alert, Box, Typography } from "@mui/material";
import {
  ArrowForward,
  FavoriteBorder,
  Height,
  LockOutlined,
  Place,
  School,
  Stars,
  Payments,
  Work,
} from "@mui/icons-material";
import { brand, statusTones } from "../../theme/tokens.js";
import StatusPill from "../common/StatusPill.jsx";
import MatchRing from "../common/MatchRing.jsx";
import { LockedPhoto } from "./LockedMedia.jsx";
import { SUGGESTION_KINDS } from "../../utils/suggestionView.js";

const FIELD_ICONS = {
  height: Height,
  maritalStatus: FavoriteBorder,
  community: Stars,
  city: Place,
  institution: School,
  occupation: Work,
  financialRequirement: Payments,
  financialDemand: Payments,
  financialParticipation: Payments,
};

export default function SuggestionDetail({ view, icon, actions, error, onBack }) {
  const meta = SUGGESTION_KINDS[view.kind] || SUGGESTION_KINDS.new;
  const tone = statusTones[meta.tone] || statusTones.pending;

  return (
    <Box>
      <Box
        component="button"
        type="button"
        onClick={onBack}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1.5,
          mb: 2,
          p: 0,
          border: 0,
          background: "none",
          cursor: "pointer",
          color: brand.navy,
          font: "inherit",
          fontWeight: 600,
          fontSize: "clamp(22px, 1.9vw, 28px)",
          letterSpacing: "-0.3px",
        }}
      >
        <ArrowForward />
        פרטי הצעה
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2.5,
          px: 2.25,
          py: 1.75,
          borderRadius: "14px",
          border: `1px solid ${brand.line}`,
          bgcolor: brand.paper,
          background: `linear-gradient(90deg, ${tone.background}, ${brand.paper} 58%)`,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "14px",
            display: "grid",
            placeItems: "center",
            bgcolor: brand.paper,
            color: tone.color,
            border: `1px solid ${brand.line}`,
            flex: "none",
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography component="b" sx={{ display: "block", fontWeight: 600, fontSize: "clamp(16px, 1.3vw, 19px)", letterSpacing: "-0.3px", color: brand.navy }}>
            {meta.bannerTitle}
          </Typography>
          <Typography component="small" sx={{ display: "block", color: "text.secondary", fontSize: 14, mt: 0.25 }}>
            {meta.bannerText}
          </Typography>
        </Box>
        <StatusPill tone={meta.tone} label={meta.label} icon={icon} />
      </Box>

      <Box
        sx={{
          bgcolor: brand.paper,
          border: `1px solid ${brand.line}`,
          borderRadius: `${brand.radiusCard}px`,
          boxShadow: brand.shadow,
          p: "clamp(16px, 1.6vw, 24px)",
        }}
      >
        <Box
          sx={{
            display: "grid",
            gap: "clamp(20px, 2.6vw, 40px)",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(230px, 300px)" },
          }}
        >
          <Box sx={{ order: { xs: 2, lg: 1 }, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 2,
                pb: 2.5,
                borderBottom: `1px solid ${brand.line}`,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  component="h2"
                  sx={{
                    m: 0,
                    fontWeight: 600,
                    letterSpacing: "-0.3px",
                    color: brand.navy,
                    fontSize: "clamp(28px, 2.6vw, 40px)",
                    lineHeight: 1.1,
                  }}
                >
                  {view.title}
                </Typography>
                {view.city ? (
                  <Typography sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1, color: "text.secondary" }}>
                    <Place sx={{ fontSize: 16 }} />
                    {view.city}
                  </Typography>
                ) : null}
              </Box>
              {view.percent != null ? <MatchRing value={view.percent} size={84} caption="התאמה" /> : null}
            </Box>

            {view.fields.length > 0 ? (
              <Box
                component="ul"
                sx={{
                  listStyle: "none",
                  m: 0,
                  mt: 2.75,
                  p: 0,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  columnGap: 5,
                  rowGap: 1.75,
                }}
              >
                {view.fields.map((field) => {
                  const Icon = FIELD_ICONS[field.key] || Place;
                  return (
                    <Box
                      component="li"
                      key={field.key}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "18px minmax(104px, 132px) minmax(0, 1fr)",
                        gap: "10px",
                        alignItems: "center",
                        fontSize: "15.5px",
                      }}
                    >
                      <Icon sx={{ fontSize: 16, color: brand.gold, opacity: 0.75 }} />
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        {field.label}
                      </Box>
                      <Box component="b" sx={{ fontWeight: 600, color: "text.primary", wordBreak: "break-word" }}>
                        {field.value}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : null}

            {view.description || view.lookingFor ? (
              <Box sx={{ mt: 2.75, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
                {view.description ? (
                  <Box>
                    <Typography
                      component="h3"
                      sx={{
                        mt: 2.25,
                        mb: 1,
                        fontWeight: 600,
                        letterSpacing: "-0.3px",
                        color: brand.navy,
                        fontSize: "clamp(17px, 1.4vw, 20px)",
                      }}
                    >
                      קצת עליי / תכונות
                    </Typography>
                    <Typography sx={{ color: brand.ink2, lineHeight: 1.85, fontSize: 16, maxWidth: "68ch" }}>
                      {view.description}
                    </Typography>
                  </Box>
                ) : null}
                {view.lookingFor ? (
                  <Box>
                    <Typography
                      component="h3"
                      sx={{
                        mt: 2.75,
                        mb: 1,
                        fontWeight: 600,
                        letterSpacing: "-0.3px",
                        color: brand.navy,
                        fontSize: "clamp(17px, 1.4vw, 20px)",
                      }}
                    >
                      {view.lookingForHeading || "מה מחפש/ת"}
                    </Typography>
                    <Typography sx={{ color: brand.ink2, lineHeight: 1.85, fontSize: 16, maxWidth: "68ch" }}>
                      {view.lookingFor}
                    </Typography>
                  </Box>
                ) : null}
              </Box>
            ) : null}

            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                mt: 2.5,
                px: 2,
                py: 1.25,
                borderRadius: "999px",
                fontSize: 14,
                color: brand.pillGoldText,
                bgcolor: brand.pillGoldBg,
              }}
            >
              <LockOutlined sx={{ fontSize: 16 }} />
              תמונה ושם יוצגו רק לאחר אישור הדדי
            </Box>
          </Box>

          <Box
            sx={{
              order: { xs: 1, lg: 2 },
              display: "flex",
              flexDirection: "column",
              gap: 1.75,
              alignSelf: "start",
              position: { lg: "sticky" },
              top: { lg: 24 },
            }}
          >
            <LockedPhoto />
            {actions ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "row", lg: "column" },
                  gap: 1.25,
                  "& .MuiButton-root": { flex: 1, width: { lg: "100%" } },
                }}
              >
                {actions}
              </Box>
            ) : null}
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
