import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import { brand } from "../theme/tokens.js";
import { setOnboardingPath } from "../utils/session.js";
import { createPreferences, getMyPreferences, updatePreferences } from "../services/preference.service.js";
import { getMyProfile, updateProfile } from "../services/profile.service.js";
import { appearanceOptions, ethnicityOptions, maritalStatusOptions, styleOptions } from "../constants/profileOptions.js";
import useInstitutionLists from "../hooks/useInstitutionLists.js";
import InstitutionChecklist from "../components/profile/InstitutionChecklist.jsx";
import OptionChecklist from "../components/profile/OptionChecklist.jsx";
import ExcludeIncomplete from "../components/profile/ExcludeIncomplete.jsx";
import RangePair from "../components/profile/RangePair.jsx";
import WorkFilters from "../components/profile/WorkFilters.jsx";
import {
  APPEARANCE_VALUES,
  asNameList,
  asOptionList,
  ETHNICITY_VALUES,
  institutionKey,
  MARITAL_VALUES,
  STYLE_VALUES,
  buildPreferenceFields,
  lookingForHelp,
  lookingForTitle,
  NO_CITY_PREFERENCE,
  NO_OCCUPATION_PREFERENCE,
  NO_SEMINAR_PREFERENCE,
  NO_YESHIVA_PREFERENCE,
} from "../utils/genderForms.js";

const empty = {
  ageMin: "",
  ageMax: "",
  heightMin: "",
  heightMax: "",
  city: [],
  style: [],
  preferredAppearance: [],
  preferredMaritalStatus: ["single"],
  preferredEthnicity: [],
  preferredYeshiva: [],
  preferredSeminar: [],
  preferredOccupation: [],
  onlyWorking: false,
  onlyWorkingInProfession: false,
  excludeIncomplete: false,
  lookingFor: "",
};

const pageTitleSx = {
  m: 0,
  fontWeight: 600,
  letterSpacing: "-0.3px",
  color: brand.navy,
  fontSize: "clamp(22px, 1.9vw, 28px)",
  lineHeight: 1.2,
};

export default function PreferencesPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [preferencesExist, setPreferencesExist] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [gender, setGender] = useState("");
  const { yeshivas, seminars, professions, cities, error: listError } = useInstitutionLists();

  const { control, handleSubmit, reset, setValue } = useForm({ defaultValues: empty });

  useEffect(() => {
    let ignore = false;
    Promise.allSettled([getMyPreferences(), getMyProfile()])
      .then(([preferencesResult, profileResult]) => {
        if (ignore) return;
        const next = { ...empty, preferredYeshiva: [], preferredSeminar: [], preferredOccupation: [] };
        let profile = null;
        if (profileResult.status === "fulfilled") {
          profile = profileResult.value?.profile;
          setProfileExists(Boolean(profile));
          setGender(profile?.gender === "male" || profile?.gender === "female" ? profile.gender : "");
          next.lookingFor = profile?.lookingFor || "";
        } else if (profileResult.reason?.response?.status !== 404) {
          throw profileResult.reason;
        }
        if (preferencesResult.status === "fulfilled") {
          const preferences = preferencesResult.value?.preferences;
          setPreferencesExist(Boolean(preferences));
          if (preferences) {
            next.ageMin = preferences.ageMin ?? "";
            next.ageMax = preferences.ageMax ?? "";
            next.city = asNameList(preferences.city);
            next.heightMin = preferences.heightMin ?? "";
            next.heightMax = preferences.heightMax ?? "";
            next.style = asOptionList(preferences.style, STYLE_VALUES);
            next.preferredAppearance = asOptionList(preferences.preferredAppearance, APPEARANCE_VALUES);
            next.preferredMaritalStatus = asOptionList(preferences.preferredMaritalStatus, MARITAL_VALUES);
            next.preferredEthnicity = asOptionList(preferences.preferredEthnicity, ETHNICITY_VALUES);
            next.excludeIncomplete = preferences.excludeIncomplete === true;
            next.preferredYeshiva = asNameList(preferences.preferredYeshiva, institutionKey);
            next.preferredSeminar = asNameList(preferences.preferredSeminar, institutionKey);
            next.preferredOccupation = asNameList(preferences.preferredOccupation);
            next.onlyWorkingInProfession = Boolean(preferences.onlyWorkingInProfession);
            next.onlyWorking = Boolean(preferences.onlyWorking) || next.onlyWorkingInProfession;
          }
        } else if (preferencesResult.reason?.response?.status !== 404) {
          throw preferencesResult.reason;
        }
        reset(next);
      })
      .catch((error) => {
        if (!ignore) setApiError(error?.message || "לא הצלחנו לטעון העדפות");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [reset]);

  const onSubmit = async (values) => {
    setApiError("");
    setIsSubmitting(true);
    try {
      const preferencePayload = buildPreferenceFields(values, gender);
      if (preferencesExist) await updatePreferences(preferencePayload);
      else await createPreferences(preferencePayload);
      setPreferencesExist(true);

      if (profileExists) {
        await updateProfile({ lookingFor: values.lookingFor || "" });
      }

      setOnboardingPath(null);
      navigate("/home");
    } catch (error) {
      setApiError(error?.response?.data?.message || error.message || "שגיאה בשמירת העדפות");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const male = gender === "male";
  const female = gender === "female";
  const title = lookingForTitle(gender);
  const help = lookingForHelp(gender);

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography component="h1" sx={pageTitleSx}>
        העדפות התאמה
      </Typography>
      <Typography sx={{ mt: 0.75, mb: 2.25, color: "text.secondary", fontSize: 17 }}>
        מה חשוב לך אצל הצד השני – לפי ההעדפות האלה נבחרות ההצעות שלך
      </Typography>

      {!gender ? (
        <Alert severity="info">יש ליצור פרופיל ולבחור מגדר לפני מילוי ההעדפות.</Alert>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{
            p: "clamp(16px, 1.6vw, 24px)",
            borderRadius: `${brand.radiusCard}px`,
            border: `1px solid ${brand.line}`,
            boxShadow: brand.shadow,
            bgcolor: "background.paper",
            maxWidth: 640,
          }}
        >
          <RangePair title="טווח גילאים" minName="ageMin" maxName="ageMax" minLabel="מגיל" maxLabel="עד גיל" control={control} />
          <RangePair
            title="טווח גובה"
            minName="heightMin"
            maxName="heightMax"
            minLabel='מגובה (ס"מ)'
            maxLabel='עד גובה (ס"מ)'
            control={control}
          />

          <Box sx={{ display: "grid", rowGap: 1.25 }}>
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
              name="style"
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
              name="city"
              control={control}
              render={({ field }) => (
                <InstitutionChecklist
                  label="עיר"
                  noneLabel={NO_CITY_PREFERENCE}
                  options={cities}
                  emptyHint="ערים חדשות יתווספו לרשימה אוטומטית"
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

          {listError ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {listError}
            </Alert>
          ) : null}

          <Typography component="h3" sx={{ mt: 2.5, mb: 0.75, color: brand.navy, fontWeight: 600, fontSize: 17 }}>
            {title}
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: 13, lineHeight: 1.5, mb: 1 }}>{help}</Typography>
          <Controller
            name="lookingFor"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                hiddenLabel
                multiline
                minRows={4}
                fullWidth
                placeholder={title}
                slotProps={{ htmlInput: { "aria-label": title } }}
              />
            )}
          />

          {!profileExists ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              {title} נשמר אחרי יצירת פרופיל.
            </Alert>
          ) : null}
          {apiError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {apiError}
            </Alert>
          ) : null}

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", mt: 3, pt: 3, borderTop: `1px solid ${brand.line}` }}>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? "שומר..." : "שמירת העדפות"}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
