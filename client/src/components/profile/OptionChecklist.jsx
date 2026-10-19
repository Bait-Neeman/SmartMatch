import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";

const checkboxSx = {
  color: brand.gold,
  "&.Mui-checked": { color: brand.goldDeep },
};

// Tick several stored codes. An empty selection is "לא משנה" and is not a filter.
export default function OptionChecklist({ label, noneLabel = "לא משנה", options = [], value, onChange }) {
  const selected = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const none = selected.length === 0;
  const known = new Set(options.map((option) => option.value));
  const extras = selected.filter((item) => !known.has(item)).map((item) => ({ value: item, label: item }));
  const rows = [...extras, ...options];

  const toggle = (code) => {
    const next = selected.includes(code) ? selected.filter((item) => item !== code) : [...selected, code];
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
        {rows.map((option) => (
          <FormControlLabel
            key={option.value}
            sx={{ display: "flex", mx: 0, "& .MuiFormControlLabel-label": { fontWeight: 600, color: brand.navy } }}
            control={<Checkbox checked={selected.includes(option.value)} onChange={() => toggle(option.value)} sx={checkboxSx} />}
            label={option.label}
          />
        ))}
      </Box>
    </Box>
  );
}
