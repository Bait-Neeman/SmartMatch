import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { LockOpen } from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";
import PersonAvatar from "../common/PersonAvatar.jsx";
import ProtectedImage from "../common/ProtectedFile.jsx";

function Illustration({ rounded = false }) {
  return (
    <PersonAvatar
      size="100%"
      sx={{
        width: "100%",
        height: "100%",
        borderRadius: rounded ? "14px" : 0,
        position: "absolute",
        inset: 0,
      }}
    />
  );
}

// Photo for a match the server already marked as accepted. The file is loaded
// through the protected-file helper. Until it loads, the approved illustration shows.
export function RevealedAvatar({ url, name }) {
  return (
    <Box
      aria-hidden={!name}
      sx={{
        width: 72,
        height: 80,
        borderRadius: "14px",
        overflow: "hidden",
        flex: "none",
        position: "relative",
        bgcolor: brand.avatar,
      }}
    >
      <Illustration rounded />
      {url ? (
        <ProtectedImage
          url={url}
          alt={name || ""}
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
    </Box>
  );
}

export function RevealedPhoto({ url, name }) {
  return (
    <Box
      sx={{
        position: "relative",
        height: { xs: 300, lg: "clamp(300px, 25vw, 360px)" },
        borderRadius: "24px",
        overflow: "hidden",
        bgcolor: brand.avatar,
      }}
    >
      <Illustration />
      {url ? (
        <ProtectedImage
          url={url}
          alt={name || ""}
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      <Box
        sx={{
          position: "absolute",
          bottom: 14,
          right: 14,
          zIndex: 1,
          display: "flex",
          gap: "6px",
          alignItems: "center",
          px: "14px",
          py: "8px",
          borderRadius: "999px",
          fontSize: 13,
          fontWeight: 600,
          color: brand.pillGreenText,
          bgcolor: alpha(brand.paper, 0.85),
        }}
      >
        <LockOpen sx={{ fontSize: 16 }} />
        נחשף לאחר אישור הדדי
      </Box>
    </Box>
  );
}
