import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { sendInterest } from "../../services/interest.service.js";

const appearanceLabels = {
  slim: "רזה",
  average: "ממוצע",
  full: "מלא",
  chubby: "רחב",
};

const MatchCard = ({ match, onInterestSent }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const receiverId = match?._id || match?.id || match?.user?._id || match?.user;

  const handleSendInterest = async () => {
    try {
      setLoading(true);
      setMessage("");

      await sendInterest(receiverId);

      setMessage("ההתעניינות נשלחה בהצלחה");

      if (onInterestSent) {
        onInterestSent(receiverId);
      }
    } catch (err) {
      console.error("Failed to send interest:", err);
      setMessage(err.message || "לא הצלחנו לשלוח התעניינות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="h6">
            {match?.name || "משתמש"}
          </Typography>

          <Typography>מקום לימודים: {match?.studyPlace || "לא צוין"}</Typography>
          <Typography>מקצוע: {match?.occupation || "לא צוין"}</Typography>
          <Typography>גיל: {match?.age || "לא צוין"}</Typography>
          <Typography>גובה: {match?.height || "לא צוין"}</Typography>
          <Typography>
            מראה חיצוני: {appearanceLabels[match?.appearance] || match?.appearance || "לא צוין"}
          </Typography>
          <Typography>עיר: {match?.city || "לא צוין"}</Typography>
          <Typography>
            יכולות כספיות: {match?.financialCapabilities ?? "לא צוין"}
          </Typography>
          <Typography>תיאור: {match?.description || "לא צוין"}</Typography>

          <Button
            variant="contained"
            onClick={handleSendInterest}
            disabled={loading || !receiverId}
          >
            {loading ? "שולח..." : "שליחת התעניינות"}
          </Button>

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

export default MatchCard;
