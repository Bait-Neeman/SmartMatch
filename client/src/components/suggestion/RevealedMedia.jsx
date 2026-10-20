import { Box } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import PersonAvatar from "../common/PersonAvatar.jsx";
import CroppedPhoto from "../common/CroppedPhoto.jsx";
import { readPhotoCrop } from "../../utils/photoCrop.js";

function Illustration({ rounded = false, gender }) {
  return (
    <PersonAvatar
      gender={gender}
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
export function RevealedAvatar({ url, name, gender, crop }) {
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
      <Illustration rounded gender={gender} />
      {url ? (
        <CroppedPhoto url={url} crop={readPhotoCrop(crop)} alt={name || ""} sx={{ position: "absolute", inset: 0 }} />
      ) : null}
    </Box>
  );
}

export function RevealedPhoto({ url, name, gender, crop }) {
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
      <Illustration gender={gender} />
      {url ? (
        <CroppedPhoto url={url} crop={readPhotoCrop(crop)} alt={name || ""} sx={{ position: "absolute", inset: 0 }} />
      ) : null}
    </Box>
  );
}
