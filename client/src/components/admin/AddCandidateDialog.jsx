import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { genderOptions } from "../../constants/profileOptions.js";
import { passwordError } from "../../utils/authForm.js";

const empty = (gender) => ({
  name: "",
  idNumber: "",
  email: "",
  password: "",
  gender,
  age: "",
  city: "",
  occupation: "",
  school: "",
});

export default function AddCandidateDialog({ open, gender, error, onClose, onSubmit }) {
  const [form, setForm] = useState(() => empty(gender));
  const [seen, setSeen] = useState(open);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  if (open !== seen) {
    setSeen(open);
    if (open) {
      setForm(empty(gender));
      setLocalError("");
    }
  }

  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const schoolKey = form.gender === "female" ? "seminar" : "yeshiva";

  const submit = async () => {
    const passwordProblem = passwordError(form.password);
    if (passwordProblem) {
      setLocalError(passwordProblem);
      return;
    }
    setLocalError("");
    setBusy(true);
    try {
      await onSubmit({
        name: form.name,
        idNumber: form.idNumber,
        email: form.email,
        password: form.password,
        gender: form.gender,
        age: form.age,
        city: form.city,
        occupation: form.occupation,
        yeshiva: schoolKey === "yeshiva" ? form.school : "",
        seminar: schoolKey === "seminar" ? form.school : "",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>הוספת מועמד/ת</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
        {localError || error ? <Alert severity="error">{localError || error}</Alert> : null}
        <TextField label="שם" value={form.name} onChange={set("name")} autoComplete="off" />
        <TextField label="תעודת זהות" value={form.idNumber} onChange={set("idNumber")} autoComplete="off" />
        <TextField label="אימייל" value={form.email} onChange={set("email")} autoComplete="off" />
        <TextField label="סיסמה" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
        <TextField select label="מגדר" value={form.gender} onChange={set("gender")}>
          {genderOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField label="גיל" value={form.age} onChange={set("age")} inputMode="numeric" />
        <TextField label="עיר" value={form.city} onChange={set("city")} />
        <TextField label={form.gender === "female" ? "סמינר" : "ישיבה"} value={form.school} onChange={set("school")} />
        <TextField label="עיסוק" value={form.occupation} onChange={set("occupation")} />
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
