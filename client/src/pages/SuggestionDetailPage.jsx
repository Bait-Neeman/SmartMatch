import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { SearchOff } from "@mui/icons-material";
import MatchCard from "../components/match/MatchCard.jsx";
import InterestCard from "../components/interest/InterestCard.jsx";
import SuggestionDetail from "../components/suggestion/SuggestionDetail.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import useSuggestions from "../hooks/useSuggestions.js";
import { SUGGESTION_KINDS, suggestionsHome } from "../utils/suggestionView.js";

const KINDS = new Set(["new", "sent", "received", "declined"]);

export default function SuggestionDetailPage() {
  const { kind, id } = useParams();
  const navigate = useNavigate();
  const { items, loading, preview, offline, onSent, onDeclined, onAccepted } = useSuggestions();
  const decodedId = decodeURIComponent(id || "");
  const home = suggestionsHome(preview);

  if (!KINDS.has(kind)) {
    return <Navigate to={home} replace />;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const item = items.find((entry) => entry.kind === kind && entry.id === decodedId);

  if (!item) {
    return (
      <EmptyState
        icon={<SearchOff />}
        title="ההצעה לא נמצאה"
        description="ייתכן שהיא אושרה, או שהכתובת לא שייכת להצעה שמופיעה אצלך."
        actions={[{ label: "חזרה להצעות", to: home }]}
      />
    );
  }

  const view = item.view;

  if (item.kind === "declined") {
    const meta = SUGGESTION_KINDS[view.kind] || SUGGESTION_KINDS.declined;
    return <SuggestionDetail view={view} icon={null} actions={null} onBack={() => navigate(home)} bannerTitle={meta.bannerTitle} />;
  }

  if (item.kind === "new") {
    return (
      <MatchCard
        match={item.match}
        view={view}
        variant="detail"
        offline={offline}
        onOpen={() => navigate(home)}
        onSent={(match) => {
          onSent(match);
          navigate(home);
        }}
      />
    );
  }

  return (
    <InterestCard
      interest={item.interest}
      type={item.kind === "received" ? "incoming" : "outgoing"}
      view={view}
      variant="detail"
      offline={offline}
      onOpen={() => navigate(home)}
      onDeclined={(interest) => {
        onDeclined(interest);
        navigate(home, { state: { declinedStamp: Date.now() } });
      }}
      onAccepted={(interest) => {
        onAccepted(interest);
        navigate(home);
      }}
    />
  );
}
