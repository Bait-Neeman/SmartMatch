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
  getAdminUsers,
  getAdminUserProfile,
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

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getAdminUsers();
      setUsers(data?.users || data?.data || []);
    } catch (err) {
      setError(err.message || "לא הצלחנו לטעון משתמשים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenProfile = async (userId) => {
    try {
      setProfileLoading(true);
      setError("");

      const data = await getAdminUserProfile(userId);
      setSelectedProfile(data);
      setOpen(true);
    } catch (err) {
      setError(err.message || "לא הצלחנו לטעון פרופיל");
    } finally {
      setProfileLoading(false);
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
        כל המשתמשים
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {profileLoading && <CircularProgress sx={{ mb: 2 }} />}

      {users.length === 0 ? (
        <Typography>אין משתמשים להצגה</Typography>
      ) : (
        users.map((userItem) => (
          <Paper key={userItem._id || userItem.id} sx={{ p: 2, mb: 2 }}>
            <Stack spacing={1}>
              <Button
                variant="text"
                sx={{ justifyContent: "flex-start", width: "fit-content" }}
                onClick={() => handleOpenProfile(userItem._id || userItem.id)}
              >
                {userItem.name || "משתמש"}
              </Button>

              <Typography>מספר מזהה: {userItem.idNumber || "לא צוין"}</Typography>
              <Typography>תפקיד: {userItem.role || "לא צוין"}</Typography>
            </Stack>
          </Paper>
        ))
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

export default AdminUsersPage;
