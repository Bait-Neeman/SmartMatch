import { useState } from "react";
import { useDispatch } from "react-redux";
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { FavoriteBorder, LocationOn } from "@mui/icons-material";
import { sendInterest } from "../../store/slices/matchesSlice.js";
import { appearanceOptions, labelOf, styleOptions } from "../../constants/profileOptions.js";

// onSent is called after a successful send - the card itself is removed from the list then,
// so the confirmation is shown by the page
const MatchCard = ({ match, onSent }) => {
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

  const details = [
    match?.age && `גיל ${match.age}`,
    match?.height && `${match.height} ס"מ`,
    labelOf(styleOptions, match?.style),
    labelOf(appearanceOptions, match?.appearance),
  ].filter(Boolean);

  const handleSendInterest = async () => {
    try {
      setLoading(true);
      setMessage("");

      await dispatch(sendInterest(receiverId)).unwrap();

      onSent?.(match);
    } catch (err) {
      // unwrap() rejects with the thunk's rejectWithValue payload - the server's message
      setMessage((typeof err === "string" && err) || err?.message || "לא הצלחנו לשלוח התעניינות");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "24px",
        border: "1px solid rgba(63, 113, 213, 0.12)",
        boxShadow: "0 16px 38px rgba(15, 23, 42, 0.08)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        "&:hover": { transform: "translateY(-3px)", boxShadow: "0 20px 44px rgba(15, 23, 42, 0.12)" },
      }}
    >
      <CardContent
        sx={{ p: 3, flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 1.5 }}
      >
        <Avatar sx={{ width: 64, height: 64, fontSize: "1.6rem", fontWeight: 800, bgcolor: "rgba(63, 113, 213, 0.12)", color: "primary.main" }}>
          {match?.name?.trim()?.[0] || "?"}
        </Avatar>

        <Typography variant="h6" sx={{ fontWeight: 800, wordBreak: "break-word" }}>
          {match?.name || "משתמש"}
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
              <Chip key={detail} label={detail} size="small" sx={{ bgcolor: "rgba(63, 113, 213, 0.08)", fontWeight: 600 }} />
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
          startIcon={<FavoriteBorder />}
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
