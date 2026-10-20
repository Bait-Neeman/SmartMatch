import { Controller } from "react-hook-form";
import { Box, TextField, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { pendingCopy } from "../../copy/pendingCopy.js";
import { appearanceOptions, ethnicityOptions, maritalStatusOptions, styleOptions } from "../../constants/profileOptions.js";
import InstitutionChecklist from "./InstitutionChecklist.jsx";
import OptionChecklist from "./OptionChecklist.jsx";
import ExcludeIncomplete from "./ExcludeIncomplete.jsx";
import RangePair from "./RangePair.jsx";
import WorkFilters from "./WorkFilters.jsx";
import {
  NO_CITY_PREFERENCE,
  NO_OCCUPATION_PREFERENCE,
  NO_SEMINAR_PREFERENCE,
  NO_YESHIVA_PREFERENCE,
  lookingForHelp,
  lookingForTitle,
} from "../../utils/genderForms.js";

export default function MemberPreferencesFields({
  control,
  setValue,
  gender,
  yeshivas = [],
  seminars = [],
  professions = [],
  cities = [],
}) {
  const male = gender === "male";
  const female = gender === "female";
  if (!male && !female) return null;

  const title = lookingForTitle(gender);
  const help = lookingForHelp(gender);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography component="h2" sx={{ m: 0, mb: 1.5, color: brand.navy, fontWeight: 600, fontSize: 17 }}>
        {pendingCopy.sectionFilters}
      </Typography>
      <RangePair title="טווח גילאים" minName="ageMin" maxName="ageMax" minLabel="מגיל" maxLabel="עד גיל" control={control} />
      <RangePair
        title="טווח גובה"
        minName="heightMin"
        maxName="heightMax"
        minLabel='מגובה (ס"מ)'
        maxLabel='עד גובה (ס"מ)'
        control={control}
      />
      <Box sx={{ display: "grid", rowGap: 1.25, mt: 1 }}>
        {male ? (
          <Controller
            name="preferredSeminar"
            control={control}
            render={({ field }) => (
              <InstitutionChecklist
                label="סמינר"
                noneLabel={NO_SEMINAR_PREFERENCE}
                options={seminars}
                institutions
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        ) : null}
        {male ? (
          <Controller
            name="preferredOccupation"
            control={control}
            render={({ field }) => (
              <InstitutionChecklist
                label="מקצוע"
                noneLabel={NO_OCCUPATION_PREFERENCE}
                options={professions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        ) : null}
        {male ? <WorkFilters control={control} setValue={setValue} /> : null}
        <Controller
          name="preferredMaritalStatus"
          control={control}
          render={({ field }) => (
            <OptionChecklist label="סטטוס" options={maritalStatusOptions} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
            name="preferredStyle"
          control={control}
          render={({ field }) => (
            <OptionChecklist label="סגנון" options={styleOptions} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="preferredAppearance"
          control={control}
          render={({ field }) => (
            <OptionChecklist label="מראה חיצוני" options={appearanceOptions} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="preferredEthnicity"
          control={control}
          render={({ field }) => (
            <OptionChecklist label="עדה" options={ethnicityOptions} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="cityPreference"
          control={control}
          render={({ field }) => (
            <InstitutionChecklist
              label="עיר"
              noneLabel={NO_CITY_PREFERENCE}
              options={cities}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        {female ? (
          <Controller
            name="preferredYeshiva"
            control={control}
            render={({ field }) => (
              <InstitutionChecklist
                label="ישיבה"
                noneLabel={NO_YESHIVA_PREFERENCE}
                options={yeshivas}
                institutions
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        ) : null}
        <ExcludeIncomplete control={control} />
      </Box>
      <Typography component="h3" sx={{ mt: 2.5, mb: 0.75, color: brand.navy, fontWeight: 600, fontSize: 17 }}>
        {title}
      </Typography>
      <Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.5, mb: 1 }}>{help}</Typography>
      <Controller
        name="lookingFor"
        control={control}
        rules={{ maxLength: { value: 1000, message: "הטקסט יכול להכיל עד 1000 תווים" } }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            hiddenLabel
            multiline
            minRows={4}
            fullWidth
            placeholder={title}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message || ""}
            slotProps={{ htmlInput: { "aria-label": title } }}
          />
        )}
      />
    </Box>
  );
}
