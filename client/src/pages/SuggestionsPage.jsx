import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  CircularProgress,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { Close, DoNotDisturb, PersonAdd, Search, SearchOff } from "@mui/icons-material";
import MatchCard from "../components/match/MatchCard.jsx";
import InterestCard from "../components/interest/InterestCard.jsx";
import EmptyState from "../components/common/EmptyState.jsx";
import useSuggestions from "../hooks/useSuggestions.js";
import { brand } from "../theme/tokens.js";
import { filterSuggestions, suggestionHref } from "../utils/suggestionView.js";

const TABS = [
  { id: "all", label: "הכל" },
  { id: "new", label: "חדשות" },
  { id: "sent", label: "נשלחו" },
  { id: "received", label: "התקבלו" },
];

const AGE_OPTIONS = [
  { value: "18-22", label: "18–22" },
  { value: "23-26", label: "23–26" },
  { value: "27-30", label: "27–30" },
  { value: "31+", label: "31+" },
];

const PERCENT_OPTIONS = [
  { value: "90", label: "90% ומעלה" },
  { value: "80", label: "80% ומעלה" },
  { value: "70", label: "70% ומעלה" },
];

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    height: 46,
    borderRadius: "10px",
    bgcolor: brand.paper,
    color: brand.ink2,
  },
};

const DECLINED_TEXT = "הצעה אחת נדחתה והוסרה מהרשימה";

export default function SuggestionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, loading, matchesError, interestsError, needsProfile, preview, offline, onSent, onDeclined, onAccepted } =
    useSuggestions();
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [percent, setPercent] = useState("");
  const [localNotice, setLocalNotice] = useState("");
  const [seenDecline, setSeenDecline] = useState(null);
  const declineStamp = location.state?.declinedStamp ?? null;
  const notice = localNotice || (declineStamp && declineStamp !== seenDecline ? DECLINED_TEXT : "");

  const cities = useMemo(() => {
    const names = items.map((item) => item.view.city).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, "he"));
  }, [items]);

  const filtered = useMemo(
    () => filterSuggestions(items, { query, city, age, percent }),
    [items, query, city, age, percent]
  );

  const counts = {
    all: filtered.length,
    new: filtered.filter((item) => item.kind === "new").length,
    sent: filtered.filter((item) => item.kind === "sent").length,
    received: filtered.filter((item) => item.kind === "received").length,
  };

  const shown = tab === "all" ? filtered : filtered.filter((item) => item.kind === tab);
  const reservePercent = shown.some((item) => item.view.percent != null);
  const error = matchesError || interestsError;

  const dismissNotice = () => {
    setLocalNotice("");
    setSeenDecline(declineStamp);
  };

  const handleDeclined = (interest) => {
    onDeclined(interest);
    setLocalNotice(DECLINED_TEXT);
  };

  const renderBody = () => {
    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (needsProfile && items.length === 0) {
      return (
        <EmptyState
          icon={<PersonAdd />}
          title="עוד לא יצרת פרופיל"
          description="כדי שנוכל להציע לך הצעות, צריך קודם למלא פרופיל קצר."
          actions={[{ label: "יצירת פרופיל", to: "/profile", icon: <PersonAdd /> }]}
        />
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          icon={<SearchOff />}
          title="אין הצעות כרגע"
          description="הצעות חדשות, התעניינות שנשלחה והתעניינות שהתקבלה יופיעו כאן. הצעה שנדחתה יורדת מהרשימה."
        />
      );
    }

    if (shown.length === 0) {
      return (
        <EmptyState
          icon={<SearchOff />}
          title="אין הצעות שתואמות לסינון"
          description="אפשר לנקות את החיפוש או לבחור לשונית אחרת."
        />
      );
    }

    return shown.map((item) =>
      item.kind === "new" ? (
        <MatchCard
          key={`new-${item.id}`}
          match={item.match}
          view={item.view}
          variant="row"
          offline={offline}
          reservePercent={reservePercent}
          onOpen={() => navigate(suggestionHref(item, preview))}
          onSent={onSent}
        />
      ) : (
        <InterestCard
          key={`${item.kind}-${item.id}`}
          interest={item.interest}
          type={item.kind === "received" ? "incoming" : "outgoing"}
          view={item.view}
          variant="row"
          offline={offline}
          reservePercent={reservePercent}
          onOpen={() => navigate(suggestionHref(item, preview))}
          onDeclined={handleDeclined}
          onAccepted={onAccepted}
        />
      )
    );
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
          הצעות
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 17 }}>
          הצעות חדשות והתעניינויות שעדיין לא אושרו הדדית
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: "10px", mb: "18px", flexWrap: "wrap" }}>
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="חיפוש..."
          sx={{ ...fieldSx, flex: "1.5 1 180px", minWidth: 180 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 16, color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
        />
        <FilterSelect
          label="מיקום"
          value={city}
          onChange={setCity}
          options={cities.map((name) => ({ value: name, label: name }))}
          sx={{ flex: "1 1 140px" }}
        />
        <FilterSelect label="גיל" value={age} onChange={setAge} options={AGE_OPTIONS} sx={{ flex: "1 1 140px" }} />
        <FilterSelect
          label="אחוז התאמה"
          value={percent}
          onChange={setPercent}
          options={PERCENT_OPTIONS}
          sx={{ flex: "1 1 160px" }}
        />
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: "22px" }}>
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <Box
              key={item.id}
              component="button"
              type="button"
              onClick={() => setTab(item.id)}
              aria-pressed={selected}
              sx={{
                borderRadius: "10px",
                px: "18px",
                py: "9px",
                font: "inherit",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                border: "1px solid",
                borderColor: selected ? brand.gold : brand.inputLine,
                bgcolor: selected ? brand.tabOn : brand.paper,
                color: selected ? brand.goldText : brand.navy,
              }}
            >
              {item.label} ({counts[item.id]})
            </Box>
          );
        })}
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

function FilterSelect({ label, value, onChange, options, sx }) {
  const current = options.find((option) => option.value === value);
  return (
    <TextField
      select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ ...fieldSx, minWidth: 140, ...sx }}
      slotProps={{
        select: {
          displayEmpty: true,
          renderValue: () => current?.label || label,
        },
      }}
    >
      <MenuItem value="">{label}</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
