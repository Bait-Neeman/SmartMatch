import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Box, Container, Snackbar, Typography } from "@mui/material";
import { ArrowForward, PersonAdd, SearchOff, Tune } from "@mui/icons-material";
import MatchCard from "../components/match/MatchCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import { ListSkeleton } from "../components/common/PageSkeleton.jsx";
import {
  fetchMatches,
  selectMatches,
  selectMatchesHidden,
  selectMatchesLoading,
  selectMatchesError,
  selectMatchesNeedsProfile,
} from "../store/slices/matchesSlice.js";
import { hiddenPreferenceEmptyText } from "../utils/hiddenByPreference.js";

const backToPersonalArea = { label: "חזרה לאזור האישי", to: "/personal-area", variant: "outlined", icon: <ArrowForward /> };

const MatchesPage = () => {
  const dispatch = useDispatch();
  const matches = useSelector(selectMatches);
  const hiddenByPreference = useSelector(selectMatchesHidden);
  const loading = useSelector(selectMatchesLoading);
  const error = useSelector(selectMatchesError);
  const needsProfile = useSelector(selectMatchesNeedsProfile);
  const [sentMessage, setSentMessage] = useState("");

  useEffect(() => {
    dispatch(fetchMatches());
  }, [dispatch]);

  const handleSent = (match) => {
    setSentMessage(match?.name ? `ההתעניינות נשלחה בהצלחה אל ${match.name}` : "ההתעניינות נשלחה בהצלחה");
  };

  const renderContent = () => {
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
          description="כדי שנוכל להציע לך התאמות, צריך קודם למלא פרופיל קצר."
          actions={[{ label: "יצירת פרופיל", to: "/profile", icon: <PersonAdd /> }, backToPersonalArea]}
        />
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ maxWidth: 560, mx: "auto" }}>
          {error}
        </Alert>
      );
    }

    if (matches.length === 0) {
      const hiddenText = hiddenPreferenceEmptyText(hiddenByPreference);
      return (
        <EmptyState
          icon={<SearchOff />}
          title="לא נמצאו התאמות כרגע"
          description={
            hiddenText ||
            "ייתכן שההעדפות שלך מצמצמות מאוד את החיפוש. אפשר לעדכן אותן, או לחזור לבדוק מאוחר יותר."
          }
          actions={[
            { label: "עדכון העדפות", to: "/personal-area?edit=preferences", icon: <Tune /> },
            backToPersonalArea,
          ]}
        />
      );
    }

    return (
      <>
        <Typography sx={{ textAlign: "center", color: "text.secondary", mb: 3 }}>
          {matches.length === 1 ? "נמצאה התאמה אחת" : `נמצאו ${matches.length} התאמות`}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
          }}
        >
          {matches.map((match) => (
            <MatchCard key={match._id || match.id} match={match} onSent={handleSent} />
          ))}
        </Box>
      </>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      <PageHeader title="התאמות" subtitle="הצעות שמתאימות לפרופיל ולהעדפות שלך" />

      {renderContent()}

      <Snackbar
        open={Boolean(sentMessage)}
        autoHideDuration={5000}
        onClose={() => setSentMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSentMessage("")} sx={{ width: "100%" }}>
          {sentMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default MatchesPage;
