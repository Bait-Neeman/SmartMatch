import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { sendInterest } from "../../store/slices/matchesSlice.js";

const MatchCard = ({ match }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const rawReceiver = match?._id || match?.id || match?.user?._id || match?.user;

  const normalizeId = (item) => {
    if (!item && item !== 0) return item;
    if (typeof item === "object") return item._id || item.id || item.user?._id || item.user || undefined;
    return item;
  };

  const receiverId = normalizeId(rawReceiver);

  const handleSendInterest = async () => {
    try {
      setLoading(true);
      setMessage("");

      await dispatch(sendInterest(receiverId)).unwrap();

      setMessage("ההתעניינות נשלחה בהצלחה");
    } catch (err) {
      console.error("Failed to send interest:", err);
      setMessage(err?.message || "לא הצלחנו לשלוח התעניינות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 20,
        boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
        border: "1px solid rgba(63, 113, 213, 0.12)",
      }}
    >
      <CardContent sx={{ px: 3, py: 2 }}>
        <Stack spacing={1} alignItems="center" sx={{ width: '100%', textAlign: 'center' }}>
          <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
            {match?.name || "משתמש"}
          </Typography>

          <Typography sx={{ wordBreak: 'break-word' }}>עיר: {match?.city || "לא צוין"}</Typography>
          <Typography sx={{ wordBreak: 'break-word' }}>גיל: {match?.age || "לא צוין"}</Typography>
          <Typography sx={{ wordBreak: 'break-word' }}>גובה: {match?.height || "לא צוין"}</Typography>
          <Typography sx={{ wordBreak: 'break-word' }}>סגנון: {match?.style || "לא צוין"}</Typography>
          <Typography sx={{ wordBreak: 'break-word' }}>תיאור: {match?.description || "לא צוין"}</Typography>

          <Button
            variant="contained"
            onClick={handleSendInterest}
            disabled={loading || !receiverId}
            sx={{ mt: 1 }}
          >
            {loading ? "שולח..." : "שליחת התעניינות"}
          </Button>

          {message && (
            <Alert severity={message.includes("בהצלחה") ? "success" : "error"} sx={{ width: '100%' }}>
              {message}
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MatchCard;