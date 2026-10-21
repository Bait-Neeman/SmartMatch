import { useEffect, useRef, useState } from "react";
import styled from "@emotion/styled";
import { Box } from "@mui/material";
import { isAppFileUrl } from "../../utils/files.js";
import { fetchFileBlob } from "../../utils/protectedFile.js";
import { layoutCrop, photoCoverDeclarations, photoFrameDeclarations, readPhotoCrop, focalPosition } from "../../utils/photoCrop.js";

const PhotoImg = styled("img")`
  ${({ rules }) => rules}
`;

// Shows the original file, framed by the stored crop. No crop means centered cover.
export default function CroppedPhoto({ url = "", src = "", alt = "", crop = null, sx }) {
  const frameRef = useRef(null);
  const [blob, setBlob] = useState({ key: "", src: "" });
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const safeCrop = readPhotoCrop(crop);
  const needsFetch = !src && Boolean(url) && isAppFileUrl(url);
  const resolved = needsFetch && blob.key === url ? blob.src : "";

  useEffect(() => {
    if (!needsFetch) return undefined;

    let objectUrl = "";
    let cancelled = false;
    fetchFileBlob(url)
      .then((file) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(file);
        setBlob({ key: url, src: objectUrl });
      })
      .catch(() => {
        if (!cancelled) setBlob({ key: url, src: "" });
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [needsFetch, url]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setFrame((current) => (current.width === width && current.height === height ? current : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [src, url, resolved]);

  const shown = src || (needsFetch ? resolved : url);
  const layout = shown
    ? layoutCrop({
        containerWidth: frame.width,
        containerHeight: frame.height,
        imageWidth: natural.width,
        imageHeight: natural.height,
        crop: safeCrop,
      })
    : null;

  return (
    <Box ref={frameRef} sx={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", ...sx }}>
      {shown ? (
        <PhotoImg
          src={shown}
          alt={alt}
          draggable={false}
          rules={layout ? photoFrameDeclarations(layout) : photoCoverDeclarations(focalPosition(safeCrop))}
          onLoad={(event) => {
            const width = event.currentTarget.naturalWidth;
            const height = event.currentTarget.naturalHeight;
            setNatural((current) => (current.width === width && current.height === height ? current : { width, height }));
          }}
        />
      ) : null}
    </Box>
  );
}
