import { Controller, useWatch } from "react-hook-form";
import { Alert, Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import {
  EXCLUDE_INCOMPLETE_HELP,
  EXCLUDE_INCOMPLETE_LABEL,
  EXCLUDE_INCOMPLETE_WARNING,
} from "../../utils/genderForms.js";

const checkboxSx = { color: brand.gold, "&.Mui-checked": { color: brand.goldDeep } };

const warningSx = {
  mt: 0.75,
  color: brand.navy,
  bgcolor: brand.pillGoldBg,
  border: `1px solid ${brand.pillGoldLine}`,
  "& .MuiAlert-icon": { color: brand.goldDeep },
};

export default function ExcludeIncomplete({ control }) {
  const checked = useWatch({ control, name: "excludeIncomplete" }) === true;

  return (
    <Box sx={{ display: "grid", rowGap: 0.5 }}>
      <Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.5 }}>{EXCLUDE_INCOMPLETE_HELP}</Typography>
      <Controller
        name="excludeIncomplete"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            sx={{ mx: 0, alignItems: "flex-start", "& .MuiFormControlLabel-label": { fontWeight: 600, color: brand.navy, pt: 0.75 } }}
            control={
              <Checkbox
                checked={field.value === true}
                onChange={(event) => field.onChange(event.target.checked)}
                sx={checkboxSx}
              />
            }
            label={EXCLUDE_INCOMPLETE_LABEL}
          />
        )}
      />
      {checked ? (
        <Alert severity="warning" sx={warningSx}>
          {EXCLUDE_INCOMPLETE_WARNING}
        </Alert>
      ) : null}
    </Box>
  );
}
