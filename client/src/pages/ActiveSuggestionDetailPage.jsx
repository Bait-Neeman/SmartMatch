import { useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { SearchOff } from "@mui/icons-material";
import ActiveSuggestionCard from "../components/suggestion/ActiveSuggestionCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import useActiveSuggestions from "../hooks/useActiveSuggestions.js";
import { activeHome } from "../utils/activeSuggestionView.js";

export default function ActiveSuggestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, loading, preview, forward, decline } = useActiveSuggestions();
  const decodedId = decodeURIComponent(id || "");
  const home = activeHome(preview);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const item = items.find((entry) => entry.id === decodedId);

  if (!item) {
    return (
      <EmptyState
        icon={<SearchOff />}
        title="ההצעה לא נמצאה"
        description="ייתכן שהיא נדחתה, או שפרטיה עדיין אינם גלויים."
        actions={[{ label: "חזרה להצעות פעילות", to: home }]}
      />
    );
  }

  return (
    <ActiveSuggestionCard
      item={item}
      variant="detail"
      onOpen={() => navigate(home)}
      onForward={forward}
      onDecline={async (entry) => {
        await decline(entry);
        navigate(home, { state: { declinedStamp: Date.now() } });
      }}
    />
  );
}
