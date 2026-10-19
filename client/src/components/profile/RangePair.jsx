import { Controller } from "react-hook-form";
import { Box, TextField, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";

const numberRules = { pattern: { value: /^[0-9]*$/, message: "הזן מספר תקין" } };

function BoundField({ name, label, control }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={numberRules}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          label={label}
          type="number"
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message || ""}
          sx={{ width: 110, flex: "none" }}
        />
      )}
    />
  );
}

// The same from/to bar used for the age range, reused for height.
export default function RangePair({ title, minName, maxName, minLabel, maxLabel, control }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography component="h2" sx={{ m: 0, mb: 1.5, color: brand.navy, fontWeight: 600, fontSize: 15 }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, maxWidth: 420 }}>
        <BoundField name={minName} label={minLabel} control={control} />
        <Box sx={{ flex: 1, height: 4, borderRadius: 3, bgcolor: brand.navyWash }} />
        <BoundField name={maxName} label={maxLabel} control={control} />
      </Box>
    </Box>
  );
}
