import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

export default function ConfirmDialog({ open, title, body, confirmLabel, cancelLabel = "ביטול", busy = false, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ color: "text.secondary" }}>{body}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
