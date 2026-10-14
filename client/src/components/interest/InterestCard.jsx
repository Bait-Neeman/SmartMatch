import { useState } from "react";
import { useDispatch } from "react-redux";
import { Alert, Avatar, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { Check, Close, SupervisorAccount } from "@mui/icons-material";
import {
  acceptInterest,
  rejectInterest,
  sendToManager,
} from "../../store/slices/interestsSlice.js";

// unwrap() rejects with the thunk's rejectWithValue payload - the server's message
const getErrorMessage = (err) =>
  (typeof err === "string" && err) || err?.message || "לא הצלחנו לבצע את הפעולה";

const STATUSES = {
  pending: { label: "ממתין לתשובה", color: "warning" },
  accepted: { label: "אושר", color: "success" },
  rejected: { label: "נדחה", color: "error" },
};

const InterestCard = ({ interest, type }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ severity: "success", text: "" });

  const otherUser = type === "incoming" ? interest?.sender : interest?.receiver;
  const otherUserId = otherUser?._id || otherUser?.id;
  const status = STATUSES[interest?.status] || { label: "לא ידוע", color: "default" };

  // Each side approves separately; the match reaches the manager once both have approved
  const iApproved = type === "incoming" ? interest?.receiverApprovedToManager : interest?.senderApprovedToManager;
  const otherApproved = type === "incoming" ? interest?.senderApprovedToManager : interest?.receiverApprovedToManager;

  // successText is optional: the card's own status often says it already
  const run = async (action, successText = "") => {
    try {
      setLoading(true);
      setMessage({ severity: "success", text: "" });
      await dispatch(action).unwrap();
      setMessage({ severity: "success", text: successText });
    } catch (err) {
      setMessage({ severity: "error", text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  const renderManagerStep = () => {
    if (iApproved && otherApproved) {
      return (
        <Alert severity="success" icon={<SupervisorAccount />} sx={{ width: "100%" }}>
          שני הצדדים אישרו – ההצעה הועברה לטיפול המנהל
        </Alert>
      );
    }

    if (iApproved) {
      return (
        <Typography sx={{ color: "text.secondary" }}>
          אישרת העברה לטיפול המנהל. ממתינים לאישור הצד השני.
        </Typography>
      );
    }

    return (
      <>
        {otherApproved && (
          <Typography sx={{ color: "text.secondary" }}>הצד השני כבר אישר העברה לטיפול המנהל</Typography>
        )}
        <Button
          variant="contained"
          startIcon={<SupervisorAccount />}
          disabled={loading || !otherUserId}
          onClick={() => run(sendToManager(otherUserId))}
        >
          העברה לטיפול מנהל
        </Button>
      </>
    );
  };

  return (
    <Card
      sx={{
        height: "100%",
        borderRadius: "24px",
        border: "1px solid rgba(63, 113, 213, 0.12)",
        boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
      }}
    >
      <CardContent
        sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1.5 }}
      >
        <Avatar sx={{ width: 56, height: 56, fontSize: "1.4rem", fontWeight: 800, bgcolor: "rgba(63, 113, 213, 0.12)", color: "primary.main" }}>
          {otherUser?.name?.trim()?.[0] || "?"}
        </Avatar>

        <Typography variant="h6" sx={{ fontWeight: 800, wordBreak: "break-word" }}>
          {otherUser?.name || "משתמש"}
        </Typography>

        <Chip label={status.label} color={status.color} size="small" variant="outlined" sx={{ fontWeight: 700 }} />

        {type === "incoming" && interest?.status === "pending" && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Check />}
              disabled={loading || !otherUserId}
              onClick={() => run(acceptInterest(otherUserId), "הפנייה אושרה")}
            >
              אישור
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Close />}
              disabled={loading || !otherUserId}
              onClick={() => run(rejectInterest(otherUserId), "הפנייה נדחתה")}
            >
              דחייה
            </Button>
          </Stack>
        )}

        {type === "outgoing" && interest?.status === "pending" && (
          <Typography sx={{ color: "text.secondary" }}>הפנייה נשלחה וממתינה לתשובה</Typography>
        )}

        {interest?.status === "accepted" && renderManagerStep()}

        {message.text && (
          <Alert severity={message.severity} sx={{ width: "100%" }}>
            {message.text}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default InterestCard;
