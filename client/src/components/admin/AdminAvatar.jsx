import { Box } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import PersonAvatar from "../common/PersonAvatar.jsx";
import ProtectedImage from "../common/ProtectedFile.jsx";
import { toSafeFileUrl } from "../../utils/files.js";

export default function AdminAvatar({ image, gender, size = 48, rounded = "50%", ring = false, reveal = true }) {
  const url = reveal ? toSafeFileUrl(image) : "";

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: rounded,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        boxShadow: ring ? `0 0 0 3px ${brand.paper}, 0 0 0 4px ${brand.goldLight}` : "none",
      }}
    >
      <PersonAvatar gender={gender} size="100%" sx={{ width: "100%", height: "100%", borderRadius: 0 }} />
      {url ? (
        <ProtectedImage
          url={url}
          alt=""
          sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
    </Box>
  );
}
