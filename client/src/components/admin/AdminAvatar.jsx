import { useSelector } from "react-redux";
import { Box } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import PersonAvatar from "../common/PersonAvatar.jsx";
import CroppedPhoto from "../common/CroppedPhoto.jsx";
import { toSafeFileUrl } from "../../utils/files.js";
import { readPhotoCrop } from "../../utils/photoCrop.js";
import { selectHideFemalePhotos } from "../../store/slices/adminSlice.js";

export default function AdminAvatar({ image, crop, gender, size = 48, rounded = "50%", ring = false, reveal = true }) {
  const hideFemalePhotos = useSelector(selectHideFemalePhotos);
  const hidden = hideFemalePhotos && gender === "female";
  const url = reveal && !hidden ? toSafeFileUrl(image) : "";
  const photoCrop = reveal && !hidden ? readPhotoCrop(crop) : null;

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
        <CroppedPhoto url={url} crop={photoCrop} alt="" sx={{ position: "absolute", inset: 0 }} />
      ) : null}
    </Box>
  );
}
