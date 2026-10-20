import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { createProfile, getMyProfile, updateProfile } from "../services/profile.service.js";
import { getPdfFileError, IMAGE_ACCEPT, isAppFileUrl, toSafeFileUrl } from "../utils/files.js";
import { brand } from "../theme/tokens.js";
import { buildProfileFields } from "../utils/genderForms.js";
import GenderProfileFields from "../components/profile/GenderProfileFields.jsx";
import useInstitutionLists from "../hooks/useInstitutionLists.js";
import { getSession, rememberUser, setOnboardingPath } from "../utils/session.js";
import OnboardingSteps from "../components/common/OnboardingSteps.jsx";
import { FormSkeleton } from "../components/common/PageSkeleton.jsx";
import PersonAvatar from "../components/common/PersonAvatar.jsx";
import CroppedPhoto from "../components/common/CroppedPhoto.jsx";
import PhotoCropDialog from "../components/profile/PhotoCropDialog.jsx";
import useProfilePhoto from "../hooks/useProfilePhoto.js";
import { pendingCopy } from "../copy/pendingCopy.js";
import { notifyPortraitChanged } from "../utils/photoCrop.js";

const PHOTO_NOTE = "התמונה מוצגת לאחרים רק לאחר אישור התעניינות הדדי";

const pageTitleSx = {
  m: 0,
  fontWeight: 600,
  letterSpacing: "-0.3px",
  color: brand.navy,
  fontSize: "clamp(22px, 1.9vw, 28px)",
  lineHeight: 1.2,
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
  const { cities } = useInstitutionLists();

  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [resumeError, setResumeError] = useState("");
  const [savedPhoto, setSavedPhoto] = useState({ url: "", crop: null });
  const [profileExists, setProfileExists] = useState(false);
  const photo = useProfilePhoto({
    savedUrl: savedPhoto.url,
    savedCrop: savedPhoto.crop,
    onSaveExisting: async (crop) => {
      const updated = await updateProfile({ photoCrop: crop });
      const next = updated?.profile;
      if (next) setSavedPhoto({ url: toSafeFileUrl(next.image), crop: next.photoCrop || null });
      notifyPortraitChanged();
    },
  });
  const [loadingProfile, setLoadingProfile] = useState(true);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      fullName: getSession().user?.name || "",
      gender: getSession().user?.gender || "",
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
    },
  });
  const gender = useWatch({ control, name: "gender" });

  useEffect(() => {
    let ignore = false;
    getMyProfile()
      .then((data) => {
        const profile = data?.profile;
        if (ignore || !profile) return;
        setProfileExists(true);
        setSavedPhoto({ url: toSafeFileUrl(profile.image), crop: profile.photoCrop || null });
        reset({
          fullName: data?.profile?.name || getSession().user?.name || "",
          gender: profile.gender || getSession().user?.gender || "",
          ethnicity: profile.ethnicity || "",
          age: profile.age ?? "",
          city: profile.city || "",
          height: profile.height ?? "",
          style: profile.style || "",
          appearance: profile.appearance || "",
          maritalStatus: profile.maritalStatus || "",
          occupation: profile.occupation || "",
          yeshiva: profile.yeshiva || "",
          seminar: profile.seminar || "",
          working: Boolean(profile.working),
          workingInProfession: Boolean(profile.workingInProfession),
          workplace: profile.workplace || "",
          phone: profile.phone || "",
          financialDemand: profile.financialDemand ?? "",
          financialParticipation: profile.financialParticipation ?? "",
          description: profile.description || "",
        });
      })
      .catch((error) => {
        if (ignore || error?.response?.status === 404) return;
        setApiError(error.message || "לא הצלחנו לטעון את הפרופיל");
      })
      .finally(() => {
        if (!ignore) setLoadingProfile(false);
      });
    return () => {
      ignore = true;
    };
  }, [reset]);

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0] || null;
    const error = file ? getPdfFileError(file) : "";
    setResumeError(error);
    setPdfFile(error ? null : file);
  };

  // Local preview URLs for the chosen files, released when replaced or when the page closes
  const pdfPreview = useMemo(() => (pdfFile ? URL.createObjectURL(pdfFile) : null), [pdfFile]);

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

    const fields = buildProfileFields(data);

    const hasFiles = Boolean(photo.file || pdfFile);
    const requestData = hasFiles ? new FormData() : fields;

    if (hasFiles) {
      Object.entries(fields).forEach(([key, value]) => requestData.append(key, value ?? ""));
      photo.appendTo(requestData);
      if (pdfFile) requestData.append("resumePdf", pdfFile);
    }

    try {
      if (profileExists) await updateProfile(requestData);
      else await createProfile(requestData);
      rememberUser({ name: data.fullName.trim(), gender: data.gender });
      notifyPortraitChanged();
      setSuccessMessage(profileExists ? "הפרופיל נשמר" : "הפרופיל נוצר בהצלחה");
      const nextPath = profileExists ? "/personal-area" : "/preferences";
      setOnboardingPath(nextPath);
      setTimeout(() => navigate(nextPath), 750);
    } catch (error) {
      const message = error?.response?.data?.message || error.message || "שגיאה בשמירת הפרופיל";
      setApiError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onboarding = typeof localStorage !== "undefined" ? localStorage.getItem("onboarding") : "";

  if (loadingProfile) {
    return <FormSkeleton />;
  }

  return (
    <Box sx={{ maxWidth: 1120, mx: "auto" }}>
      {onboarding === "/profile" || onboarding === "/identity" ? <OnboardingSteps current={3} /> : null}
      <Box sx={{ mb: 2.25 }}>
        <Typography component="h1" sx={pageTitleSx}>
          הפרופיל שלי
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 17, maxWidth: 640 }}>
          הפרטים שיוצגו לצד השני. תמונה, שם ורזומה נחשפים רק לאחר אישור הדדי.
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
              {photo.shownSrc ? (
                <CroppedPhoto
                  src={isAppFileUrl(photo.shownSrc) ? "" : photo.shownSrc}
                  url={isAppFileUrl(photo.shownSrc) ? photo.shownSrc : ""}
                  crop={photo.shownCrop}
                  alt="תצוגה מקדימה של תמונת הפרופיל"
                />
              ) : (
                <PersonAvatar gender={gender} size="100%" sx={{ width: "100%", height: "100%", borderRadius: 0 }} />
              )}
            </Box>
            <Button component="label" variant="outlined" fullWidth disabled={isSubmitting || photo.busy} startIcon={<StrokeIcon name="camera" size={17} />}>
              {photo.shownSrc ? "החלפת תמונה" : "העלאת תמונה"}
              <input hidden type="file" accept={IMAGE_ACCEPT} onChange={photo.onPickFile} />
            </Button>
            {photo.shownSrc ? (
              <Button variant="outlined" fullWidth disabled={isSubmitting || photo.busy} onClick={photo.openEditor}>
                {pendingCopy.photoCropEdit}
              </Button>
            ) : null}
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              JPG, PNG, GIF או WEBP עד 10MB
            </Typography>
            {photo.file && (
              <Typography variant="body2" sx={{ color: "text.secondary", wordBreak: "break-word" }}>
                נבחר: {photo.file.name}
              </Typography>
            )}
            {photo.file && photo.shownSrc && !isAppFileUrl(photo.shownSrc) && (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                <Button component="a" href={photo.shownSrc} target="_blank" rel="noopener" size="small" variant="outlined" startIcon={<StrokeIcon name="eye" />}>
                  צפייה
                </Button>
                <Button component="a" href={photo.shownSrc} download size="small" variant="outlined" startIcon={<StrokeIcon name="download" />}>
                  הורדה
                </Button>
              </Stack>
            )}
            {photo.error && (
              <Typography color="error" variant="body2" role="alert">
                {photo.error}
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

            <Box sx={{ mt: 2.5 }}>
              <GenderProfileFields control={control} cities={cities} />
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
              <Button type="submit" variant="contained" disabled={isSubmitting || loadingProfile} sx={{ minWidth: 160 }}>
                {isSubmitting ? "שולח..." : "שמירת שינויים"}
              </Button>
              <Button variant="outlined" disabled={isSubmitting} onClick={() => navigate("/personal-area")}>
                ביטול
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <PhotoCropDialog
        open={Boolean(photo.dialog)}
        src={photo.dialog?.src || ""}
        initialCrop={photo.dialog?.initialCrop}
        saving={photo.busy}
        onCancel={photo.closeDialog}
        onSave={photo.saveDialog}
      />
    </Box>
  );
}
