import { Controller } from "react-hook-form";
import { Alert, Box, Checkbox, FormControlLabel } from "@mui/material";
import { brand } from "../../theme/tokens.js";

const checkboxSx = { color: brand.gold, "&.Mui-checked": { color: brand.goldDeep } };
const labelSx = { mx: 0, "& .MuiFormControlLabel-label": { fontWeight: 600, color: brand.navy } };

export const WORK_FILTER_WARNING = "סימון זה עלול להקטין משמעותית את מספר ההצעות";

export default function WorkFilters({ control, setValue }) {
  return (
    <Box sx={{ display: "grid", rowGap: 0.25 }}>
      <Controller
        name="onlyWorking"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            sx={labelSx}
            control={
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  field.onChange(checked);
                  if (!checked) setValue("onlyWorkingInProfession", false);
                }}
                sx={checkboxSx}
              />
            }
            label="רק בחורה עובדת"
          />
        )}
      />
      <Controller
        name="onlyWorkingInProfession"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            sx={labelSx}
            control={
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(event) => {
                  const checked = event.target.checked;
                  field.onChange(checked);
                  if (checked) setValue("onlyWorking", true);
                }}
                sx={checkboxSx}
              />
            }
            label="רק בחורה שעובדת במקצוע שלמדה"
          />
        )}
      />
      <Alert
        severity="warning"
        sx={{
          mt: 0.75,
          color: brand.navy,
          bgcolor: brand.pillGoldBg,
          border: `1px solid ${brand.pillGoldLine}`,
          "& .MuiAlert-icon": { color: brand.goldDeep },
        }}
      >
        {WORK_FILTER_WARNING}
      </Alert>
    </Box>
  );
}
