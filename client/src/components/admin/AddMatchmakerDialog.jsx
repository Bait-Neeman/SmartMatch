import { useState } from "react";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";

const EMPTY = { name: "", idNumber: "", email: "", password: "" };

export default function AddMatchmakerDialog({ open, error, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [seen, setSeen] = useState(open);
  const [busy, setBusy] = useState(false);

  if (open !== seen) {
    setSeen(open);
    if (open) setForm(EMPTY);
  }

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async () => {
    setBusy(true);
    try {
      await onSubmit(form);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>הוספת שדכן/ית</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        <TextField label="שם" value={form.name} onChange={set("name")} autoComplete="off" />
        <TextField label="תעודת זהות" value={form.idNumber} onChange={set("idNumber")} autoComplete="off" />
        <TextField label="אימייל" value={form.email} onChange={set("email")} autoComplete="off" />
        <TextField label="סיסמה" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          ביטול
        </Button>
        <Button variant="contained" onClick={submit} disabled={busy}>
          הוספה
        </Button>
      </DialogActions>
    </Dialog>
  );
}
