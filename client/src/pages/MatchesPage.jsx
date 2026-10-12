import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import MatchCard from "../components/match/MatchCard.jsx";
import {
  fetchMatches,
  selectMatches,
  selectMatchesLoading,
  selectMatchesError,
} from "../store/slices/matchesSlice.js";


const MatchesPage = () => {
  const dispatch = useDispatch();
  const matches = useSelector(selectMatches);
  const loading = useSelector(selectMatchesLoading);
  const error = useSelector(selectMatchesError);

  useEffect(() => {
    dispatch(fetchMatches());
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
          <MatchCard key={match._id || match.id} match={match} />
        ))
      )}
    </Box>
  );
};

export default MatchesPage;