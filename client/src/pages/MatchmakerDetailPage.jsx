import { useNavigate, useParams } from "react-router-dom";
import { FormSkeleton } from "../components/common/PageSkeleton.jsx";
import { SearchOff } from "@mui/icons-material";
import ActiveSuggestionCard from "../components/suggestion/ActiveSuggestionCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import useMatchmakerSuggestions from "../hooks/useMatchmakerSuggestions.js";
import { matchmakerHome } from "../utils/matchmakerView.js";

export default function MatchmakerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, loading, decline } = useMatchmakerSuggestions();
  const decodedId = decodeURIComponent(id || "");
  const home = matchmakerHome();

  if (loading) {
    return (
      <FormSkeleton />
    );
  }

  const item = items.find((entry) => entry.id === decodedId);

  if (!item) {
    return (
      <EmptyState
        icon={<SearchOff />}
        title="ההצעה לא נמצאה"
        description="ייתכן שהיא נדחתה, או ששני הצדדים עדיין לא העבירו אותה לטיפול שדכן."
        actions={[{ label: "חזרה לבטיפול שדכן", to: home }]}
      />
    );
  }

  return (
    <ActiveSuggestionCard
      item={item}
      variant="detail"
      onOpen={() => navigate(home)}
      onDecline={async (entry) => {
        await decline(entry);
        navigate(home, { state: { declinedStamp: Date.now() } });
      }}
    />
  );
}
