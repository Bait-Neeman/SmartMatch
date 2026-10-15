import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import {
  CalendarMonthOutlined,
  DescriptionOutlined,
  PeopleAltOutlined,
  StickyNote2Outlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import {
  fetchAdminUserProfile,
  fetchPendingMatches,
  selectAdminPendingMatches,
  selectAdminPendingMatchesError,
  selectAdminPendingMatchesLoading,
  selectAdminProfileLoading,
  selectAdminUserProfile,
} from "../store/slices/adminSlice.js";
import { getAdminUserProfile } from "../services/admin.service.js";
import { brand } from "../theme/tokens.js";
import { toSafeFileUrl } from "../utils/files.js";
import ProtectedImage from "../components/common/ProtectedFile.jsx";
import { openProtectedFile } from "../utils/protectedFile.js";
import { appearanceOptions, labelOf, roleLabel, styleOptions } from "../constants/profileOptions.js";
import PersonAvatar from "../components/common/PersonAvatar.jsx";
import MatchRing from "../components/common/MatchRing.jsx";

const personId = (person) => {
  const id = person?._id || person?.id;
  return id ? String(id) : "";
};

const formatForwardedDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}`;
};

const ageAndCity = (profile) => {
  if (!profile) return "";
  const parts = [];
  if (profile.age) {
    if (profile.gender === "female") parts.push(`בת ${profile.age}`);
    else if (profile.gender === "male") parts.push(`בן ${profile.age}`);
    else parts.push(String(profile.age));
  }
  if (profile.city) parts.push(profile.city);
  return parts.join(" · ");
};

// Both sides forwarded. Anything else stays off this page, even if the list includes it.
const isMatchmakerCase = (match) =>
  match?.stage === "matchmaker" &&
  match?.senderApprovedToManager === true &&
  match?.receiverApprovedToManager === true;

function SidePortrait({ name, profile }) {
  const image = toSafeFileUrl(profile?.image);
  const ring = `0 0 0 3px ${brand.paper}, 0 0 0 4px ${brand.goldLight}`;

  if (image) {
    return (
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          boxShadow: ring,
        }}
      >
        <ProtectedImage
          url={image}
          alt={name}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      </Box>
    );
  }

  return <PersonAvatar size={72} sx={{ boxShadow: ring }} />;
}

function PersonSide({ person, details, onOpenProfile }) {
  const profile = details?.profile;
  const name = person?.name || details?.user?.name || "לא צוין";
  const line = ageAndCity(profile);
  const resume = toSafeFileUrl(profile?.resumePdf);
  const id = personId(person);

  return (
    <Box
      sx={{
        flex: "1 1 140px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        textAlign: "center",
        minWidth: 0,
      }}
    >
      <SidePortrait name={name} profile={profile} />
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: brand.navy, mt: "6px" }}>{name}</Typography>
      {line ? (
        <Typography component="small" sx={{ color: "text.secondary", fontSize: 14 }}>
          {line}
        </Typography>
      ) : null}
      <Box sx={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
        <Button size="small" variant="text" startIcon={<VisibilityOutlined />} onClick={() => onOpenProfile(id)} disabled={!id}>
          פרופיל
        </Button>
        {resume ? (
          <Button size="small" variant="text" startIcon={<DescriptionOutlined />} onClick={() => openProtectedFile(resume)}>
            רזומה
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}

export default function AdminMatchmakerPage() {
  const dispatch = useDispatch();
  const matches = useSelector(selectAdminPendingMatches);
  const loading = useSelector(selectAdminPendingMatchesLoading);
  const error = useSelector(selectAdminPendingMatchesError);
  const selectedProfile = useSelector(selectAdminUserProfile);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const [profiles, setProfiles] = useState({});
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    dispatch(fetchPendingMatches());
  }, [dispatch]);

  const cases = useMemo(() => matches.filter(isMatchmakerCase), [matches]);

  const profileKey = useMemo(() => {
    const ids = new Set();
    for (const match of cases) {
      const senderId = personId(match.sender);
      const receiverId = personId(match.receiver);
      if (senderId) ids.add(senderId);
      if (receiverId) ids.add(receiverId);
    }
    return [...ids].sort().join(",");
  }, [cases]);

  useEffect(() => {
    if (!profileKey) return undefined;

    let cancelled = false;
    const ids = profileKey.split(",");

    Promise.all(
      ids.map(async (id) => {
        try {
          const data = await getAdminUserProfile(id);
          return [id, data];
        } catch {
          return [id, null];
        }
      })
    ).then((entries) => {
      if (!cancelled) setProfiles(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
  }, [profileKey]);

  const handleOpenProfile = async (userId) => {
    if (!userId) return;
    try {
      await dispatch(fetchAdminUserProfile(userId)).unwrap();
      setOpen(true);
      setMessage("");
    } catch (err) {
      setMessage(err.message || "לא הצלחנו לטעון פרופיל");
    }
  };

  const profile = selectedProfile?.profile;
  const user = selectedProfile?.user;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography
          component="h1"
          sx={{
            m: 0,
            fontWeight: 600,
            letterSpacing: "-0.3px",
            color: brand.navy,
            fontSize: "clamp(22px, 1.9vw, 28px)",
            lineHeight: 1.2,
          }}
        >
          הצעות בטיפול
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 17 }}>
          הצעות ששני הצדדים העבירו לטיפולך
        </Typography>
      </Box>

      {message ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? null : (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: "22px" }}>
            <Box
              component="span"
              sx={{
                borderRadius: "10px",
                px: "18px",
                py: "9px",
                fontWeight: 600,
                fontSize: 14,
                border: "1px solid",
                borderColor: brand.gold,
                bgcolor: brand.tabOn,
                color: brand.goldText,
              }}
            >
              הכל ({cases.length})
            </Box>
          </Box>

          {cases.length === 0 ? (
            <Typography>אין הצעות ששני הצדדים העבירו לטיפולך</Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 470px), 1fr))",
                gap: "20px",
              }}
            >
              {cases.map((match) => {
                const senderId = personId(match.sender);
                const receiverId = personId(match.receiver);
                const forwarded = formatForwardedDate(match.updatedAt || match.createdAt);
                const percent = Number(match.matchPercent);
                const showPercent = Number.isFinite(percent);

                return (
                  <Card key={match._id || `${senderId}-${receiverId}`} sx={{ p: "22px" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {forwarded ? (
                        <Typography
                          component="span"
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "text.secondary",
                            fontSize: 13,
                          }}
                        >
                          <CalendarMonthOutlined sx={{ fontSize: 14 }} />
                          הועבר {forwarded}
                        </Typography>
                      ) : null}
                      {showPercent ? (
                        <Box sx={{ marginInlineStart: "auto" }}>
                          <MatchRing value={percent} size={58} caption="התאמה" />
                        </Box>
                      ) : null}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexWrap: "wrap",
                        gap: "16px",
                        my: "16px",
                        p: "18px",
                        borderRadius: "14px",
                        bgcolor: brand.background,
                      }}
                    >
                      <PersonSide
                        person={match.sender}
                        details={profiles[senderId]}
                        onOpenProfile={handleOpenProfile}
                      />
                      <Box
                        aria-hidden
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          bgcolor: brand.tabOn,
                          color: brand.goldDeep,
                          flex: "none",
                        }}
                      >
                        <PeopleAltOutlined sx={{ fontSize: 16 }} />
                      </Box>
                      <PersonSide
                        person={match.receiver}
                        details={profiles[receiverId]}
                        onOpenProfile={handleOpenProfile}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        p: "12px 14px",
                        borderRadius: "12px",
                        bgcolor: brand.pillGoldBg,
                        color: brand.goldText,
                        fontSize: 14,
                      }}
                    >
                      <StickyNote2Outlined sx={{ fontSize: 16, mt: "2px" }} />
                      <span>הועבר לטיפול – שני הצדדים אישרו.</span>
                    </Box>
                  </Card>
                );
              })}
            </Box>
          )}
        </>
      )}

      {profileLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>פרופיל משתמש</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="h6">{user?.name || "משתמש"}</Typography>
            <Typography>מספר מזהה: {user?.idNumber || "לא צוין"}</Typography>
            <Typography>תפקיד: {roleLabel(user?.role) || "לא צוין"}</Typography>
            <Typography sx={{ mt: 2 }}>גיל: {profile?.age || "לא צוין"}</Typography>
            <Typography>עיר: {profile?.city || "לא צוין"}</Typography>
            <Typography>גובה: {profile?.height || "לא צוין"}</Typography>
            <Typography>סגנון: {labelOf(styleOptions, profile?.style) || "לא צוין"}</Typography>
            <Typography>מראה: {labelOf(appearanceOptions, profile?.appearance) || "לא צוין"}</Typography>
            <Typography>תיאור: {profile?.description || "לא צוין"}</Typography>
            {profile?.image ? (
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <ProtectedImage
                  key={toSafeFileUrl(profile.image)}
                  url={toSafeFileUrl(profile.image)}
                  alt="תמונת פרופיל"
                  sx={{
                    width: "100%",
                    maxWidth: 320,
                    borderRadius: 2,
                    border: `1px solid ${brand.blueLine}`,
                    objectFit: "cover",
                  }}
                />
                <Button variant="outlined" onClick={() => openProtectedFile(toSafeFileUrl(profile.image))}>
                  צפייה בתמונה
                </Button>
              </Box>
            ) : null}
            {profile?.resumePdf ? (
              <Button variant="outlined" onClick={() => openProtectedFile(toSafeFileUrl(profile.resumePdf))}>
                צפייה בקובץ PDF
              </Button>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>סגירה</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
