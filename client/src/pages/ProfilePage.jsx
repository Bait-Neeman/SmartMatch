import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { createProfile } from "../services/profile.service.js";
import { getImageFileError, getPdfFileError, IMAGE_ACCEPT } from "../utils/files.js";
import {
  appearanceOptions,
  ethnicityOptions,
  genderOptions,
  styleOptions,
} from "../constants/profileOptions.js";
import { brand } from "../theme/tokens.js";
import { getSession } from "../utils/session.js";
import PersonAvatar from "../components/common/PersonAvatar.jsx";

const PHOTO_NOTE = "התמונה מוצגת לאחרים רק לאחר אישור התעניינות הדדי";

const pageTitleSx = {
  m: 0,
  fontWeight: 600,
  letterSpacing: "-0.3px",
  color: brand.navy,
  fontSize: "clamp(22px, 1.9vw, 28px)",
  lineHeight: 1.2,
};

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
  "& .MuiInput-underline:before": {
    borderBottomColor: brand.fieldLine,
  },
  "& .MuiInput-underline:hover:not(.Mui-disabled, .Mui-error):before": {
    borderBottomColor: brand.gold,
  },
  "& .MuiInput-underline:after": {
    borderBottomColor: brand.gold,
  },
  "& .MuiInputBase-input, & .MuiSelect-select": {
    padding: "6px 2px",
    scrollMarginTop: `${brand.topBarHeight + 16}px`,
  },
};

const blockTitleSx = {
  fontWeight: 600,
  fontSize: "1.0625rem",
  color: brand.navy,
  letterSpacing: "-0.3px",
  lineHeight: 1.3,
  mt: 2.75,
  mb: 1,
};

const photoFrameSx = {
  height: { xs: 280, lg: 360 },
  borderRadius: `${brand.radiusPhoto}px`,
  overflow: "hidden",
  boxShadow: brand.shadow,
  bgcolor: brand.avatar,
};

const photoImgSx = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const actionsSx = {
  display: "flex",
  gap: 1.5,
  flexWrap: "wrap",
  mt: 3.5,
  pt: 3,
  borderTop: `1px solid ${brand.line}`,
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
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 3v12M7 11l5 5 5-5M5 21h14" />,
  refresh: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  file: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
};

function StrokeIcon({ name, size = 16 }) {
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
      sx={{ width: size, height: size, display: "block" }}
    >
      {ICONS[name]}
    </Box>
  );
}

function FieldRow({ icon, label, required = false, children }) {
  return (
    <Box component="li" sx={fieldRowSx}>
      <Box sx={{ color: "primary.main", opacity: 0.75, display: "flex" }}>
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

function LineText({ field, label, error, ...rest }) {
  return (
    <TextField
      {...field}
      {...rest}
      variant="standard"
      fullWidth
      hiddenLabel
      error={Boolean(error)}
      helperText={error?.message || ""}
      slotProps={{ htmlInput: { "aria-label": label } }}
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
      {error && <FormHelperText>{error.message}</FormHelperText>}
    </FormControl>
  );
}

function ResumeThumb() {
  const line = { height: 3, borderRadius: "2px", bgcolor: brand.fieldLine };
  return (
    <Box
      aria-hidden
      sx={{
        width: 74,
        height: 96,
        flex: "none",
        borderRadius: "6px",
        bgcolor: "background.paper",
        border: `1px solid ${brand.line}`,
        boxShadow: brand.shadow,
        px: "9px",
        py: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <Box sx={{ height: 6, width: "60%", borderRadius: "2px", bgcolor: brand.navy, mb: "3px" }} />
      <Box sx={line} />
      <Box sx={{ ...line, width: "80%" }} />
      <Box sx={{ ...line, width: "40%", bgcolor: brand.goldMid, mt: "3px" }} />
      <Box sx={line} />
      <Box
        sx={{
          mt: "auto",
          alignSelf: "flex-end",
          fontSize: 8,
          fontWeight: 700,
          lineHeight: 1.4,
          color: "background.paper",
          bgcolor: "error.main",
          borderRadius: "3px",
          px: "4px",
        }}
      >
        PDF
      </Box>
    </Box>
  );
}

function DropZone({ icon, title, detail, accept, onChange }) {
  return (
    <Box
      component="label"
      sx={{
        display: "flex",
        gap: 2,
        alignItems: "center",
        p: "18px",
        border: "1.5px dashed",
        borderColor: brand.goldDash,
        borderRadius: `${brand.radiusResume}px`,
        bgcolor: brand.rowHover,
        cursor: "pointer",
        maxWidth: 560,
      }}
    >
      <input hidden type="file" accept={accept} onChange={onChange} />
      <Box sx={{ color: "primary.dark", display: "flex" }}>
        <StrokeIcon name={icon} size={34} />
      </Box>
      <Box>
        <Typography sx={{ display: "block", color: brand.navy, fontWeight: 600 }}>{title}</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{detail}</Typography>
      </Box>
    </Box>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user } = getSession();

  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [imageError, setImageError] = useState("");
  const [resumeError, setResumeError] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      gender: "",
      ethnicity: "",
      age: "",
      city: "",
      height: "",
      style: "",
      appearance: "",
      financialStatus: "",
      description: "",
    },
  });

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? getImageFileError(file) : "";
    setImageError(error);
    setImageFile(error ? null : file);
  };

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? getPdfFileError(file) : "";
    setResumeError(error);
    setPdfFile(error ? null : file);
  };

  // Local preview URLs for the chosen files, released when replaced or when the page closes
  const imagePreview = useMemo(() => (imageFile ? URL.createObjectURL(imageFile) : null), [imageFile]);
  const pdfPreview = useMemo(() => (pdfFile ? URL.createObjectURL(pdfFile) : null), [pdfFile]);

  useEffect(() => () => imagePreview && URL.revokeObjectURL(imagePreview), [imagePreview]);
  useEffect(() => () => pdfPreview && URL.revokeObjectURL(pdfPreview), [pdfPreview]);

  const onSubmit = async (data) => {
    setApiError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    const token = localStorage.getItem("token");
    if (!token) {
      setApiError("נדרש אימות לפני שליחת הפרופיל");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      gender: data.gender,
      age: data.age === "" ? undefined : Number(data.age),
      city: data.city,
      height: data.height === "" ? undefined : Number(data.height),
      ethnicity: data.ethnicity || undefined,
      style: data.style || undefined,
      appearance: data.appearance || undefined,
      financialStatus: data.financialStatus === "" ? undefined : Number(data.financialStatus),
      description: data.description || undefined,
    };

    const hasFiles = Boolean(imageFile || pdfFile);
    const requestData = hasFiles ? new FormData() : payload;

    if (hasFiles) {
      requestData.append("gender", data.gender || "");
      requestData.append("age", data.age ?? "");
      requestData.append("city", data.city || "");
      requestData.append("height", data.height ?? "");
      requestData.append("ethnicity", data.ethnicity || "");
      requestData.append("style", data.style || "");
      requestData.append("appearance", data.appearance || "");
      requestData.append("financialStatus", data.financialStatus ?? "");
      requestData.append("description", data.description || "");
      if (imageFile) requestData.append("image", imageFile);
      if (pdfFile) requestData.append("resumePdf", pdfFile);
    }

    try {
      await createProfile(requestData);
      setSuccessMessage("הפרופיל נוצר בהצלחה");
      setTimeout(() => navigate("/preferences"), 750);
    } catch (error) {
      const message = error?.response?.data?.message || error.message || "שגיאה בשמירת הפרופיל";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1120, mx: "auto" }}>
      <Box sx={{ mb: 2.25 }}>
        <Chip label="שלב 1 מתוך 2" color="warning" sx={{ fontWeight: 700, mb: 1.5 }} />
        <Typography component="h1" sx={pageTitleSx}>
          יצירת פרופיל
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 17, maxWidth: 640 }}>
          כמה פרטים בסיסיים, כדי שנוכל להציע לך התאמות. שדות המסומנים בכוכבית הם חובה.
        </Typography>
      </Box>

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
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(230px, 300px)" },
            gap: { xs: 2.5, lg: 5 },
          }}
        >
          <Box
            sx={{
              order: { xs: 0, lg: 2 },
              display: "flex",
              flexDirection: "column",
              gap: 1.75,
              alignSelf: "start",
              position: { lg: "sticky" },
              top: { lg: brand.topBarHeight + 16 },
            }}
          >
            <Box sx={photoFrameSx}>
              {imagePreview ? (
                <Box component="img" src={imagePreview} alt="תצוגה מקדימה של תמונת הפרופיל" sx={photoImgSx} />
              ) : (
                <PersonAvatar size="100%" sx={{ width: "100%", height: "100%", borderRadius: 0 }} />
              )}
            </Box>
            <Button component="label" variant="outlined" fullWidth disabled={isSubmitting} startIcon={<StrokeIcon name="camera" size={17} />}>
              {imageFile ? "החלפת תמונה" : "העלאת תמונה"}
              <input hidden type="file" accept={IMAGE_ACCEPT} onChange={handleImageChange} />
            </Button>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              JPG, PNG, GIF או WEBP עד 10MB
            </Typography>
            {imageFile && (
              <Typography variant="body2" sx={{ color: "text.secondary", wordBreak: "break-word" }}>
                נבחר: {imageFile.name}
              </Typography>
            )}
            {imagePreview && (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Button component="a" href={imagePreview} target="_blank" rel="noopener" size="small" variant="outlined" startIcon={<StrokeIcon name="eye" />}>
                  צפייה
                </Button>
                <Button component="a" href={imagePreview} download size="small" variant="outlined" startIcon={<StrokeIcon name="download" />}>
                  הורדה
                </Button>
              </Stack>
            )}
            {imageError && (
              <Typography color="error" variant="body2" role="alert">
                {imageError}
              </Typography>
            )}
            <Typography
              component="div"
              variant="body2"
              sx={{ display: "flex", gap: 1, alignItems: "flex-start", color: "text.secondary", lineHeight: 1.5 }}
            >
              <Box sx={{ color: "primary.dark", mt: "2px", display: "flex" }}>
                <StrokeIcon name="lock" size={15} />
              </Box>
              {PHOTO_NOTE}
            </Typography>
          </Box>

          <Box sx={{ order: 1, minWidth: 0 }}>
            {user?.name && (
              <Box sx={{ pb: 2.5, mb: 0.5, borderBottom: `1px solid ${brand.line}` }}>
                <Typography
                  component="h2"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: "-0.3px",
                    color: brand.navy,
                    fontSize: { xs: "1.625rem", md: "2.125rem" },
                    lineHeight: 1.15,
                  }}
                >
                  {user.name}
                </Typography>
              </Box>
            )}

            <Box component="ul" sx={{ ...listSx, mt: 2.5 }}>
              <Controller
                name="gender"
                control={control}
                rules={{ required: "מגדר הוא שדה חובה" }}
                render={({ field }) => (
                  <FieldRow icon="user" label="מגדר" required>
                    <SelectField field={field} label="מגדר" options={genderOptions} error={errors.gender} required />
                  </FieldRow>
                )}
              />

              <Controller
                name="ethnicity"
                control={control}
                render={({ field }) => (
                  <FieldRow icon="star" label="עדה">
                    <SelectField field={field} label="עדה" options={ethnicityOptions} />
                  </FieldRow>
                )}
              />

              <Controller
                name="age"
                control={control}
                rules={{
                  required: "גיל הוא שדה חובה",
                  pattern: { value: /^[0-9]+$/, message: "הזן גיל תקין" },
                }}
                render={({ field }) => (
                  <FieldRow icon="user" label="גיל" required>
                    <LineText field={field} label="גיל" type="number" error={errors.age} />
                  </FieldRow>
                )}
              />

              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <FieldRow icon="pin" label="עיר">
                    <LineText field={field} label="עיר" error={errors.city} />
                  </FieldRow>
                )}
              />

              <Controller
                name="height"
                control={control}
                rules={{ pattern: { value: /^[0-9]*$/, message: "הזן גובה תקין" } }}
                render={({ field }) => (
                  <FieldRow icon="ruler" label='גובה (בס"מ)'>
                    <LineText field={field} label='גובה (בס"מ)' type="number" error={errors.height} />
                  </FieldRow>
                )}
              />

              <Controller
                name="style"
                control={control}
                render={({ field }) => (
                  <FieldRow icon="sliders" label="סגנון">
                    <SelectField field={field} label="סגנון" options={styleOptions} />
                  </FieldRow>
                )}
              />

              <Controller
                name="appearance"
                control={control}
                render={({ field }) => (
                  <FieldRow icon="spark" label="מראה חיצוני">
                    <SelectField field={field} label="מראה חיצוני" options={appearanceOptions} />
                  </FieldRow>
                )}
              />

              <Controller
                name="financialStatus"
                control={control}
                rules={{ pattern: { value: /^[0-9]*$/, message: "הזן מצב כלכלי תקין" } }}
                render={({ field }) => (
                  <FieldRow icon="sliders" label="מצב כלכלי">
                    <LineText field={field} label="מצב כלכלי" type="number" error={errors.financialStatus} />
                  </FieldRow>
                )}
              />
            </Box>

            <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
              <Typography component="h3" sx={blockTitleSx}>
                קצת עליי / תכונות
              </Typography>
              <Controller
                name="description"
                control={control}
                rules={{ maxLength: { value: 500, message: "תיאור יכול להכיל עד 500 תווים" } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    hiddenLabel
                    multiline
                    minRows={4}
                    fullWidth
                    placeholder="תיאור"
                    error={Boolean(errors.description)}
                    helperText={errors.description ? errors.description.message : ""}
                    slotProps={{ htmlInput: { "aria-label": "תיאור" } }}
                    sx={{
                      "& .MuiInputBase-root": { lineHeight: 1.75 },
                      "& .MuiInputBase-input": { scrollMarginTop: `${brand.topBarHeight + 16}px` },
                    }}
                  />
                )}
              />
            </Box>

            <Box sx={{ mt: 1, pt: 0.5, borderTop: `1px solid ${brand.line}` }}>
              <Typography component="h3" sx={blockTitleSx}>
                רזומה
              </Typography>
              {pdfFile ? (
                <Box
                  sx={{
                    display: "flex",
                    gap: 2.25,
                    alignItems: "center",
                    p: 1.75,
                    border: `1px solid ${brand.line}`,
                    borderRadius: `${brand.radiusResume}px`,
                    bgcolor: "background.default",
                    maxWidth: 560,
                  }}
                >
                  <ResumeThumb />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: "15px", wordBreak: "break-word" }}>
                      {pdfFile.name}
                    </Typography>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
                      {pdfPreview && (
                        <Button component="a" href={pdfPreview} target="_blank" rel="noopener" size="small" variant="outlined" startIcon={<StrokeIcon name="eye" />}>
                          צפייה
                        </Button>
                      )}
                      {pdfPreview && (
                        <Button component="a" href={pdfPreview} download size="small" variant="outlined" startIcon={<StrokeIcon name="download" />}>
                          הורדה
                        </Button>
                      )}
                      <Button component="label" variant="outlined" color="primary" size="small" disabled={isSubmitting} startIcon={<StrokeIcon name="refresh" />}>
                        החלפה
                        <input hidden type="file" accept="application/pdf" onChange={handleResumeChange} />
                      </Button>
                    </Stack>
                  </Box>
                </Box>
              ) : (
                <DropZone
                  icon="file"
                  title="העלאת קורות חיים"
                  detail="PDF עד 10MB · אופציונלי"
                  accept="application/pdf"
                  onChange={handleResumeChange}
                />
              )}
              {resumeError && (
                <Typography color="error" variant="body2" role="alert" sx={{ mt: 1 }}>
                  {resumeError}
                </Typography>
              )}
            </Box>

            {apiError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {apiError}
              </Alert>
            )}
            {successMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {successMessage}
              </Alert>
            )}

            <Box sx={actionsSx}>
              <Button type="submit" variant="contained" disabled={isSubmitting} sx={{ flex: { sm: 1 }, minWidth: 160 }}>
                {isSubmitting ? "שולח..." : "שמור והמשך"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
