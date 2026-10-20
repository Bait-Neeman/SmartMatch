import { Controller, useWatch } from "react-hook-form";
import {
  Autocomplete,
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { pendingCopy } from "../../copy/pendingCopy.js";
import {
  appearanceOptions,
  ethnicityOptions,
  genderOptions,
  labelOf,
  maritalStatusOptions,
  styleOptions,
} from "../../constants/profileOptions.js";
import {
  ABOUT_ME_HELP,
  ABOUT_ME_TITLE,
  PHONE_HINT,
  PHONE_INVALID,
  PHONE_LABEL,
  normalizeIsraeliMobile,
  phoneRules,
} from "../../utils/genderForms.js";

const listSx = {
  listStyle: "none",
  m: 0,
  p: 0,
  display: "grid",
  rowGap: 1.5,
};

const fieldRowSx = {
  display: "grid",
  gridTemplateColumns: { xs: "18px minmax(0, 1fr)", sm: "18px 160px minmax(0, 360px)" },
  columnGap: 1.25,
  rowGap: 0.5,
  alignItems: "center",
};

const lineFieldSx = {
  "& .MuiInputBase-root": {
    fontWeight: 600,
    color: brand.navy,
    fontSize: "15.5px",
  },
  "& .MuiInput-underline:before": { borderBottomColor: brand.fieldLine },
  "& .MuiInput-underline:hover:not(.Mui-disabled, .Mui-error):before": { borderBottomColor: brand.gold },
  "& .MuiInput-underline:after": { borderBottomColor: brand.gold },
  "& .MuiInputBase-input, & .MuiSelect-select": {
    padding: "6px 2px",
    scrollMarginTop: `${brand.topBarHeight + 16}px`,
  },
};

const ICONS = {
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  ruler: (
    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0zM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
  ),
  star: <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />,
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  spark: (
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
  ),
  phone: (
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.5-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
  ),
  school: <path d="M22 10 12 5 2 10l10 5zM6 12v5c3 3 9 3 12 0v-5" />,
  work: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
};

function StrokeIcon({ name }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      sx={{ width: 16, height: 16, display: "block" }}
    >
      {ICONS[name]}
    </Box>
  );
}

function FieldRow({ icon, label, required = false, children }) {
  return (
    <Box component="li" sx={fieldRowSx}>
      <Box sx={{ color: brand.gold, opacity: 0.75, display: "flex" }}>
        <StrokeIcon name={icon} />
      </Box>
      <Typography component="span" sx={{ color: "text.secondary", fontSize: "15.5px" }}>
        {label}
        {required ? (
          <Box component="span" sx={{ color: "error.main" }}>
            {" "}
            *
          </Box>
        ) : null}
      </Typography>
      <Box sx={{ gridColumn: { xs: "1 / -1", sm: "auto" }, minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

function LineText({ field, label, error, dir, ...rest }) {
  return (
    <TextField
      {...field}
      {...rest}
      variant="standard"
      fullWidth
      hiddenLabel
      error={Boolean(error)}
      helperText={error?.message || ""}
      slotProps={{ htmlInput: { "aria-label": label, dir } }}
      sx={lineFieldSx}
    />
  );
}

function SelectField({ field, label, options, error, required = false }) {
  return (
    <FormControl fullWidth required={required} error={Boolean(error)} variant="standard" sx={lineFieldSx}>
      <Select {...field} displayEmpty slotProps={{ input: { "aria-label": label } }}>
        {required ? (
          <MenuItem value="" disabled>
            בחירה
          </MenuItem>
        ) : (
          <MenuItem value="">לא נבחר</MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {error ? <FormHelperText>{error.message}</FormHelperText> : null}
    </FormControl>
  );
}

const digits = { pattern: { value: /^[0-9]*$/, message: "הזן מספר תקין" } };

function TextRow({ control, name, icon, label, rules, type, dir, hint }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldRow icon={icon} label={label} required={Boolean(rules?.required)}>
          <LineText field={field} label={label} type={type} dir={dir} error={fieldState.error} />
          {hint ? (
            <Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.4, mt: 0.5 }}>{hint}</Typography>
          ) : null}
        </FieldRow>
      )}
    />
  );
}

function CityRow({ control, cities = [] }) {
  return (
    <Controller
      name="city"
      control={control}
      render={({ field, fieldState }) => (
        <FieldRow icon="pin" label="עיר">
          <Autocomplete
            freeSolo
            options={cities}
            value={field.value || null}
            inputValue={field.value || ""}
            onChange={(_event, next) => field.onChange(typeof next === "string" ? next : "")}
            onInputChange={(_event, next, reason) => {
              if (reason === "reset") return;
              field.onChange(next ?? "");
            }}
            sx={lineFieldSx}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="standard"
                hiddenLabel
                fullWidth
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message || ""}
                slotProps={{
                  ...params.slotProps,
                  htmlInput: {
                    ...params.slotProps?.htmlInput,
                    "aria-label": "עיר",
                  },
                }}
              />
            )}
          />
        </FieldRow>
      )}
    />
  );
}

function SelectRow({ control, name, icon, label, options, rules }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <FieldRow icon={icon} label={label} required={Boolean(rules?.required)}>
          <SelectField
            field={field}
            label={label}
            options={options}
            error={fieldState.error}
            required={Boolean(rules?.required)}
          />
        </FieldRow>
      )}
    />
  );
}

function FormSection({ title, children }) {
  return (
    <Box
      component="section"
      sx={{
        mt: 2,
        "&:first-of-type": { mt: 0 },
        p: { xs: 1.5, sm: 2 },
        borderRadius: "14px",
        border: `1px solid ${brand.line}`,
        bgcolor: brand.paperSoft,
      }}
    >
      <Typography component="h3" sx={{ m: 0, mb: 1.5, fontWeight: 600, color: brand.navy, fontSize: "1.0625rem" }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

const optionalPhoneRules = {
  validate: (value) => {
    if (typeof value !== "string" || value.trim() === "") return true;
    return normalizeIsraeliMobile(value) ? true : PHONE_INVALID;
  },
};

export default function GenderProfileFields({ control, cities = [], phoneOptional = false }) {
  const gender = useWatch({ control, name: "gender" });
  const working = useWatch({ control, name: "working" });
  const male = gender === "male";
  const female = gender === "female";

  return (
    <>
      <FormSection title={pendingCopy.sectionDetails}>
      <Box component="ul" sx={listSx}>
        <TextRow
          control={control}
          name="fullName"
          icon="user"
          label={pendingCopy.fullNameLabel}
          rules={{ required: "יש להזין שם מלא" }}
        />
        <FieldRow icon="user" label="מגדר">
          <Typography sx={{ fontWeight: 600, color: brand.navy, py: 0.75 }}>
            {labelOf(genderOptions, gender)}
          </Typography>
        </FieldRow>
        {gender ? (
          <>
            <SelectRow control={control} name="ethnicity" icon="star" label="עדה" options={ethnicityOptions} />
            <TextRow
              control={control}
              name="age"
              icon="user"
              label="גיל"
              type="number"
              rules={{
                required: "גיל הוא שדה חובה",
                pattern: { value: /^[0-9]+$/, message: "הזן גיל תקין" },
              }}
            />
            <SelectRow control={control} name="maritalStatus" icon="user" label="סטטוס" options={maritalStatusOptions} />
          </>
        ) : (
          <Box component="li" sx={{ color: "text.secondary", fontSize: 14 }}>
            בחרו מגדר כדי להציג את שדות הפרופיל.
          </Box>
        )}
      </Box>
      </FormSection>
      {gender ? (
        <FormSection title={pendingCopy.sectionStudyWork}>
          <Box component="ul" sx={listSx}>
            {male ? <TextRow control={control} name="yeshiva" icon="school" label="ישיבה" /> : null}
            {female ? <TextRow control={control} name="seminar" icon="school" label="סמינר" /> : null}
            {female ? <TextRow control={control} name="occupation" icon="work" label="מקצוע" /> : null}
            {female ? (
              <Controller
                name="working"
                control={control}
                render={({ field }) => (
                  <FieldRow icon="work" label="עבודה">
                    <FormControlLabel
                      sx={{ mx: 0, "& .MuiFormControlLabel-label": { fontWeight: 600, color: brand.navy } }}
                      control={
                        <Checkbox
                          checked={Boolean(field.value)}
                          onChange={(event) => field.onChange(event.target.checked)}
                          sx={{ color: brand.gold, "&.Mui-checked": { color: brand.goldDeep } }}
                        />
                      }
                      label="עובדת"
                    />
                  </FieldRow>
                )}
              />
            ) : null}
            {female && working ? <TextRow control={control} name="workplace" icon="work" label="מקום עבודה" /> : null}
            {female && working ? (
              <Controller
                name="workingInProfession"
                control={control}
                render={({ field }) => (
                  <FieldRow icon="work" label="מקצוע נלמד">
                    <FormControlLabel
                      sx={{ mx: 0, "& .MuiFormControlLabel-label": { fontWeight: 600, color: brand.navy } }}
                      control={
                        <Checkbox
                          checked={Boolean(field.value)}
                          onChange={(event) => field.onChange(event.target.checked)}
                          sx={{ color: brand.gold, "&.Mui-checked": { color: brand.goldDeep } }}
                        />
                      }
                      label="עובדת במקצוע שלמדתי"
                    />
                  </FieldRow>
                )}
              />
            ) : null}
          </Box>
        </FormSection>
      ) : null}
      {gender ? (
        <FormSection title={pendingCopy.sectionContact}>
          <Box component="ul" sx={listSx}>
            <CityRow control={control} cities={cities} />
            <TextRow
              control={control}
              name="phone"
              icon="phone"
              label={PHONE_LABEL}
              type="tel"
              dir="ltr"
              rules={phoneOptional ? optionalPhoneRules : phoneRules}
              hint={phoneOptional ? pendingCopy.phoneOptionalHint : PHONE_HINT}
            />
          </Box>
        </FormSection>
      ) : null}
      {gender ? (
        <FormSection title={pendingCopy.sectionAppearance}>
          <Box component="ul" sx={listSx}>
            <TextRow
              control={control}
              name="height"
              icon="ruler"
              label='גובה (בס"מ)'
              type="number"
              rules={digits}
            />
            <SelectRow control={control} name="style" icon="sliders" label="סגנון" options={styleOptions} />
            <SelectRow control={control} name="appearance" icon="spark" label="מראה חיצוני" options={appearanceOptions} />
            {male ? (
              <TextRow
                control={control}
                name="financialDemand"
                icon="sliders"
                label="דרישה כספית"
                type="number"
                rules={digits}
              />
            ) : null}
            <TextRow
              control={control}
              name="financialParticipation"
              icon="sliders"
              label="השתתפות כספית"
              type="number"
              rules={digits}
            />
            {female ? (
              <TextRow
                control={control}
                name="financialDemand"
                icon="sliders"
                label="דרישה כספית"
                type="number"
                rules={digits}
              />
            ) : null}
          </Box>
        </FormSection>
      ) : null}

      {gender ? (
        <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
          <Typography
            component="h3"
            sx={{ fontWeight: 600, fontSize: "1.0625rem", color: brand.navy, letterSpacing: "-0.3px", mt: 2.75, mb: 0.75 }}
          >
            {ABOUT_ME_TITLE}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.5, mb: 1 }}>{ABOUT_ME_HELP}</Typography>
          <Controller
            name="description"
            control={control}
            rules={{ maxLength: { value: 1000, message: "הטקסט יכול להכיל עד 1000 תווים" } }}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                hiddenLabel
                multiline
                minRows={4}
                fullWidth
                placeholder={ABOUT_ME_TITLE}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message || ""}
                slotProps={{ htmlInput: { "aria-label": ABOUT_ME_TITLE } }}
                sx={{ "& .MuiInputBase-root": { lineHeight: 1.75 } }}
              />
            )}
          />
        </Box>
      ) : null}
    </>
  );
}
