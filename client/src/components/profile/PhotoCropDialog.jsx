import { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Slider, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { brand } from "../../theme/tokens.js";
import { pendingCopy } from "../../copy/pendingCopy.js";
import { roundCrop } from "../../utils/photoCrop.js";

const frameSx = {
  position: "relative",
  height: { xs: "min(68vh, 520px)", sm: 420 },
  bgcolor: brand.navy,
  borderRadius: `${brand.radius}px`,
  overflow: "hidden",
  touchAction: "none",
};

function CropEditor({ src, initialCrop, saving, onCancel, onSave }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(initialCrop?.zoom || 1);
  const [ready, setReady] = useState(Boolean(initialCrop));
  const areaRef = useRef(initialCrop);

  return (
    <>
      <Box dir="ltr" sx={frameSx}>
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          minZoom={1}
          maxZoom={3}
          zoomWithScroll
          objectFit="contain"
          initialCroppedAreaPercentages={
            initialCrop
              ? { x: initialCrop.x, y: initialCrop.y, width: initialCrop.width, height: initialCrop.height }
              : undefined
          }
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(area) => {
            areaRef.current = area;
            setReady(true);
          }}
          style={{
            cropAreaStyle: { border: `2px solid ${brand.gold}` },
          }}
        />
      </Box>
      <Typography id="photo-zoom-label" sx={{ color: brand.navy, fontWeight: 600, mt: 2, mb: 0.5, fontSize: 14 }}>
        {pendingCopy.photoCropZoom}
      </Typography>
      <Slider
        value={zoom}
        min={1}
        max={3}
        step={0.01}
        color="primary"
        aria-labelledby="photo-zoom-label"
        onChange={(_, value) => setZoom(Array.isArray(value) ? value[0] : value)}
      />
      <DialogActions sx={{ px: 0, pt: 1 }}>
        <Button onClick={onCancel} disabled={saving}>
          ביטול
        </Button>
        <Button
          variant="contained"
          disabled={saving || !ready}
          onClick={() => {
            const next = roundCrop(areaRef.current, zoom);
            if (next) onSave(next);
          }}
        >
          שמירה
        </Button>
      </DialogActions>
    </>
  );
}

const sessionKey = (src, initialCrop) =>
  `${src}|${
    initialCrop ? `${initialCrop.x},${initialCrop.y},${initialCrop.width},${initialCrop.height},${initialCrop.zoom}` : "new"
  }`;

export default function PhotoCropDialog({ open, src, initialCrop = null, saving = false, onCancel, onSave }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const close = () => {
    if (!saving) onCancel();
  };

  return (
    <Dialog open={open} onClose={close} fullScreen={fullScreen} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: brand.navy, fontWeight: 600 }}>{pendingCopy.photoCropTitle}</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: brand.mut, fontSize: 14, mb: 1.5 }}>{pendingCopy.photoCropHint}</Typography>
        {open && src ? (
          <CropEditor
            key={sessionKey(src, initialCrop)}
            src={src}
            initialCrop={initialCrop}
            saving={saving}
            onCancel={close}
            onSave={onSave}
          />
        ) : (
          <>
            <Box sx={frameSx} />
            <DialogActions sx={{ px: 0, pt: 1 }}>
              <Button onClick={close} disabled={saving}>
                ביטול
              </Button>
              <Button variant="contained" disabled>
                שמירה
              </Button>
            </DialogActions>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
