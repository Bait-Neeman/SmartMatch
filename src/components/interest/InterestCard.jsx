import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  acceptInterest,
  rejectInterest,
  sendToManager,
} from "../../services/interest.service.js";
import { getProfileByUserId } from "../../services/profile.service.js";

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user._id || user.id || user.userId || null;
  } catch {
    return null;
  }
};

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

const getStatusLabel = (status) => {
  if (status === "pending") return "ממתין";
  if (status === "accepted") return "אושר";
  if (status === "rejected") return "נדחה";
  return "לא ידוע";
};

const getManagerStatus = (interest, currentUserId) => {
  if (interest?.status !== "accepted") return null;

  const senderId = interest?.sender?._id || interest?.sender?.id;
  const receiverId = interest?.receiver?._id || interest?.receiver?.id;

  const currentUserApproved =
    senderId === currentUserId
      ? interest.senderApprovedToManager
      : receiverId === currentUserId
        ? interest.receiverApprovedToManager
        : false;

  const bothApproved =
    Boolean(interest.senderApprovedToManager) &&
    Boolean(interest.receiverApprovedToManager);

  if (bothApproved) return "נשלח לטיפול מנהל";
  if (currentUserApproved) return "ממתין שגם הצד השני יעביר לטיפול מנהל";
  return "טרם נשלח לטיפול מנהל";
};

const ProfileDetails = ({ profile }) => {
  if (!profile) return null;

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Typography>מקום לימודים: {profile.studyPlace || "לא צוין"}</Typography>
      <Typography>מקצוע: {profile.occupation || "לא צוין"}</Typography>
      <Typography>גיל: {profile.age || "לא צוין"}</Typography>
      <Typography>גובה: {profile.height || "לא צוין"}</Typography>
      <Typography>
        מראה חיצוני: {appearanceLabels[profile.appearance] || profile.appearance || "לא צוין"}
      </Typography>
      <Typography>עיר: {profile.city || "לא צוין"}</Typography>
      <Typography>
        יכולות כספיות: {profile.financialCapabilities ?? "לא צוין"}
      </Typography>
      <Typography>תיאור: {profile.description || "לא צוין"}</Typography>

      {profile.image && (
        <Button
          variant="outlined"
          href={fileUrl(profile.image)}
          target="_blank"
          rel="noreferrer"
        >
          צפייה בתמונה
        </Button>
      )}

      {profile.resumePdf && (
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
  );
};

const InterestCard = ({ interest, type, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");

  const currentUserId = getCurrentUserId();
  const otherUser = type === "incoming" ? interest?.sender : interest?.receiver;
  const otherUserId = otherUser?._id || otherUser?.id;
  const managerStatus = getManagerStatus(interest, currentUserId);

  const loadProfile = async () => {
    if (!otherUserId || interest?.status !== "accepted") return;

    try {
      setProfileLoading(true);
      const data = await getProfileByUserId(otherUserId);
      setProfile(data?.profile || data);
    } catch (err) {
      console.error("Failed to load profile:", err);
      setMessage(err.message || "לא הצלחנו לטעון פרופיל");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId, interest?.status]);

  const handleAction = async (action, value) => {
    try {
      setLoading(true);
      setMessage("");

      await action(value);

      setMessage("הפעולה בוצעה בהצלחה");

      if (onChanged) {
        await onChanged();
      }
    } catch (err) {
      console.error("Interest action failed:", err);
      setMessage(err.message || "לא הצלחנו לבצע את הפעולה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">
            {otherUser?.name || "משתמש"}
          </Typography>

          <Typography>
            מזהה: {otherUser?.idNumber || "לא צוין"}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
            <Chip
              label={getStatusLabel(interest?.status)}
              size="small"
              sx={{ width: "fit-content" }}
            />

            {managerStatus && (
              <Chip
                label={managerStatus}
                size="small"
                color={
                  managerStatus === "נשלח לטיפול מנהל"
                    ? "success"
                    : managerStatus.includes("ממתין")
                      ? "warning"
                      : "default"
                }
                sx={{ width: "fit-content" }}
              />
            )}
          </Stack>

          {type === "incoming" && interest?.status === "pending" && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={loading || !otherUserId}
                onClick={() => handleAction(acceptInterest, otherUserId)}
              >
                אישור
              </Button>

              <Button
                variant="outlined"
                color="error"
                disabled={loading || !otherUserId}
                onClick={() => handleAction(rejectInterest, otherUserId)}
              >
                דחייה
              </Button>
            </Stack>
          )}

          {interest?.status === "accepted" && (
            <>
              {profileLoading ? <CircularProgress size={24} /> : <ProfileDetails profile={profile} />}

              <Button
                variant="contained"
                disabled={loading || !otherUserId || managerStatus === "נשלח לטיפול מנהל"}
                onClick={() => handleAction(sendToManager, otherUserId)}
              >
                {managerStatus === "נשלח לטיפול מנהל"
                  ? "כבר נשלח לטיפול מנהל"
                  : managerStatus?.includes("ממתין")
                    ? "נשלח מצידך - ממתין לצד השני"
                    : "העבר לטיפול מנהל"}
              </Button>
            </>
          )}

          {message && (
            <Alert severity={message.includes("בהצלחה") ? "success" : "error"}>
              {message}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default InterestCard;
