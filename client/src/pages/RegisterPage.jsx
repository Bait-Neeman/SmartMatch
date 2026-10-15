import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  IconButton,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Check, Visibility, VisibilityOff } from "@mui/icons-material";
import { registerUser } from "../services/auth.service.js";
import { createProfile } from "../services/profile.service.js";
import AuthLayout, { AuthFooter } from "../components/layout/AuthLayout.jsx";
import { authFieldSx, authSubmitSx } from "../components/layout/authStyles.js";
import { ethnicityOptions, genderOptions, maritalStatusOptions } from "../constants/profileOptions.js";
import { getImageFileError, getPdfFileError, IMAGE_ACCEPT } from "../utils/files.js";
import { brand } from "../theme/tokens.js";

const sectionSx = {
  m: 0,
  mt: 2.5,
  mb: 0.75,
  color: brand.navy,
  fontWeight: 600,
  fontSize: 17,
};

const labelSx = { display: "block", fontWeight: 600, fontSize: 14, color: brand.navy, mb: 0.75, mt: 1 };

export default function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [fileError, setFileError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      age: "",
      gender: "male",
      height: "",
      ethnicity: "",
      city: "",
      maritalStatus: "",
      institution: "",
      occupation: "",
      terms: true,
    },
  });

  const onFile = (kind) => (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? (kind === "image" ? getImageFileError(file) : getPdfFileError(file)) : "";
    setFileError(error);
    if (kind === "image") setImageFile(error ? null : file);
    else setPdfFile(error ? null : file);
  };

  const onSubmit = async (data) => {
    setApiError("");
    setIsSubmitting(true);

    const account = {
      email: data.email.trim(),
      password: data.password,
    };
    if (data.name.trim()) account.name = data.name.trim();

    try {
      const res = await registerUser(account);
      if (!res?.token) {
        navigate("/login");
        return;
      }
      localStorage.setItem("token", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));
      localStorage.setItem("role", res.user?.role || "user");

      const institution = data.institution.trim();
      const fields = {
        gender: data.gender,
        age: Number(data.age),
        city: data.city.trim(),
        height: data.height === "" ? "" : Number(data.height),
        ethnicity: data.ethnicity,
        maritalStatus: data.maritalStatus,
        occupation: data.occupation.trim(),
        yeshiva: data.gender === "male" ? institution : "",
        seminar: data.gender === "female" ? institution : "",
      };
      const hasFiles = Boolean(imageFile || pdfFile);
      const body = hasFiles ? new FormData() : fields;
      if (hasFiles) {
        Object.entries(fields).forEach(([key, value]) => body.append(key, value ?? ""));
        if (imageFile) body.append("image", imageFile);
        if (pdfFile) body.append("resumePdf", pdfFile);
      }

      try {
        await createProfile(body);
      } catch (profileError) {
        if (profileError?.response?.status !== 409) {
          setApiError(profileError?.response?.data?.message || "החשבון נוצר. לא הצלחנו לשמור את הפרופיל.");
          return;
        }
      }
      navigate("/profile");
    } catch (error) {
      setApiError(error?.response?.data?.message || error.message || "שגיאה בהרשמה");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout wide title="הרשמה" subtitle="כמה פרטים כדי שנוכל להתחיל להציע לך הצעות מתאימות">
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Typography component="h2" sx={sectionSx}>
          פרטי חשבון
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: "12px 16px" }}>
          <Box>
            <Typography component="label" htmlFor="register-name" sx={labelSx}>
              שם מלא
            </Typography>
            <TextField
              id="register-name"
              placeholder="שם פרטי ומשפחה"
              fullWidth
              autoComplete="name"
              {...register("name", { maxLength: { value: 100, message: "השם ארוך מדי" } })}
              error={Boolean(errors.name)}
              helperText={errors.name?.message || ""}
              sx={authFieldSx}
            />
          </Box>
          <Box>
            <Typography component="label" htmlFor="register-email" sx={labelSx}>
              אימייל
            </Typography>
            <TextField
              id="register-email"
              type="email"
              placeholder="name@example.com"
              fullWidth
              autoComplete="email"
              {...register("email", {
                required: "אימייל הוא שדה חובה",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "הזן כתובת אימייל תקינה" },
              })}
              error={Boolean(errors.email)}
              helperText={errors.email?.message || ""}
              sx={authFieldSx}
            />
          </Box>
          <Box>
            <Typography component="label" htmlFor="register-password" sx={labelSx}>
              סיסמה
            </Typography>
            <Controller
              name="password"
              control={control}
              rules={{
                required: "סיסמה היא שדה חובה",
                minLength: { value: 8, message: "הסיסמה חייבת להכיל לפחות 8 תווים" },
                maxLength: { value: 72, message: "הסיסמה ארוכה מדי" },
                pattern: { value: /[A-Za-z]/, message: "הסיסמה חייבת לכלול אות אנגלית אחת לפחות" },
              }}
              render={({ field }) => (
                <FormControl fullWidth error={Boolean(errors.password)} sx={authFieldSx}>
                  <OutlinedInput
                    {...field}
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="לפחות 8 תווים"
                    autoComplete="new-password"
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          aria-label={showPassword ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    }
                  />
                  <FormHelperText>{errors.password?.message || "לפחות 8 תווים ואות אחת באנגלית"}</FormHelperText>
                </FormControl>
              )}
            />
          </Box>
          <Box>
            <Typography component="label" htmlFor="register-age" sx={labelSx}>
              גיל
            </Typography>
            <TextField
              id="register-age"
              type="number"
              placeholder="24"
              fullWidth
              {...register("age", {
                required: "גיל הוא שדה חובה",
                min: { value: 16, message: "הגיל המינימלי הוא 16" },
                max: { value: 120, message: "הגיל שהוזן אינו תקין" },
              })}
              error={Boolean(errors.age)}
              helperText={errors.age?.message || ""}
              sx={authFieldSx}
            />
          </Box>
        </Box>

        <Typography component="span" sx={{ ...labelSx, mt: 2 }}>
          מגדר
        </Typography>
        <Controller
          name="gender"
          control={control}
          rules={{ required: "מגדר הוא שדה חובה" }}
          render={({ field }) => (
            <Box
              role="radiogroup"
              aria-label="מגדר"
              sx={{
                display: "inline-flex",
                gap: 0.5,
                p: 0.5,
                borderRadius: "12px",
                bgcolor: brand.avatar,
              }}
            >
              {genderOptions.map((option) => {
                const selected = field.value === option.value;
                return (
                  <Box
                    key={option.value}
                    component="button"
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => field.onChange(option.value)}
                    sx={{
                      border: 0,
                      font: "inherit",
                      fontWeight: 600,
                      cursor: "pointer",
                      px: 2.25,
                      py: 1,
                      borderRadius: "9px",
                      color: selected ? brand.navy : brand.toastText,
                      bgcolor: selected ? brand.paper : "transparent",
                      boxShadow: selected ? brand.shadow : "none",
                    }}
                  >
                    {option.label}
                  </Box>
                );
              })}
            </Box>
          )}
        />

        <Typography component="h2" sx={sectionSx}>
          פרטים בסיסיים
        </Typography>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", rowGap: 1.25 }}>
          <DetailField label="גובה" hint={'בסנטימטרים, למשל 170'}>
            <TextField
              placeholder="170"
              type="number"
              fullWidth
              variant="standard"
              {...register("height", {
                min: { value: 100, message: "יש להזין גובה בסנטימטרים (100-250)" },
                max: { value: 250, message: "יש להזין גובה בסנטימטרים (100-250)" },
              })}
              error={Boolean(errors.height)}
              helperText={errors.height?.message || ""}
              slotProps={{ htmlInput: { "aria-label": "גובה" } }}
            />
          </DetailField>
          <DetailField label="עדה">
            <Controller
              name="ethnicity"
              control={control}
              render={({ field }) => (
                <Select {...field} displayEmpty variant="standard" fullWidth aria-label="עדה">
                  <MenuItem value="">אשכנזי / ספרדי / תימני…</MenuItem>
                  {ethnicityOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </DetailField>
          <DetailField label="מגורים">
            <TextField
              placeholder="עיר מגורים"
              fullWidth
              variant="standard"
              {...register("city")}
              slotProps={{ htmlInput: { "aria-label": "מגורים" } }}
            />
          </DetailField>
          <DetailField label="סטטוס">
            <Controller
              name="maritalStatus"
              control={control}
              render={({ field }) => (
                <Select {...field} displayEmpty variant="standard" fullWidth aria-label="סטטוס">
                  <MenuItem value="">רווק/ה, גרוש/ה…</MenuItem>
                  {maritalStatusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              )}
            />
          </DetailField>
          <DetailField label="מוסד">
            <TextField
              placeholder="ישיבה / סמינר / מוסד"
              fullWidth
              variant="standard"
              {...register("institution")}
              slotProps={{ htmlInput: { "aria-label": "מוסד" } }}
            />
          </DetailField>
          <DetailField label="עיסוק">
            <TextField
              placeholder="עיסוק נוכחי"
              fullWidth
              variant="standard"
              {...register("occupation")}
              slotProps={{ htmlInput: { "aria-label": "עיסוק" } }}
            />
          </DetailField>
        </Box>

        <Typography component="h2" sx={sectionSx}>
          תמונה
        </Typography>
        <FileDrop
          title={imageFile ? imageFile.name : "בחירת תמונה"}
          detail="JPG, PNG, GIF או WEBP עד 10MB · התמונה מוצגת לאחרים רק לאחר אישור הדדי"
          accept={IMAGE_ACCEPT}
          onChange={onFile("image")}
        />

        <Typography component="h2" sx={sectionSx}>
          רזומה / קורות חיים
        </Typography>
        <FileDrop
          title={pdfFile ? pdfFile.name : "בחירת קובץ"}
          detail="PDF עד 10MB · אופציונלי"
          accept="application/pdf"
          onChange={onFile("pdf")}
        />
        {fileError ? (
          <Typography color="error" variant="body2" role="alert" sx={{ mt: 1 }}>
            {fileError}
          </Typography>
        ) : null}

        <Controller
          name="terms"
          control={control}
          rules={{ validate: (value) => value || "יש לאשר את תנאי השימוש" }}
          render={({ field }) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mt: 2.5 }}>
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
                icon={<Box sx={{ width: 20, height: 20, borderRadius: "6px", border: `1px solid ${brand.inputLine}` }} />}
                checkedIcon={
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "6px",
                      bgcolor: brand.navy,
                      color: brand.goldLight,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Check sx={{ fontSize: 14 }} />
                  </Box>
                }
                slotProps={{ input: { "aria-label": "אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות" } }}
              />
              <Typography sx={{ color: brand.ink2, fontSize: 14 }}>אני מאשר/ת את תנאי השימוש ומדיניות הפרטיות</Typography>
            </Box>
          )}
        />
        {errors.terms ? (
          <Typography color="error" variant="body2" role="alert">
            {errors.terms.message}
          </Typography>
        ) : null}

        {apiError ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {apiError}
          </Alert>
        ) : null}

        <Button type="submit" variant="contained" size="large" fullWidth disabled={isSubmitting} sx={{ ...authSubmitSx, mt: 2.5 }}>
          {isSubmitting ? "נרשמים..." : "יצירת חשבון"}
        </Button>
      </Box>

      <AuthFooter question="כבר רשום/ה?" label="להתחברות" to="/login" />
    </AuthLayout>
  );
}

function DetailField({ label, hint, children }) {
  return (
    <Box
      component="li"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "110px minmax(0, 1fr)" },
        gap: 1,
        alignItems: "center",
      }}
    >
      <Typography component="span" sx={{ color: "text.secondary", fontSize: 15 }}>
        {label}
        {hint ? (
          <Typography component="small" sx={{ display: "block", color: brand.mut, fontSize: 12 }}>
            {hint}
          </Typography>
        ) : null}
      </Typography>
      {children}
    </Box>
  );
}

function FileDrop({ title, detail, accept, onChange }) {
  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        p: "18px",
        mt: 1,
        border: "1.5px dashed",
        borderColor: brand.goldDash,
        borderRadius: `${brand.radiusResume}px`,
        bgcolor: brand.rowHover,
        cursor: "pointer",
      }}
    >
      <input hidden type="file" accept={accept} onChange={onChange} />
      <Box>
        <Typography sx={{ color: brand.navy, fontWeight: 600 }}>{title}</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{detail}</Typography>
      </Box>
    </Box>
  );
}
