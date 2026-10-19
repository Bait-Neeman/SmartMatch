import { Box, Checkbox, FormControlLabel, FormHelperText, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { asNameList, institutionKey, normaliseInstitution } from "../../utils/genderForms.js";

const checkboxSx = {
  color: brand.gold,
  "&.Mui-checked": { color: brand.goldDeep },
};

// Scrollable list. The first row means no filter. Picking a name clears it,
// and picking it again clears every name.
export default function InstitutionChecklist({ label, noneLabel, options = [], value, onChange, institutions = false }) {
  const keyOf = institutions ? institutionKey : normaliseInstitution;
  const selected = asNameList(value, keyOf);
  const none = selected.length === 0;
  const known = new Set(options.map((name) => keyOf(name)));
  const extras = selected.filter((name) => !known.has(keyOf(name)));
  const rows = [...extras, ...options];

  const toggleName = (name) => {
    const key = keyOf(name);
    const exists = selected.some((item) => keyOf(item) === key);
    const next = exists ? selected.filter((item) => keyOf(item) !== key) : [...selected, name];
    onChange(next);
  };

  return (
    <Box>
      {label ? (
        <Typography component="span" sx={{ display: "block", mb: 0.75, color: "text.secondary", fontSize: 15 }}>
          {label}
        </Typography>
      ) : null}
      <Box
        role="group"
        aria-label={label || noneLabel}
        sx={{
          maxHeight: 240,
          overflowY: "auto",
          border: `1px solid ${brand.line}`,
          borderRadius: `${brand.radius}px`,
          px: 1.25,
          py: 0.5,
          bgcolor: "background.paper",
        }}
      >
        <FormControlLabel
          sx={{ display: "flex", mx: 0, "& .MuiFormControlLabel-label": { fontWeight: 600, color: brand.navy } }}
          control={<Checkbox checked={none} onChange={() => onChange([])} sx={checkboxSx} />}
          label={noneLabel}
        />
        {rows.map((name) => {
          const checked = selected.some((item) => keyOf(item) === keyOf(name));
          return (
            <FormControlLabel
              key={name}
              sx={{ display: "flex", mx: 0, "& .MuiFormControlLabel-label": { fontWeight: 600, color: brand.navy } }}
              control={<Checkbox checked={checked} onChange={() => toggleName(name)} sx={checkboxSx} />}
              label={name}
            />
          );
        })}
      </Box>
      {rows.length === 0 ? (
        <FormHelperText>הרשימה תתעדכן כשנוסיף מוסדות.</FormHelperText>
      ) : null}
    </Box>
  );
}
