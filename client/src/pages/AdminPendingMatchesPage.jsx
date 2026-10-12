import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import {
  fetchAdminUserProfile,
  fetchPendingMatches,
  removePendingMatch as removePendingMatchAction,
  selectAdminPendingMatches,
  selectAdminPendingMatchesLoading,
  selectAdminProfileLoading,
  selectAdminPendingMatchesError,
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

const AdminPendingMatchesPage = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const dispatch = useDispatch();
  const matches = useSelector(selectAdminPendingMatches);
  const selectedProfile = useSelector(selectAdminUserProfile);
  const loading = useSelector(selectAdminPendingMatchesLoading);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const error = useSelector(selectAdminPendingMatchesError);

  useEffect(() => {
    dispatch(fetchPendingMatches());
  }, [dispatch]);

  const handleOpenProfile = async (userId) => {
    try {
      await dispatch(fetchAdminUserProfile(userId)).unwrap();
      setOpen(true);
    } catch (err) {
      setMessage(err.message || "לא הצלחנו לטעון פרופיל");
    }
  };

  const handleRemove = async (match) => {
    try {
      const senderId = match?.sender?._id || match?.sender?.id;
      const receiverId = match?.receiver?._id || match?.receiver?.id;

      await dispatch(removePendingMatchAction({ senderId, receiverId })).unwrap();
      setMessage("ההצעה הוסרה מהרשימה");
    } catch (err) {
      setMessage(err.message || "לא הצלחנו להסיר את ההצעה");
    }
  };

  const profile = selectedProfile?.profile;
  const user = selectedProfile?.user;

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        הצעות שממתינות לטיפול
      </Typography>

      {message && (
        <Alert
          severity={message.includes("הוסרה") ? "success" : "error"}
          sx={{ mb: 2 }}
        >
          {message}
        </Alert>
      )}

      {profileLoading && <CircularProgress sx={{ mb: 2 }} />}

      {matches.length === 0 ? (
        <Typography>אין הצעות שממתינות לטיפול</Typography>
      ) : (
        matches.map((match) => {
          const senderId = match?.sender?._id || match?.sender?.id;
          const receiverId = match?.receiver?._id || match?.receiver?.id;

          return (
            <Paper key={match._id || `${senderId}-${receiverId}`} sx={{ p: 2, mb: 2 }}>
              <Stack spacing={1}>
                <Typography variant="h6">הצעה לטיפול</Typography>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography>שולח:</Typography>
                  <Button variant="text" onClick={() => handleOpenProfile(senderId)}>
                    {match.sender?.name || "לא צוין"}
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography>מקבל:</Typography>
                  <Button variant="text" onClick={() => handleOpenProfile(receiverId)}>
                    {match.receiver?.name || "לא צוין"}
                  </Button>
                </Stack>

                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleRemove(match)}
                >
                  הסרה מהרשימה
                </Button>
              </Stack>
            </Paper>
          );
        })
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>פרופיל משתמש</DialogTitle>

        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Typography variant="h6">{user?.name || "משתמש"}</Typography>
            <Typography>מספר מזהה: {user?.idNumber || "לא צוין"}</Typography>
            <Typography>תפקיד: {user?.role || "לא צוין"}</Typography>

            <Typography sx={{ mt: 2 }}>גיל: {profile?.age || "לא צוין"}</Typography>
            <Typography>עיר: {profile?.city || "לא צוין"}</Typography>
            <Typography>גובה: {profile?.height || "לא צוין"}</Typography>
            <Typography>סגנון: {profile?.style || "לא צוין"}</Typography>
            <Typography>מראה: {profile?.appearance || "לא צוין"}</Typography>
            <Typography>תיאור: {profile?.description || "לא צוין"}</Typography>

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
              >
                צפייה בקובץ PDF
              </Button>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>סגירה</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPendingMatchesPage;