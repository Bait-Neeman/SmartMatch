import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { isAppFileUrl } from "../../utils/files.js";
import { fetchFileBlob } from "../../utils/protectedFile.js";

const ProtectedImage = ({ url, alt, sx }) => {
  const [blobSrc, setBlobSrc] = useState("");

  useEffect(() => {
    if (!isAppFileUrl(url)) return undefined;

    let objectUrl = "";
    let cancelled = false;
    fetchFileBlob(url)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setBlobSrc("");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  const src = !url || isAppFileUrl(url) ? blobSrc : url;
  if (!src) return null;
  return <Box component="img" src={src} alt={alt} sx={sx} />;
};

export default ProtectedImage;
