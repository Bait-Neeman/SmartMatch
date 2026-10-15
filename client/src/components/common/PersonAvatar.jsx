import { Box } from "@mui/material";
import { brand } from "../../theme/tokens.js";

// Head and shoulders overlap in one flat color, so there is no neck and no face.

export default function PersonAvatar({ locked = false, size = 64, color = brand.navy }) {
  const fill = locked ? brand.mist : color;
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        bgcolor: locked ? "#E4E9F0" : "#E7EDF4",
        display: "grid",
        placeItems: "center",
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 80 80"
        sx={{
          width: "86%",
          height: "86%",
          display: "block",
          filter: locked ? "blur(4px)" : "none",
          opacity: locked ? 0.85 : 1,
        }}
      >
        <circle cx="40" cy="28" r="16" fill={fill} />
        <rect x="4" y="28" width="72" height="52" rx="18" fill={fill} />
      </Box>
    </Box>
  );
}
