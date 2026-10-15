import { useEffect, useState } from "react";
import { brand } from "../theme/tokens.js";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  fetchAdminUsers,
  fetchAdminUserProfile,
  selectAdminUsers,
  selectAdminUsersLoading,
  selectAdminProfileLoading,
  selectAdminUsersError,
  selectAdminProfileError,
  selectAdminUserProfile,
} from "../store/slices/adminSlice.js";
import { toSafeFileUrl } from "../utils/files.js";
import { appearanceOptions, labelOf, roleLabel, styleOptions } from "../constants/profileOptions.js";

const AdminUsersPage = () => {
  const [open, setOpen] = useState(false);
  const dispatch = useDispatch();
  const users = useSelector(selectAdminUsers);
  const selectedProfile = useSelector(selectAdminUserProfile);
  const loading = useSelector(selectAdminUsersLoading);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const usersError = useSelector(selectAdminUsersError);
  const profileError = useSelector(selectAdminProfileError);

  useEffect(() => {
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  const handleOpenProfile = async (userId) => {
    try {
      await dispatch(fetchAdminUserProfile(userId)).unwrap();
      setOpen(true);
    } catch {
      setOpen(false);
    }
  };

  const profile = selectedProfile?.profile;
  const user = selectedProfile?.user;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 6, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography
        variant="h3"
        sx={{
          mb: 5,
          textAlign: "center",
          color: brand.navy,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        כל המשתמשים
      </Typography>

      {(usersError || profileError) && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {usersError || profileError}
        </Alert>
      )}

      {profileLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {users.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            bgcolor: brand.background,
            border: `1px solid ${brand.blueLine}`,
            borderRadius: 2,
          }}
          elevation={2}
        >
          <Typography sx={{ color: brand.mistDeep }}>אין משתמשים להצגה</Typography>
        </Paper>
      ) : (
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          {users.map((userItem) => (
            <Paper
              key={userItem._id || userItem.id}
              sx={{
                p: 3,
                bgcolor: brand.paper,
                border: `1px solid ${brand.blueLine}`,
                borderRadius: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: brand.blueShadow,
                  transform: "translateY(-2px)",
                  borderColor: brand.blueLineStrong,
                },
              }}
              elevation={0}
            >
              <Stack spacing={2} sx={{ alignItems: "center", textAlign: "center" }}>
                <Button
                  variant="text"
                  onClick={() => handleOpenProfile(userItem._id || userItem.id)}
                  sx={{
                    justifyContent: "center",
                    width: "fit-content",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: brand.navy,
                    textTransform: "none",
                    padding: 0,
                    "&:hover": {
                      color: brand.navy,
                      textDecoration: "underline",
                    },
                  }}
                >
                  {userItem.name || "משתמש"}
                </Button>

                <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography sx={{ color: brand.mistDeep, fontSize: "0.95rem" }}>
                    <span style={{ fontWeight: 600, color: brand.navy }}>מספר מזהה:</span> {userItem.idNumber || "לא צוין"}
                  </Typography>
                  <Typography sx={{ color: brand.mistDeep, fontSize: "0.95rem" }}>
                    <span style={{ fontWeight: 600, color: brand.navy }}>תפקיד:</span> {roleLabel(userItem.role) || "לא צוין"}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            bgcolor: brand.background,
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            bgcolor: brand.navy,
            color: brand.gold,
            fontWeight: 700,
            fontSize: "1.3rem",
            borderRadius: "12px 12px 0 0",
          }}
        >
          פרופיל משתמש
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: brand.paper, py: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ borderBottom: `2px solid ${brand.blueDivider}`, pb: 2 }}>
              <Typography
                variant="h6"
                sx={{
                  color: brand.navy,
                  fontWeight: 700,
                  fontSize: "1.2rem",
                }}
              >
                {user?.name || "משתמש"}
              </Typography>
              <Typography sx={{ color: brand.mistDeep, fontSize: "0.9rem", mt: 0.5 }}>
                <span style={{ fontWeight: 600, color: brand.navy }}>מספר מזהה:</span> {user?.idNumber || "לא צוין"}
              </Typography>
              <Typography sx={{ color: brand.mistDeep, fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600, color: brand.navy }}>תפקיד:</span> {roleLabel(user?.role) || "לא צוין"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, color: brand.navy, mb: 1.5, fontSize: "1rem" }}>
                פרטי פרופיל
              </Typography>
              <Stack spacing={1}>
                <Typography sx={{ color: brand.mistDeep }}>
                  <span style={{ fontWeight: 600, color: brand.navy }}>גיל:</span> {profile?.age || "לא צוין"}
                </Typography>
                <Typography sx={{ color: brand.mistDeep }}>
                  <span style={{ fontWeight: 600, color: brand.navy }}>עיר:</span> {profile?.city || "לא צוין"}
                </Typography>
                <Typography sx={{ color: brand.mistDeep }}>
                  <span style={{ fontWeight: 600, color: brand.navy }}>גובה:</span> {profile?.height || "לא צוין"}
                </Typography>
                <Typography sx={{ color: brand.mistDeep }}>
                  <span style={{ fontWeight: 600, color: brand.navy }}>סגנון:</span> {labelOf(styleOptions, profile?.style) || "לא צוין"}
                </Typography>
                <Typography sx={{ color: brand.mistDeep }}>
                  <span style={{ fontWeight: 600, color: brand.navy }}>מראה:</span> {labelOf(appearanceOptions, profile?.appearance) || "לא צוין"}
                </Typography>
                <Typography sx={{ color: brand.mistDeep }}>
                  <span style={{ fontWeight: 600, color: brand.navy }}>תיאור:</span> {profile?.description || "לא צוין"}
                </Typography>
              </Stack>
            </Box>

            {(profile?.image || profile?.resumePdf) && (
              <Box sx={{ borderTop: `2px solid ${brand.blueDivider}`, pt: 2 }}>
                <Stack spacing={1.5}>
                  {profile?.image && (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <Box
                        component="img"
                        src={toSafeFileUrl(profile.image)}
                        alt="תמונת פרופיל"
                        sx={{
                          width: "100%",
                          maxWidth: 320,
                          borderRadius: 2,
                          border: `1px solid ${brand.blueLine}`,
                          objectFit: "cover",
                        }}
                      />
                      <Button
                        variant="outlined"
                        href={toSafeFileUrl(profile.image)}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          borderColor: brand.navy,
                          color: brand.navy,
                          fontWeight: 600,
                          textTransform: "none",
                          "&:hover": {
                            bgcolor: brand.blueWash,
                            borderColor: brand.navy,
                          },
                        }}
                      >
                        צפייה בתמונה
                      </Button>
                    </Box>
                  )}

                  {profile?.resumePdf && (
                    <Button
                      variant="outlined"
                      href={toSafeFileUrl(profile.resumePdf)}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        borderColor: brand.navy,
                        color: brand.navy,
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": {
                          bgcolor: brand.blueWash,
                          borderColor: brand.navy,
                        },
                      }}
                    >
                      צפייה בקובץ PDF
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ bgcolor: brand.background, p: 2, borderRadius: "0 0 12px 12px" }}>
          <Button
            onClick={() => setOpen(false)}
            sx={{
              color: brand.navy,
              fontWeight: 600,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": {
                bgcolor: brand.blueDivider,
              },
            }}
          >
            סגירה
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersPage;