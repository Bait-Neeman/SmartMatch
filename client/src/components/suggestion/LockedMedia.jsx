import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { LockOutlined } from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";

function LockBadge({ size }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        bgcolor: alpha(brand.navy, 0.35),
        color: brand.paper,
        position: "relative",
        zIndex: 1,
      }}
    >
      <LockOutlined sx={{ fontSize: Math.round(size * 0.5) }} />
    </Box>
  );
}

// Neutral lock placeholder. Never an image, never a question mark.
export function LockedAvatar({ size = 56 }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "18px",
        flex: "none",
        display: "grid",
        placeItems: "center",
        color: brand.paper,
        background: brand.lockedPhoto,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <LockBadge size={size < 80 ? 30 : 52} />
    </Box>
  );
}

export function LockedPhoto() {
  return (
    <Box
      aria-label="התמונה והשם מוסתרים"
      sx={{
        position: "relative",
        height: { xs: 300, lg: "clamp(300px, 25vw, 360px)" },
        borderRadius: "24px",
        overflow: "hidden",
        background: brand.lockedPhoto,
        color: brand.paper,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, transparent 40%, ${alpha(brand.navy, 0.75)})`,
        }}
      />
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          textAlign: "center",
          gap: 0.75,
          px: 3,
          pb: 3.5,
        }}
      >
        <Box sx={{ mt: "auto", mb: "auto" }}>
          <LockBadge size={60} />
        </Box>
        <Typography component="b" sx={{ fontWeight: 600, fontSize: 22, letterSpacing: "-0.3px" }}>
          התמונה והשם מוסתרים
        </Typography>
        <Typography component="small" sx={{ fontSize: 14, maxWidth: 240, lineHeight: 1.45 }}>
          יוצגו לשני הצדדים לאחר אישור התעניינות הדדי
        </Typography>
      </Box>
    </Box>
  );
}
