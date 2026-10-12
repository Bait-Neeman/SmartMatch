import { useState } from "react";
import { useDispatch } from "react-redux";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
  Snackbar,
} from "@mui/material";
import {
  acceptInterest,
  rejectInterest,
  sendToManager,
} from "../../store/slices/interestsSlice.js";

const getStatusLabel = (status) => {
  if (status === "pending") return "ממתין";
  if (status === "accepted") return "אושר";
  if (status === "rejected") return "נדחה";
  return "לא ידוע";
};

const InterestCard = ({ interest, type }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);
  const [alreadySentOpen, setAlreadySentOpen] = useState(false);

  const otherUser = type === "incoming" ? interest?.sender : interest?.receiver;
  const otherUserId = otherUser?._id || otherUser?.id;

  const handleAccept = async () => {
    try {
      setLoading(true);
      setMessage("");

      await dispatch(acceptInterest(otherUserId)).unwrap();
      setMessage("הפעולה בוצעה בהצלחה");
    } catch (err) {
      console.error("Interest action failed:", err);
      setMessage(err?.message || "לא הצלחנו לבצע את הפעולה");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      setMessage("");

      await dispatch(rejectInterest(otherUserId)).unwrap();
      setMessage("הפעולה בוצעה בהצלחה");
    } catch (err) {
      console.error("Interest action failed:", err);
      setMessage(err?.message || "לא הצלחנו לבצע את הפעולה");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToManager = async () => {
    try {
      setLoading(true);
      setMessage("");

      const alreadySent = !!(
        interest?.senderApprovedToManager || interest?.receiverApprovedToManager
      );

      if (alreadySent) {
        setAlreadySentOpen(true);
        return;
      }

      await dispatch(sendToManager(otherUserId)).unwrap();
      setMessage("הפעולה בוצעה בהצלחה");
      setSnackOpen(true);
    } catch (err) {
      console.error("Interest action failed:", err);
      setMessage(err?.message || "לא הצלחנו לבצע את הפעולה");
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
        <Stack spacing={1.5} alignItems="center" sx={{ width: '100%', textAlign: 'center', wordBreak: 'break-word' }}>
          <Typography variant="h6" sx={{ wordBreak: 'break-word' }}>
            {otherUser?.name || "משתמש"}
          </Typography>

          <Typography sx={{ wordBreak: 'break-word' }}>
            מזהה: {otherUser?.idNumber || "לא צוין"}
          </Typography>

          <Chip
            label={getStatusLabel(interest?.status)}
            size="small"
            sx={{ width: "fit-content" }}
          />

          {type === "incoming" && interest?.status === "pending" && (
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                disabled={loading || !otherUserId}
                onClick={handleAccept}
              >
                אישור
              </Button>

              <Button
                variant="outlined"
                color="error"
                disabled={loading || !otherUserId}
                onClick={handleReject}
              >
                דחייה
              </Button>
            </Stack>
          )}

          {interest?.status === "accepted" && (
            <Button
              variant="contained"
              disabled={loading || !otherUserId}
              onClick={handleSendToManager}
            >
              העבר לטיפול מנהל
            </Button>
          )}

          {message && (
            <Alert severity={message.includes("בהצלחה") ? "success" : "error"} sx={{ width: '100%' }}>
              {message}
            </Alert>
          )}
          <Snackbar
            open={snackOpen}
            autoHideDuration={3000}
            onClose={() => setSnackOpen(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert onClose={() => setSnackOpen(false)} severity="success" sx={{ width: "100%" }}>
              הועבר לטיפול המנהל
            </Alert>
          </Snackbar>
          <Snackbar
            open={alreadySentOpen}
            autoHideDuration={3000}
            onClose={() => setAlreadySentOpen(false)}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert onClose={() => setAlreadySentOpen(false)} severity="warning" sx={{ width: "100%" }}>
              הפניה כבר נשלחה למנהל
            </Alert>
          </Snackbar>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default InterestCard;