import { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { getMatches } from "../services/match.service.js";
import MatchCard from "../components/match/MatchCard.jsx";

const normalizeCandidates = (data) => {
  if (Array.isArray(data)) return data;
  return data?.candidates || data?.matches || data?.data || [];
};

const MatchesPage = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMatches();
      setMatches(normalizeCandidates(data));
    } catch (err) {
      console.error("Failed to load matches:", err);
      setError(err.message || "לא הצלחנו לטעון התאמות");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const handleInterestSent = (receiverId) => {
    setMatches((prev) =>
      prev.filter((match) => {
        const id = match?._id || match?.id || match?.user?._id || match?.user;
        return id !== receiverId;
      })
    );
  };

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
        התאמות
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {matches.length === 0 ? (
        <Typography>לא נמצאו התאמות כרגע</Typography>
      ) : (
        matches.map((match) => (
          <MatchCard
            key={match._id || match.id}
            match={match}
            onInterestSent={handleInterestSent}
          />
        ))
      )}
    </Box>
  );
};

export default MatchesPage;