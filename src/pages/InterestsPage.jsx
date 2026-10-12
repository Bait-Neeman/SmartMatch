import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import {
  getIncomingInterests,
  getOutgoingInterests,
} from "../services/interest.service.js";
import InterestCard from "../components/interest/InterestCard.jsx";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  return data?.interests || data?.data || [];
};

const InterestsPage = () => {
  const [tab, setTab] = useState(0);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadInterests = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [incomingData, outgoingData] = await Promise.all([
        getIncomingInterests(),
        getOutgoingInterests(),
      ]);

      setIncoming(normalizeArray(incomingData));
      setOutgoing(normalizeArray(outgoingData));
    } catch (err) {
      console.error("Failed to load interests:", err);
      setError(err.message || "לא הצלחנו לטעון התעניינויות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInterests();
  }, [loadInterests]);

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
                onChanged={loadInterests}
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
                onChanged={loadInterests}
              />
            ))
          ))}
      </Box>
    </Box>
  );
};

export default InterestsPage;