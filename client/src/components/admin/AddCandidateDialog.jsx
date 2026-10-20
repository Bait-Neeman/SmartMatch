import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
} from "@mui/material";
import {
  appearanceOptions,
  ethnicityOptions,
  genderOptions,
  maritalStatusOptions,
  styleOptions,
} from "../../constants/profileOptions.js";
import { ABOUT_ME_TITLE } from "../../utils/genderForms.js";
import { passwordError } from "../../utils/authForm.js";

const empty = (gender) => ({
  name: "",
  email: "",
  password: "",
  gender,
  ethnicity: "",
  age: "",
  maritalStatus: "",
  yeshiva: "",
  seminar: "",
  occupation: "",
  working: false,
  workplace: "",
  workingInProfession: false,
  city: "",
  height: "",
  style: "",
  appearance: "",
  financialDemand: "",
  financialParticipation: "",
  description: "",
});

const selectOptions = (label, options) => [{ value: "", label }, ...options];

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
  const female = form.gender === "female";
  const male = form.gender === "male";

  const submit = async () => {
    const passwordProblem = passwordError(form.password);
    if (passwordProblem) {
      setLocalError(passwordProblem);
      return;
    }
    setLocalError("");
    setBusy(true);
    try {
      const working = female && form.working;
      await onSubmit({
        name: form.name,
        email: form.email,
        password: form.password,
        gender: form.gender,
        ethnicity: form.ethnicity,
        age: form.age,
        maritalStatus: form.maritalStatus,
        yeshiva: male ? form.yeshiva : "",
        seminar: female ? form.seminar : "",
        occupation: female ? form.occupation : "",
        working,
        workplace: working ? form.workplace : "",
        workingInProfession: working ? form.workingInProfession : false,
        city: form.city,
        height: form.height,
        style: form.style,
        appearance: form.appearance,
        financialDemand: form.financialDemand,
        financialParticipation: form.financialParticipation,
        description: form.description,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>הוספת מועמד/ת</DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 1.5, pt: 1 }}>
        {localError || error ? <Alert severity="error">{localError || error}</Alert> : null}
        <TextField label="שם" value={form.name} onChange={set("name")} autoComplete="off" />
        <TextField label="אימייל" value={form.email} onChange={set("email")} autoComplete="off" />
        <TextField label="סיסמה" type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
        <TextField select label="מגדר" value={form.gender} onChange={set("gender")}>
          {genderOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        {form.gender ? (
          <>
            <Choice label="עדה" value={form.ethnicity} onChange={set("ethnicity")} options={ethnicityOptions} />
            <TextField label="גיל" value={form.age} onChange={set("age")} inputMode="numeric" />
            <Choice label="סטטוס" value={form.maritalStatus} onChange={set("maritalStatus")} options={maritalStatusOptions} />
            {male ? <TextField label="ישיבה" value={form.yeshiva} onChange={set("yeshiva")} /> : null}
            {female ? <TextField label="סמינר" value={form.seminar} onChange={set("seminar")} /> : null}
            {female ? <TextField label="מקצוע" value={form.occupation} onChange={set("occupation")} /> : null}
            {female ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.working}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        working: event.target.checked,
                        workplace: event.target.checked ? current.workplace : "",
                        workingInProfession: event.target.checked ? current.workingInProfession : false,
                      }))
                    }
                  />
                }
                label="עובדת"
              />
            ) : null}
            {female && form.working ? <TextField label="מקום עבודה" value={form.workplace} onChange={set("workplace")} /> : null}
            {female && form.working ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.workingInProfession}
                    onChange={(event) => setForm((current) => ({ ...current, workingInProfession: event.target.checked }))}
                  />
                }
                label="עובדת במקצוע שלמדתי"
              />
            ) : null}
            <TextField label="עיר" value={form.city} onChange={set("city")} />
            <TextField label='גובה (בס"מ)' value={form.height} onChange={set("height")} inputMode="numeric" />
            <Choice label="סגנון" value={form.style} onChange={set("style")} options={styleOptions} />
            <Choice label="מראה חיצוני" value={form.appearance} onChange={set("appearance")} options={appearanceOptions} />
            {male ? (
              <TextField label="דרישה כספית" value={form.financialDemand} onChange={set("financialDemand")} inputMode="numeric" />
            ) : null}
            <TextField
              label="השתתפות כספית"
              value={form.financialParticipation}
              onChange={set("financialParticipation")}
              inputMode="numeric"
            />
            {female ? (
              <TextField label="דרישה כספית" value={form.financialDemand} onChange={set("financialDemand")} inputMode="numeric" />
            ) : null}
            <TextField label={ABOUT_ME_TITLE} value={form.description} onChange={set("description")} multiline minRows={3} />
          </>
        ) : null}
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

function Choice({ label, value, onChange, options }) {
  return (
    <TextField select label={label} value={value} onChange={onChange}>
      {selectOptions("לא נבחר", options).map((option) => (
        <MenuItem key={option.value || option.label} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
