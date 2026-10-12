import { useCallback, useEffect, useState } from "react";
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
  getAdminUserProfile,
  getPendingMatches,
  removePendingMatch,
} from "../services/admin.service.js";

const getServerBaseUrl = () => {
  const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
  return base.replace(/\/api\/?$/, "");
};

const fileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `${getServerBaseUrl()}${path}`;
  return `${getServerBaseUrl()}/uploads/${path}`;
};

const appearanceLabels = {
  slim: "רזה",
  average: "ממוצע",
  full: "מלא",
  chubby: "רחב",
};

const AdminPendingMatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const data = await getPendingMatches();
      setMatches(data?.matches || data?.data || []);
    } catch (err) {
      setMessage(err.message || "לא הצלחנו לטעון הצעות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleOpenProfile = async (userId) => {
    try {
      setProfileLoading(true);
      setMessage("");

      const data = await getAdminUserProfile(userId);
      setSelectedProfile(data);
      setOpen(true);
    } catch (err) {
      setMessage(err.message || "לא הצלחנו לטעון פרופיל");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRemove = async (match) => {
    try {
      const senderId = match?.sender?._id || match?.sender?.id;
      const receiverId = match?.receiver?._id || match?.receiver?.id;

      await removePendingMatch({ senderId, receiverId });

      setMessage("ההצעה הוסרה מהרשימה");
      await loadMatches();
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

            <Typography sx={{ mt: 2 }}>מקום לימודים: {profile?.studyPlace || "לא צוין"}</Typography>
            <Typography>מקצוע: {profile?.occupation || "לא צוין"}</Typography>
            <Typography>גיל: {profile?.age || "לא צוין"}</Typography>
            <Typography>עיר: {profile?.city || "לא צוין"}</Typography>
            <Typography>גובה: {profile?.height || "לא צוין"}</Typography>
            <Typography>סגנון: {profile?.style || "לא צוין"}</Typography>
            <Typography>
              מראה חיצוני: {appearanceLabels[profile?.appearance] || profile?.appearance || "לא צוין"}
            </Typography>
            <Typography>
              יכולות כספיות: {profile?.financialCapabilities ?? "לא צוין"}
            </Typography>
            <Typography>תיאור: {profile?.description || "לא צוין"}</Typography>

            {profile?.image && (
              <Button
                variant="outlined"
                href={fileUrl(profile.image)}
                target="_blank"
                rel="noreferrer"
              >
                צפייה בתמונה
              </Button>
            )}

            {profile?.resumePdf && (
              <Button
                variant="outlined"
                href={fileUrl(profile.resumePdf)}
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
