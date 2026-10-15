import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { Close, DoNotDisturb, PersonAdd, SearchOff } from "@mui/icons-material";
import ActiveSuggestionCard from "../components/suggestion/ActiveSuggestionCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import useActiveSuggestions from "../hooks/useActiveSuggestions.js";
import { activeHref } from "../utils/activeSuggestionView.js";
import { brand } from "../theme/tokens.js";

const DECLINED_TEXT = "הצעה אחת נדחתה והוסרה מהרשימה";

export default function ActiveSuggestionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading, error, needsProfile, preview, forward, decline } = useActiveSuggestions();
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
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (needsProfile) {
      return (
        <EmptyState
          icon={<PersonAdd />}
          title="עוד לא יצרת פרופיל"
          description="כדי שנוכל להציג הצעות פעילות, צריך קודם למלא פרופיל קצר."
          actions={[{ label: "יצירת פרופיל", to: "/profile", icon: <PersonAdd /> }]}
        />
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={<SearchOff />}
          title="אין הצעות פעילות"
          description="הצעות שאושרו הדדית יופיעו כאן. התמונה והשם נחשפים רק אחרי אישור הדדי."
        />
      );
    }

    return items.map((item) => (
      <ActiveSuggestionCard
        key={item.id}
        item={item}
        onOpen={() => navigate(activeHref(item, preview))}
        onForward={forward}
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
          הצעות פעילות
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 17 }}>
          הצעות שאושרו הדדית – התמונה והשם גלויים לשניכם
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
