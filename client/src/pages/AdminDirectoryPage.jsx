import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { PersonAddAlt1, Search } from "@mui/icons-material";
import { pendingCopy } from "../copy/pendingCopy.js";
import { brand } from "../theme/tokens.js";
import { ethnicityOptions } from "../constants/profileOptions.js";
import {
  clearAdminProfile,
  fetchAdminUserProfile,
  fetchAdminUsers,
  selectAdminProfileError,
  selectAdminProfileLoading,
  selectAdminUserProfile,
  selectAdminUsers,
  selectAdminUsersError,
  selectAdminUsersLoading,
} from "../store/slices/adminSlice.js";
import AdminHeading from "../components/admin/AdminHeading.jsx";
import AdminProfileDialog from "../components/admin/AdminProfileDialog.jsx";
import PersonPreviewCard from "../components/admin/PersonPreviewCard.jsx";
import { CANDIDATE_STATUS } from "../components/admin/format.js";
import { DIRECTORY_TABS } from "../utils/caseStatus.js";
import StatusPill from "../components/common/StatusPill.jsx";
import { createAdminCandidate } from "../services/admin.service.js";
import AddCandidateDialog from "../components/admin/AddCandidateDialog.jsx";

const PAGE_SIZE = 8;
const AGE_RANGES = [
  { value: "", label: "גיל" },
  { value: "16-22", label: "16–22" },
  { value: "23-26", label: "23–26" },
  { value: "27-30", label: "27–30" },
  { value: "31-120", label: "31+" },
];
const TABS = DIRECTORY_TABS;
const STATUS_FILTERS = [{ value: "", label: "סטטוס" }, ...DIRECTORY_TABS.filter((tab) => tab.value)];

const inAge = (age, range) => {
  if (!range) return true;
  const [min, max] = range.split("-").map(Number);
  return age != null && age >= min && age <= max;
};

const matchesQuery = (user, query) => {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  const profile = user.profile || {};
  return [user.name, user.email, user.phone, profile.city, profile.yeshiva, profile.seminar, profile.occupation]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
};

export default function AdminDirectoryPage({ gender }) {
  const dispatch = useDispatch();
  const users = useSelector(selectAdminUsers);
  const loading = useSelector(selectAdminUsersLoading);
  const error = useSelector(selectAdminUsersError);
  const profile = useSelector(selectAdminUserProfile);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const profileError = useSelector(selectAdminProfileError);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const userParam = params.get("user") || "";
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pickedId, setPickedId] = useState("");
  const [hiddenUser, setHiddenUser] = useState("");
  const [seenGender, setSeenGender] = useState(gender);
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState("");

  if (seenGender !== gender) {
    setSeenGender(gender);
    setAge("");
    setCity("");
    setEthnicity("");
    setStatus("");
    setPage(1);
    setPickedId("");
  }

  const requestedId = pickedId || (userParam && userParam !== hiddenUser ? userParam : "");

  useEffect(() => {
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  useEffect(() => {
    if (requestedId) dispatch(fetchAdminUserProfile(requestedId));
  }, [requestedId, dispatch]);

  const roster = useMemo(
    () => users.filter((user) => (user.profile?.gender || user.gender) === gender),
    [users, gender]
  );

  const cities = useMemo(
    () => [...new Set(roster.map((user) => user.profile?.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, "he")),
    [roster]
  );

  const filtered = useMemo(
    () =>
      roster.filter((user) => {
        const profileRow = user.profile || {};
        if (!matchesQuery(user, query)) return false;
        if (!inAge(profileRow.age, age)) return false;
        if (city && profileRow.city !== city) return false;
        if (ethnicity && profileRow.ethnicity !== ethnicity) return false;
        if (status && user.status !== status) return false;
        return true;
      }),
    [roster, query, age, city, ethnicity, status]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const shown = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const title = gender === "female" ? "בחורות" : "בחורים";

  const openProfile = (userId) => {
    setHiddenUser("");
    setPickedId(userId);
  };

  const closeProfile = () => {
    setPickedId("");
    setHiddenUser(userParam);
    dispatch(clearAdminProfile());
    if (userParam) {
      const next = new URLSearchParams(params);
      next.delete("user");
      setParams(next, { replace: true });
    }
  };

  return (
    <Box>
      <AdminHeading
        title={title}
        subtitle={`${roster.length} רשומים · ${shown.length === 1 ? "מוצג אחד" : `${shown.length} מוצגים`}`}
        action={
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button component={RouterLink} to="/admin/members/new" variant="outlined">
              {pendingCopy.openAccount}
            </Button>
            <Button variant="contained" startIcon={<PersonAddAlt1 />} onClick={() => { setAddError(""); setAddOpen(true); }}>
              הוספת מועמד/ת
            </Button>
          </Box>
        }
      />

      {error || profileError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || profileError}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", mb: 2 }}>
        <TextField
          value={query}
          onChange={(event) => {
            const next = new URLSearchParams(params);
            const value = event.target.value;
            if (value) next.set("q", value);
            else next.delete("q");
            setParams(next, { replace: true });
            setPage(1);
          }}
          placeholder="חיפוש לפי שם, עיר או מוסד…"
          size="small"
          slotProps={{
            input: {
              startAdornment: <Search sx={{ color: brand.mut, mr: 1, fontSize: 18 }} />,
            },
          }}
          sx={{ flex: "1.5 1 220px", minWidth: 180 }}
        />
        <FilterSelect label="גיל" value={age} onChange={(value) => { setAge(value); setPage(1); }} options={AGE_RANGES} />
        <FilterSelect
          label="עיר"
          value={city}
          onChange={(value) => { setCity(value); setPage(1); }}
          options={[{ value: "", label: "עיר" }, ...cities.map((item) => ({ value: item, label: item }))]}
        />
        <FilterSelect
          label="עדה"
          value={ethnicity}
          onChange={(value) => { setEthnicity(value); setPage(1); }}
          options={[{ value: "", label: "עדה" }, ...ethnicityOptions]}
        />
        <FilterSelect
          label="סטטוס"
          value={status}
          onChange={(value) => { setStatus(value); setPage(1); }}
          options={STATUS_FILTERS}
        />
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        {TABS.map((tab) => {
          const on = status === tab.value;
          return (
            <Box
              key={tab.label}
              component="button"
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              sx={tabSx(on)}
            >
              {tab.value === "" ? `${tab.label} (${roster.length})` : tab.label}
            </Box>
          );
        })}
      </Box>

      {loading && users.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr", lg: "1fr 1fr 1fr 1fr" },
            gap: 2,
          }}
        >
          {shown.length === 0 ? (
            <Paper sx={{ p: 2, gridColumn: "1 / -1" }}>
              <Typography sx={{ color: brand.mut, textAlign: "center", py: 4 }}>
                {roster.length === 0 ? `אין ${title} רשומים` : "אין תוצאות לסינון הזה"}
              </Typography>
            </Paper>
          ) : (
            shown.map((user) => {
              const tone = CANDIDATE_STATUS[user.status];
              return (
                <PersonPreviewCard
                  key={user._id}
                  person={{ ...user, gender }}
                  onClick={() => openProfile(user._id)}
                  footer={
                    tone ? (
                      <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                        <StatusPill tone={tone.tone} label={tone.label} icon={<StatusIcon Icon={tone.Icon} />} />
                      </Box>
                    ) : null
                  }
                />
              );
            })
          )}
        </Box>
      )}

      {!loading || users.length > 0 ? (
        filtered.length > 0 ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, pt: 1.25 }}>
              <Typography sx={{ color: brand.mut, fontSize: 14 }}>
                עמוד {safePage} מתוך {pageCount}
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              {Array.from({ length: pageCount }, (_, index) => index + 1)
                .filter((number) => number === 1 || number === pageCount || Math.abs(number - safePage) <= 1)
                .map((number, index, list) => {
                  const previous = list[index - 1];
                  const gap = previous && number - previous > 1;
                  return (
                    <Box key={number} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      {gap ? <Typography sx={{ color: brand.mut }}>…</Typography> : null}
                      <Box component="button" type="button" onClick={() => setPage(number)} sx={pageSx(number === safePage)}>
                        {number}
                      </Box>
                    </Box>
                  );
                })}
            </Box>
          ) : null
      ) : null}

      <AddCandidateDialog
        open={addOpen}
        gender={gender}
        error={addError}
        onClose={() => setAddOpen(false)}
        onSubmit={async (payload) => {
          setAddError("");
          try {
            await createAdminCandidate(payload);
            setAddOpen(false);
            dispatch(fetchAdminUsers());
          } catch (err) {
            setAddError(err?.message || "לא הצלחנו להוסיף מועמד");
          }
        }}
      />

      <AdminProfileDialog
        open={Boolean(requestedId)}
        onClose={closeProfile}
        data={profile}
        loading={profileLoading}
      />
    </Box>
  );
}

function StatusIcon({ Icon }) {
  return Icon ? <Icon /> : null;
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <Select
      value={value}
      displayEmpty
      size="small"
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      sx={{ flex: "1 1 140px", minWidth: 120, bgcolor: brand.paper }}
    >
      {options.map((option) => (
        <MenuItem key={option.value || option.label} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </Select>
  );
}

const tabSx = (on) => ({
  border: `1px solid ${on ? brand.gold : brand.inputLine}`,
  background: on ? brand.tabOn : brand.paper,
  color: on ? brand.goldText : brand.navy,
  borderRadius: "10px",
  padding: "9px 18px",
  fontWeight: 600,
  fontSize: 14,
  fontFamily: "inherit",
  cursor: "pointer",
});

const pageSx = (on) => ({
  width: 34,
  height: 34,
  borderRadius: "10px",
  border: `1px solid ${on ? brand.navy : brand.inputLine}`,
  background: on ? brand.navy : brand.paper,
  color: on ? brand.goldLight : brand.navy,
  fontWeight: 600,
  fontFamily: "inherit",
  cursor: "pointer",
});
