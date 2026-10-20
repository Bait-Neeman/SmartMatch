import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from "@mui/material";
import { genderOptions } from "../constants/profileOptions.js";
import { pendingCopy } from "../copy/pendingCopy.js";
import { brand } from "../theme/tokens.js";
import { buildPreferenceFields, buildProfileFields } from "../utils/genderForms.js";
import GenderProfileFields from "../components/profile/GenderProfileFields.jsx";
import MemberPreferencesFields from "../components/profile/MemberPreferencesFields.jsx";
import AccessCodePanel from "../components/common/AccessCodePanel.jsx";
import useInstitutionLists from "../hooks/useInstitutionLists.js";
import { createAdminMember } from "../services/admin.service.js";

const empty = {
  fullName: "",
  gender: "",
  ethnicity: "",
  age: "",
  city: "",
  height: "",
  style: "",
  appearance: "",
  maritalStatus: "",
  occupation: "",
  yeshiva: "",
  seminar: "",
  working: false,
  workingInProfession: false,
  workplace: "",
  phone: "",
  financialDemand: "",
  financialParticipation: "",
  description: "",
  ageMin: "",
  ageMax: "",
  heightMin: "",
  heightMax: "",
  cityPreference: [],
  preferredStyle: [],
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

export default function AdminCreateMemberPage() {
  const { yeshivas, seminars, professions, cities, error: listError } = useInstitutionLists();
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [createdGender, setCreatedGender] = useState("");
  const { control, handleSubmit, setValue } = useForm({ defaultValues: empty });
  const gender = useWatch({ control, name: "gender" });

  const onSubmit = async (values) => {
    setApiError("");
    if (values.gender !== "male" && values.gender !== "female") {
      setApiError("מגדר הוא שדה חובה");
      return;
    }
    if (!values.fullName.trim()) {
      setApiError("יש להזין שם מלא");
      return;
    }
    setBusy(true);
    try {
      const profile = buildProfileFields(values);
      const preferences = buildPreferenceFields(
        { ...values, city: values.cityPreference, style: values.preferredStyle },
        values.gender
      );
      const result = await createAdminMember({
        name: values.fullName.trim(),
        gender: values.gender,
        profile: { ...profile, lookingFor: values.lookingFor || "" },
        preferences,
      });
      setCreatedGender(values.gender);
      setAccessCode(result?.accessCode || "");
    } catch (error) {
      setApiError(error?.message || "יש להזין שם מלא");
    } finally {
      setBusy(false);
    }
  };

  const directory = createdGender === "female" ? "/admin/girls" : "/admin/boys";

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <Box component="h1" sx={{ m: 0, fontSize: "clamp(22px, 1.9vw, 28px)", fontWeight: 600, color: brand.navy }}>
        {pendingCopy.openAccount}
      </Box>
      {accessCode ? (
        <Box sx={{ mt: 2.5, display: "grid", gap: 2 }}>
          <AccessCodePanel code={accessCode} />
          <Button component={RouterLink} to={directory} variant="outlined">
            {createdGender === "female" ? "בחורות" : "בחורים"}
          </Button>
        </Box>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{
            mt: 2.5,
            p: "clamp(16px, 1.6vw, 24px)",
            borderRadius: "16px",
            border: `1px solid ${brand.line}`,
            bgcolor: brand.paper,
            boxShadow: brand.shadow,
          }}
        >
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <FormControl>
                <FormLabel id="member-gender" sx={{ fontWeight: 600, color: "secondary.main", mb: 0.5 }}>
                  מגדר
                </FormLabel>
                <RadioGroup
                  aria-labelledby="member-gender"
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                >
                  {genderOptions.map((option) => (
                    <FormControlLabel key={option.value} value={option.value} control={<Radio />} label={option.label} />
                  ))}
                </RadioGroup>
              </FormControl>
            )}
          />
          <Box sx={{ mt: 2 }}>
            <GenderProfileFields control={control} cities={cities} phoneOptional />
          </Box>
          <MemberPreferencesFields
            control={control}
            setValue={setValue}
            gender={gender}
            yeshivas={yeshivas}
            seminars={seminars}
            professions={professions}
            cities={cities}
          />
          {listError ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {listError}
            </Alert>
          ) : null}
          {apiError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {apiError}
            </Alert>
          ) : null}
          <Button type="submit" variant="contained" disabled={busy} sx={{ mt: 2.5 }}>
            {busy ? "שומר..." : pendingCopy.openAccount}
          </Button>
        </Box>
      )}
    </Box>
  );
}
