import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Alert,
  Box,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import InterestCard from "../components/interest/InterestCard.jsx";
import {
  fetchInterests,
  selectIncomingInterests,
  selectOutgoingInterests,
  selectInterestsLoading,
  selectInterestsError,
} from "../store/slices/interestsSlice.js";

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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        התעניינויות
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Tabs value={tab} onChange={(event, newValue) => setTab(newValue)}>
        <Tab label="פניות שקיבלתי" />
        <Tab label="פניות ששלחתי" />
      </Tabs>

      <Box sx={{ mt: 3 }}>
        {tab === 0 &&
          (incoming.length === 0 ? (
            <Typography>אין פניות נכנסות כרגע</Typography>
          ) : (
            incoming.map((interest) => (
              <InterestCard
                key={interest._id || interest.id}
                interest={interest}
                type="incoming"
              />
            ))
          ))}

        {tab === 1 &&
          (outgoing.length === 0 ? (
            <Typography>אין פניות יוצאות כרגע</Typography>
          ) : (
            outgoing.map((interest) => (
              <InterestCard
                key={interest._id || interest.id}
                interest={interest}
                type="outgoing"
              />
            ))
          ))}
      </Box>
    </Box>
  );
};

export default InterestsPage;