import { useEffect, useState } from "react";
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

const getServerBaseUrl = () => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
  return base.replace(/\/api\/?$/, "");
};

const normalizeFileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  const baseUrl = getServerBaseUrl();

  if (path.startsWith("/")) {
    return `${baseUrl}${path}`;
  }

  if (path.startsWith("uploads/")) {
    return `${baseUrl}/${path}`;
  }

  return `${baseUrl}/uploads/${path}`;
};

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
          color: "#1f3f95",
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
            bgcolor: "#f8fbff",
            border: "1px solid rgba(31,63,149,0.12)",
            borderRadius: 2,
          }}
          elevation={2}
        >
          <Typography sx={{ color: "#666" }}>אין משתמשים להצגה</Typography>
        </Paper>
      ) : (
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          {users.map((userItem) => (
            <Paper
              key={userItem._id || userItem.id}
              sx={{
                p: 3,
                bgcolor: "#ffffff",
                border: "1px solid rgba(31,63,149,0.12)",
                borderRadius: 2,
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 6px 20px rgba(31,63,149,0.15)",
                  transform: "translateY(-2px)",
                  borderColor: "rgba(31,63,149,0.25)",
                },
              }}
              elevation={0}
            >
              <Stack spacing={2} alignItems="center" sx={{ textAlign: "center" }}>
                <Button
                  variant="text"
                  onClick={() => handleOpenProfile(userItem._id || userItem.id)}
                  sx={{
                    justifyContent: "center",
                    width: "fit-content",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#1f3f95",
                    textTransform: "none",
                    padding: 0,
                    "&:hover": {
                      color: "#1f4aac",
                      textDecoration: "underline",
                    },
                  }}
                >
                  {userItem.name || "משתמש"}
                </Button>

                <Stack spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography sx={{ color: "#666", fontSize: "0.95rem" }}>
                    <span style={{ fontWeight: 600, color: "#1f3f95" }}>מספר מזהה:</span> {userItem.idNumber || "לא צוין"}
                  </Typography>
                  <Typography sx={{ color: "#666", fontSize: "0.95rem" }}>
                    <span style={{ fontWeight: 600, color: "#1f3f95" }}>תפקיד:</span> {userItem.role || "לא צוין"}
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
            bgcolor: "#f8fbff",
          },
        }}
      >
        <DialogTitle
          sx={{
            textAlign: "center",
            bgcolor: "#1f4aac",
            color: "#f8d25d",
            fontWeight: 700,
            fontSize: "1.3rem",
            borderRadius: "12px 12px 0 0",
          }}
        >
          פרופיל משתמש
        </DialogTitle>

        <DialogContent dividers sx={{ bgcolor: "#ffffff", py: 3 }}>
          <Stack spacing={2.5}>
            <Box sx={{ borderBottom: "2px solid rgba(31,63,149,0.1)", pb: 2 }}>
              <Typography
                variant="h6"
                sx={{
                  color: "#1f3f95",
                  fontWeight: 700,
                  fontSize: "1.2rem",
                }}
              >
                {user?.name || "משתמש"}
              </Typography>
              <Typography sx={{ color: "#666", fontSize: "0.9rem", mt: 0.5 }}>
                <span style={{ fontWeight: 600, color: "#1f3f95" }}>מספר מזהה:</span> {user?.idNumber || "לא צוין"}
              </Typography>
              <Typography sx={{ color: "#666", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600, color: "#1f3f95" }}>תפקיד:</span> {user?.role || "לא צוין"}
              </Typography>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, color: "#1f3f95", mb: 1.5, fontSize: "1rem" }}>
                פרטי פרופיל
              </Typography>
              <Stack spacing={1}>
                <Typography sx={{ color: "#666" }}>
                  <span style={{ fontWeight: 600, color: "#1f3f95" }}>גיל:</span> {profile?.age || "לא צוין"}
                </Typography>
                <Typography sx={{ color: "#666" }}>
                  <span style={{ fontWeight: 600, color: "#1f3f95" }}>עיר:</span> {profile?.city || "לא צוין"}
                </Typography>
                <Typography sx={{ color: "#666" }}>
                  <span style={{ fontWeight: 600, color: "#1f3f95" }}>גובה:</span> {profile?.height || "לא צוין"}
                </Typography>
                <Typography sx={{ color: "#666" }}>
                  <span style={{ fontWeight: 600, color: "#1f3f95" }}>סגנון:</span> {profile?.style || "לא צוין"}
                </Typography>
                <Typography sx={{ color: "#666" }}>
                  <span style={{ fontWeight: 600, color: "#1f3f95" }}>מראה:</span> {profile?.appearance || "לא צוין"}
                </Typography>
                <Typography sx={{ color: "#666" }}>
                  <span style={{ fontWeight: 600, color: "#1f3f95" }}>תיאור:</span> {profile?.description || "לא צוין"}
                </Typography>
              </Stack>
            </Box>

            {(profile?.image || profile?.resumePdf) && (
              <Box sx={{ borderTop: "2px solid rgba(31,63,149,0.1)", pt: 2 }}>
                <Stack spacing={1.5}>
                  {profile?.image && (
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                      <Box
                        component="img"
                        src={normalizeFileUrl(profile.image)}
                        alt="תמונת פרופיל"
                        sx={{
                          width: "100%",
                          maxWidth: 320,
                          borderRadius: 2,
                          border: "1px solid rgba(31,63,149,0.12)",
                          objectFit: "cover",
                        }}
                      />
                      <Button
                        variant="outlined"
                        href={normalizeFileUrl(profile.image)}
                        target="_blank"
                        rel="noreferrer"
                        sx={{
                          borderColor: "#1f4aac",
                          color: "#1f4aac",
                          fontWeight: 600,
                          textTransform: "none",
                          "&:hover": {
                            bgcolor: "rgba(31,63,149,0.05)",
                            borderColor: "#1f3f95",
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
                      href={normalizeFileUrl(profile.resumePdf)}
                      target="_blank"
                      rel="noreferrer"
                      sx={{
                        borderColor: "#1f4aac",
                        color: "#1f4aac",
                        fontWeight: 600,
                        textTransform: "none",
                        "&:hover": {
                          bgcolor: "rgba(31,63,149,0.05)",
                          borderColor: "#1f3f95",
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

        <DialogActions sx={{ bgcolor: "#f8fbff", p: 2, borderRadius: "0 0 12px 12px" }}>
          <Button
            onClick={() => setOpen(false)}
            sx={{
              color: "#1f4aac",
              fontWeight: 600,
              textTransform: "none",
              fontSize: "1rem",
              "&:hover": {
                bgcolor: "rgba(31,63,149,0.1)",
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