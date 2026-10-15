import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Box, CircularProgress, Container, Tab, Tabs } from "@mui/material";
import { ArrowForward, Inbox, Send } from "@mui/icons-material";
import InterestCard from "../components/interest/InterestCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import PageHeader from "../components/common/PageHeader.jsx";
import {
  fetchInterests,
  selectIncomingInterests,
  selectOutgoingInterests,
  selectInterestsLoading,
  selectInterestsError,
} from "../store/slices/interestsSlice.js";

const emptyActions = [
  { label: "מעבר להתאמות", to: "/matches", icon: <ArrowForward /> },
  { label: "חזרה לאזור האישי", to: "/personal-area", variant: "outlined", icon: <ArrowForward /> },
];

const InterestsPage = () => {
  const [tab, setTab] = useState(0);
  const dispatch = useDispatch();
  const incoming = useSelector(selectIncomingInterests);
  const outgoing = useSelector(selectOutgoingInterests);
  const loading = useSelector(selectInterestsLoading);
  const error = useSelector(selectInterestsError);

  useEffect(() => {
    dispatch(fetchInterests());
  }, [dispatch]);

  const type = tab === 0 ? "incoming" : "outgoing";
  const interests = tab === 0 ? incoming : outgoing;

  const renderList = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (interests.length === 0) {
      return tab === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="עדיין לא קיבלת פניות"
          description="כשמישהו ישלח לך התעניינות, היא תופיע כאן."
          actions={emptyActions}
        />
      ) : (
        <EmptyState
          icon={<Send />}
          title="עדיין לא שלחת פניות"
          description="אפשר לשלוח התעניינות מתוך דף ההתאמות."
          actions={emptyActions}
        />
      );
    }

    return (
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" } }}>
        {interests.map((interest) => (
          <InterestCard key={interest._id || interest.id} interest={interest} type={type} />
        ))}
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
      <PageHeader title="התעניינויות" subtitle="פניות שקיבלת ופניות ששלחת" />

      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 560, mx: "auto" }}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(event, newValue) => setTab(newValue)} centered sx={{ mb: 4 }}>
        <Tab label={`פניות שקיבלתי (${incoming.length})`} />
        <Tab label={`פניות ששלחתי (${outgoing.length})`} />
      </Tabs>

      {renderList()}
    </Container>
  );
};

export default InterestsPage;
