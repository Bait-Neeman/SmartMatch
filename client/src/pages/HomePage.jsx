import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { AutoAwesome, FavoriteBorder, MailOutlined, PersonAdd, Send } from "@mui/icons-material";
import { brand } from "../theme/tokens.js";
import { getSession } from "../utils/session.js";
import { getSuggestionLists, profileRequired } from "../services/suggestion.service.js";
import { getSettings } from "../services/settings.service.js";
import { sendInterest } from "../services/interest.service.js";
import { suggestionHref } from "../utils/suggestionView.js";
import {
  greetingLine,
  hebrewDateLine,
  homeCounts,
  toHomeCards,
  weeklyNewLine,
} from "../utils/homeDashboard.js";
import HomeSuggestionCard from "../components/home/HomeSuggestionCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";

const heroBackground = `radial-gradient(400px 200px at 0% 0%, ${brand.goldGlow}, transparent 70%), linear-gradient(90deg, ${brand.paper}, ${brand.heroEnd})`;

const STATS = [
  { key: "fresh", label: "הצעות חדשות", to: "/suggestions", icon: <AutoAwesome /> },
  { key: "received", label: "התקבלה התעניינות", to: "/suggestions", icon: <MailOutlined /> },
  { key: "active", label: "הצעות פעילות", to: "/active", icon: <FavoriteBorder /> },
  { key: "matchmaker", label: "בטיפול שדכן", to: "/active", icon: <Send /> },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user, isAdmin } = getSession();
  const [payload, setPayload] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);
  const [showMatchPercent, setShowMatchPercent] = useState(true);
  const [sendingId, setSendingId] = useState("");
  const [cardError, setCardError] = useState({ id: "", message: "" });

  const load = useCallback(async () => {
    try {
      const data = await getSuggestionLists();
      setPayload(data || {});
      setError("");
      setNeedsProfile(false);
    } catch (err) {
      const missing = profileRequired(err);
      setNeedsProfile(missing);
      setError(missing ? "" : err?.message || "לא הצלחנו לטעון הצעות");
      if (missing) setPayload(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) return undefined;
    let active = true;
    getSuggestionLists()
      .then((data) => {
        if (!active) return;
        setPayload(data || {});
        setError("");
        setNeedsProfile(false);
      })
      .catch((err) => {
        if (!active) return;
        const missing = profileRequired(err);
        setNeedsProfile(missing);
        setError(missing ? "" : err?.message || "לא הצלחנו לטעון הצעות");
        if (missing) setPayload(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    getSettings()
      .then((data) => {
        if (!active) return;
        if (typeof data?.settings?.showMatchPercent === "boolean") {
          setShowMatchPercent(data.settings.showMatchPercent);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (isAdmin) return <Navigate to="/admin" replace />;

  const counts = payload ? homeCounts(payload) : null;
  const cards = toHomeCards(payload?.newSuggestions).map((card) =>
    showMatchPercent ? card : { ...card, percent: null }
  );
  const summary = !ready
    ? "טוענים את ההצעות שנבחרו עבורך…"
    : needsProfile
      ? "כדי לקבל הצעות, צריך קודם למלא פרופיל."
      : error
        ? "לא הצלחנו לטעון את ההצעות."
        : weeklyNewLine(counts?.weekly ?? 0);

  const onInterest = async (card) => {
    setSendingId(card.id);
    setCardError({ id: "", message: "" });
    try {
      await sendInterest(card.id);
      await load();
    } catch (err) {
      setCardError({ id: card.id, message: err?.message || "לא הצלחנו לשלוח התעניינות" });
    } finally {
      setSendingId("");
    }
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          p: { xs: "22px", md: "22px 30px" },
          borderRadius: "18px",
          border: `1px solid ${brand.line}`,
          boxShadow: brand.shadow,
          background: heroBackground,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              bgcolor: brand.tabOn,
              color: brand.goldText,
              borderRadius: 999,
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <AutoAwesome sx={{ fontSize: 16, color: brand.goldDeep }} />
            {hebrewDateLine()}
          </Box>
          <Typography
            component="h1"
            sx={{
              mt: 1,
              mb: 0.5,
              fontSize: "clamp(24px, 2vw, 30px)",
              fontWeight: 600,
              letterSpacing: "-0.3px",
              color: brand.navy,
              lineHeight: 1.15,
            }}
          >
            {greetingLine(user?.name)}
          </Typography>
          <Typography sx={{ m: 0, color: brand.ink2, fontSize: 15, maxWidth: 520 }}>{summary}</Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flex: "none", flexWrap: "wrap" }}>
          <Button component={RouterLink} to="/suggestions" variant="contained">
            לצפייה בהצעות
          </Button>
          <Button component={RouterLink} to="/preferences" variant="outlined">
            עדכון העדפות
          </Button>
        </Box>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" },
          gap: "clamp(12px, 1.3vw, 20px)",
          mt: "20px",
        }}
      >
        {STATS.map((stat) => (
          <Paper
            key={stat.key}
            component={RouterLink}
            to={stat.to}
            sx={{
              p: "18px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "6px",
              textAlign: "center",
              color: "inherit",
              textDecoration: "none",
              transition: "transform .18s ease, box-shadow .18s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                borderColor: brand.rowHoverBorder,
                boxShadow: brand.rowHoverShadow,
              },
            }}
          >
            <Box sx={{ color: brand.gold, display: "grid", "& svg": { fontSize: 26 } }}>{stat.icon}</Box>
            <Typography sx={{ fontSize: "clamp(22px, 1.8vw, 28px)", fontWeight: 600, color: brand.navy, lineHeight: 1 }}>
              {counts ? counts[stat.key] : "—"}
            </Typography>
            <Typography sx={{ color: brand.mut, fontSize: 14 }}>{stat.label}</Typography>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 2, mt: 4, mb: 2 }}>
        <Typography component="h2" sx={{ m: 0, fontSize: "clamp(18px, 1.4vw, 21px)", fontWeight: 600, color: brand.navy }}>
          הצעות חדשות עבורך
        </Typography>
        <Button component={RouterLink} to="/suggestions" sx={{ color: brand.goldDark, fontWeight: 600, flex: "none" }}>
          צפה בכל ההצעות
        </Button>
      </Box>

      {!ready ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : needsProfile ? (
        <EmptyState
          icon={<PersonAdd />}
          title="עוד לא יצרת פרופיל"
          description="כדי שנוכל להציע לך הצעות, צריך קודם למלא פרופיל קצר."
          actions={[{ label: "יצירת פרופיל", to: "/profile", icon: <PersonAdd /> }]}
        />
      ) : cards.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: "center" }}>
          <Typography sx={{ color: brand.mut }}>אין הצעות חדשות כרגע</Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))",
            gap: "clamp(12px, 1.3vw, 20px)",
          }}
        >
          {cards.map((card) => (
            <HomeSuggestionCard
              key={card.id}
              card={card}
              sending={sendingId === card.id}
              error={cardError.id === card.id ? cardError.message : ""}
              onOpen={() => navigate(suggestionHref({ kind: "new", id: card.id }))}
              onInterest={onInterest}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
