import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { ChevronLeft, PersonAddAlt1, Search } from "@mui/icons-material";
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
import AdminAvatar from "../components/admin/AdminAvatar.jsx";
import AdminHeading from "../components/admin/AdminHeading.jsx";
import AdminProfileDialog from "../components/admin/AdminProfileDialog.jsx";
import { CANDIDATE_STATUS, institutionLine } from "../components/admin/format.js";
import StatusPill from "../components/common/StatusPill.jsx";
import { openProtectedFile } from "../utils/protectedFile.js";
import { toSafeFileUrl } from "../utils/files.js";
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
const TABS = [
  { value: "", label: "הכל" },
  { value: "active", label: "פעילים" },
  { value: "in_process", label: "בתהליך" },
  { value: "engaged", label: "מאורסים" },
];

const inAge = (age, range) => {
  if (!range) return true;
  const [min, max] = range.split("-").map(Number);
  return age != null && age >= min && age <= max;
};

const matchesQuery = (user, query) => {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  const profile = user.profile || {};
  return [user.name, profile.city, profile.yeshiva, profile.seminar, profile.occupation]
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
    () => users.filter((user) => user.profile?.gender === gender),
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
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <AdminHeading
        title={title}
        subtitle={`${roster.length} רשומים · ${shown.length === 1 ? "מוצג אחד" : `${shown.length} מוצגים`}`}
        action={
          <Button variant="contained" startIcon={<PersonAddAlt1 />} onClick={() => { setAddError(""); setAddOpen(true); }}>
            הוספת מועמד/ת
          </Button>
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
          options={[
            { value: "", label: "סטטוס" },
            { value: "active", label: "פעיל/ה" },
            { value: "in_process", label: "בתהליך" },
            { value: "engaged", label: "מאורס/ת" },
          ]}
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
        <Paper sx={{ overflowX: "auto", p: "8px 8px 14px" }}>
          {shown.length === 0 ? (
            <Typography sx={{ color: brand.mut, textAlign: "center", py: 4 }}>
              {roster.length === 0 ? `אין ${title} רשומים` : "אין תוצאות לסינון הזה"}
            </Typography>
          ) : (
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  {["שם", "גיל", "עיר", "מוסד / עיסוק", "רזומה", "סטטוס", ""].map((heading) => (
                    <TableCell
                      key={heading || "go"}
                      sx={{ fontWeight: 600, fontSize: 13, color: brand.mut, borderColor: brand.line, textAlign: "start" }}
                    >
                      {heading}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {shown.map((user) => {
                  const tone = CANDIDATE_STATUS[user.status] || CANDIDATE_STATUS.active;
                  const resume = toSafeFileUrl(user.profile?.resumePdf);
                  return (
                    <TableRow
                      key={user._id}
                      hover
                      onClick={() => openProfile(user._id)}
                      sx={{ cursor: "pointer", "&:hover td": { bgcolor: brand.rowHover } }}
                    >
                      <TableCell sx={cellSx}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <AdminAvatar image={user.profile?.image} gender={gender} size={36} rounded="12px" />
                          <Typography sx={{ fontWeight: 600, color: brand.navy }}>{user.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={cellSx}>{user.profile?.age ?? "—"}</TableCell>
                      <TableCell sx={cellSx}>{user.profile?.city || "—"}</TableCell>
                      <TableCell sx={cellSx}>{institutionLine(user.profile)}</TableCell>
                      <TableCell sx={cellSx}>
                        {resume ? (
                          <Box
                            component="button"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openProtectedFile(resume);
                            }}
                            sx={{
                              border: 0,
                              background: "transparent",
                              color: brand.pillRedText,
                              fontWeight: 600,
                              fontSize: 13,
                              cursor: "pointer",
                              fontFamily: "inherit",
                            }}
                          >
                            PDF
                          </Box>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell sx={cellSx}>
                        <StatusPill tone={tone.tone} label={tone.label} icon={<StatusIcon Icon={tone.Icon} />} />
                      </TableCell>
                      <TableCell sx={{ ...cellSx, color: brand.goldDeep, width: 40 }}>
                        <ChevronLeft />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {filtered.length > 0 ? (
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
          ) : null}
        </Paper>
      )}

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
        revealIdentity
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

const cellSx = {
  borderColor: brand.line,
  color: brand.ink2,
  fontSize: 15,
  py: "9px",
};

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
