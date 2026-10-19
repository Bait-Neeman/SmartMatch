import { useState } from "react";
import { useDispatch } from "react-redux";
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { Check, Close, Inbox, Send, SupervisorAccount } from "@mui/icons-material";
import PersonAvatar from "../common/PersonAvatar.jsx";
import StatusPill from "../common/StatusPill.jsx";
import SuggestionRow from "../suggestion/SuggestionRow.jsx";
import SuggestionDetail from "../suggestion/SuggestionDetail.jsx";
import { cleanText, idOf, toSuggestionView } from "../../utils/suggestionView.js";
import {
  acceptInterest,
  rejectInterest,
  sendToManager,
} from "../../store/slices/interestsSlice.js";

const getErrorMessage = (err) =>
  (typeof err === "string" && err) || err?.message || "לא הצלחנו לבצע את הפעולה";

const displayName = (value) => cleanText(value) || "משתמש";

const STATUSES = {
  pending: { label: "ממתין לתשובה", tone: "pending" },
  accepted: { label: "אושר", tone: "accepted" },
  rejected: { label: "נדחה", tone: "rejected" },
};

// variant "row" | "detail" is the anonymous suggestions layout.
// The default card stays on the interests page.
const InterestCard = ({
  interest,
  type,
  variant = "card",
  offline = false,
  onOpen,
  onDeclined,
  onAccepted,
  reservePercent = false,
  view: viewProp,
}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ severity: "success", text: "" });

  const otherUser = type === "incoming" ? interest?.sender : interest?.receiver;
  const otherUserId = idOf(otherUser);
  const status = STATUSES[interest?.status] || { label: "לא ידוע", tone: "neutral" };
  const kind = type === "incoming" ? "received" : "sent";

  const iApproved = type === "incoming" ? interest?.receiverApprovedToManager : interest?.senderApprovedToManager;
  const otherApproved = type === "incoming" ? interest?.senderApprovedToManager : interest?.receiverApprovedToManager;

  const run = async (action, outcome, successText = "") => {
    try {
      setLoading(true);
      setMessage({ severity: "success", text: "" });
      if (!offline) {
        await dispatch(action).unwrap();
      }
      if (outcome === "rejected") onDeclined?.(interest);
      if (outcome === "accepted") onAccepted?.(interest);
      if (variant === "card" && successText) {
        setMessage({ severity: "success", text: successText });
      }
    } catch (err) {
      setMessage({ severity: "error", text: getErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  };

  if (variant === "row" || variant === "detail") {
    const person = type === "incoming" ? interest?.sender : interest?.receiver;
    const suggestion = viewProp || toSuggestionView(person, kind, interest);
    const icon = kind === "received" ? <Inbox /> : <Send />;
    const actions =
      kind === "received" && interest?.status === "pending" ? (
        <>
          <Button
            variant="contained"
            size="small"
            startIcon={<Check />}
            disabled={loading || !otherUserId}
            onClick={(event) => {
              event.stopPropagation();
              run(acceptInterest(otherUserId), "accepted");
            }}
          >
            אשר התעניינות
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Close />}
            disabled={loading || !otherUserId}
            onClick={(event) => {
              event.stopPropagation();
              run(rejectInterest(otherUserId), "rejected");
            }}
          >
            לא מעוניין/ת
          </Button>
        </>
      ) : null;

    if (variant === "detail") {
      return (
        <SuggestionDetail
          view={suggestion}
          icon={icon}
          actions={actions}
          error={message.severity === "error" ? message.text : ""}
          onBack={onOpen}
        />
      );
    }

    return (
      <SuggestionRow
        view={suggestion}
        icon={icon}
        actions={actions}
        error={message.severity === "error" ? message.text : ""}
        onOpen={onOpen}
        reservePercent={reservePercent}
      />
    );
  }

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
    <Card sx={{ height: "100%" }}>
      <CardContent
        sx={{ p: 3, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1.5 }}
      >
        <PersonAvatar size={64} gender={otherUser?.gender} locked={interest?.status !== "accepted"} />

        <Typography variant="h6" sx={{ fontWeight: 800, wordBreak: "break-word" }}>
          {displayName(otherUser?.name)}
        </Typography>

        <StatusPill tone={status.tone} label={status.label} />

        {type === "incoming" && interest?.status === "pending" && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<Check />}
              disabled={loading || !otherUserId}
              onClick={() => run(acceptInterest(otherUserId), "accepted", "הפנייה אושרה")}
            >
              אישור
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Close />}
              disabled={loading || !otherUserId}
              onClick={() => run(rejectInterest(otherUserId), "rejected", "הפנייה נדחתה")}
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
