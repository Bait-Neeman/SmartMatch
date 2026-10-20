import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Typography } from "@mui/material";
import { Close, DoNotDisturb, PersonAdd, SearchOff } from "@mui/icons-material";
import ActiveSuggestionCard from "../components/suggestion/ActiveSuggestionCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import { ListSkeleton } from "../components/common/PageSkeleton.jsx";
import useMatchmakerSuggestions from "../hooks/useMatchmakerSuggestions.js";
import { matchmakerHref } from "../utils/matchmakerView.js";
import { brand } from "../theme/tokens.js";

const DECLINED_TEXT = "ההצעה עברה ללשונית נדחו בעמוד ההצעות";

export default function MatchmakerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading, error, needsProfile, decline } = useMatchmakerSuggestions();
  const [localNotice, setLocalNotice] = useState("");
  const [seenDecline, setSeenDecline] = useState(null);
  const declineStamp = location.state?.declinedStamp ?? null;
  const notice = localNotice || (declineStamp && declineStamp !== seenDecline ? DECLINED_TEXT : "");

  const dismissNotice = () => {
    setLocalNotice("");
    setSeenDecline(declineStamp);
  };

  const renderBody = () => {
    if (loading) {
      return (
        <ListSkeleton />
      );
    }

    if (needsProfile) {
      return (
        <EmptyState
          icon={<PersonAdd />}
          title="עוד לא יצרת פרופיל"
          description="כדי לראות הצעות בטיפול שדכן, צריך קודם למלא פרופיל קצר."
          actions={[{ label: "יצירת פרופיל", to: "/profile", icon: <PersonAdd /> }]}
        />
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={<SearchOff />}
          title="אין הצעות בטיפול שדכן"
          description="כששני הצדדים מעבירים הצעה, היא מופיעה כאן. התמונה והשם גלויים רק אחרי אישור הדדי."
        />
      );
    }

    return items.map((item) => (
      <ActiveSuggestionCard
        key={item.id}
        item={item}
        onOpen={() => navigate(matchmakerHref(item))}
        onDecline={async (entry) => {
          await decline(entry);
          setLocalNotice(DECLINED_TEXT);
        }}
      />
    ));
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography
          component="h1"
          sx={{
            m: 0,
            fontWeight: 600,
            letterSpacing: "-0.3px",
            color: brand.navy,
            fontSize: "clamp(22px, 1.9vw, 28px)",
            lineHeight: 1.2,
          }}
        >
          בטיפול שדכן
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 17 }}>
          שני הצדדים העבירו את ההצעה. השדכן מטפל, והתמונה והשם גלויים
        </Typography>
      </Box>

      {notice ? (
        <Box
          sx={{
            display: "flex",
            width: "fit-content",
            alignItems: "center",
            gap: 1.25,
            mb: "14px",
            px: 1.5,
            py: 1,
            borderRadius: "10px",
            bgcolor: brand.paper,
            border: `1px solid ${brand.line}`,
            color: brand.toastText,
            fontSize: "13.5px",
            boxShadow: brand.toastShadow,
          }}
        >
          <DoNotDisturb sx={{ fontSize: 15, color: brand.toastIcon }} />
          <span>{notice}</span>
          <Box
            component="button"
            type="button"
            aria-label="סגירה"
            onClick={dismissNotice}
            sx={{
              border: 0,
              background: "none",
              color: brand.toastIcon,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              p: 0,
            }}
          >
            <Close sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2, maxWidth: 560 }}>
          {error}
        </Alert>
      ) : null}

      {renderBody()}
    </Box>
  );
}
