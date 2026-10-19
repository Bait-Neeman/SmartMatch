import { useState } from "react";
import { useDispatch } from "react-redux";
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { AutoAwesome, LocationOn, Send } from "@mui/icons-material";
import { sendInterest } from "../../store/slices/matchesSlice.js";
import { appearanceOptions, labelOf, maritalStatusOptions, styleOptions } from "../../constants/profileOptions.js";
import PersonAvatar from "../common/PersonAvatar.jsx";
import MatchRing from "../common/MatchRing.jsx";
import SuggestionRow from "../suggestion/SuggestionRow.jsx";
import SuggestionDetail from "../suggestion/SuggestionDetail.jsx";
import { cleanText, idOf, toSuggestionView } from "../../utils/suggestionView.js";
import { brand } from "../../theme/tokens.js";

const displayName = (value) => cleanText(value) || "משתמש";

// onSent is called after a successful send - the card itself is removed from the list then,
// so the confirmation is shown by the page.
// variant "row" | "detail" is the anonymous suggestions layout. The default card stays on התאמות.
const MatchCard = ({ match, onSent, onOpen, variant = "card", offline = false, view, reservePercent = false }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const receiverId = idOf(match);

  const matchPercent = typeof match?.matchPercent === "number" && Number.isFinite(match.matchPercent) ? match.matchPercent : undefined;

  const details = [
    match?.age && `גיל ${match.age}`,
    match?.height && `${match.height} ס"מ`,
    labelOf(maritalStatusOptions, match?.maritalStatus),
    labelOf(styleOptions, match?.style),
    labelOf(appearanceOptions, match?.appearance),
  ].filter(Boolean);

  const handleSendInterest = async (event) => {
    event?.stopPropagation?.();
    try {
      setLoading(true);
      setMessage("");
      if (offline) {
        onSent?.(match);
        return;
      }
      await dispatch(sendInterest(receiverId)).unwrap();
      onSent?.(match);
    } catch (err) {
      setMessage((typeof err === "string" && err) || err?.message || "לא הצלחנו לשלוח התעניינות");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "row" || variant === "detail") {
    const suggestion = view || toSuggestionView(match, "new");
    const actions = (
      <Button
        variant="contained"
        size="small"
        startIcon={<Send />}
        onClick={handleSendInterest}
        disabled={loading || !receiverId}
      >
        {loading ? "שולח..." : "שלח התעניינות"}
      </Button>
    );
    const icon = <AutoAwesome />;
    if (variant === "detail") {
      return <SuggestionDetail view={suggestion} icon={icon} actions={actions} error={message} onBack={onOpen} />;
    }
    return (
      <SuggestionRow
        view={suggestion}
        icon={icon}
        actions={actions}
        error={message}
        onOpen={onOpen}
        reservePercent={reservePercent}
      />
    );
  }

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": { transform: "translateY(-2px)", boxShadow: brand.cardHoverShadow },
      }}
    >
      <CardContent
        sx={{ p: 3, flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1.5 }}
      >
        <PersonAvatar size={72} gender={match?.gender} />
        {matchPercent !== undefined && <MatchRing value={matchPercent} />}

        <Typography variant="h6" sx={{ fontWeight: 800, wordBreak: "break-word" }}>
          {displayName(match?.name)}
        </Typography>

        {match?.city && (
          <Typography sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationOn fontSize="small" />
            {match.city}
          </Typography>
        )}

        {details.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, justifyContent: "center" }}>
            {details.map((detail) => (
              <Chip key={detail} label={detail} size="small" />
            ))}
          </Stack>
        )}

        {match?.description && (
          <Typography sx={{ color: "text.secondary", wordBreak: "break-word" }}>{match.description}</Typography>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="contained"
          fullWidth
          startIcon={<Send />}
          onClick={handleSendInterest}
          disabled={loading || !receiverId}
        >
          {loading ? "שולח..." : "שליחת התעניינות"}
        </Button>

        {message && (
          <Alert severity="error" sx={{ width: "100%" }}>
            {message}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchCard;
