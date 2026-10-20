import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import {
  clearAdminProfile,
  fetchAdminUserProfile,
  fetchPendingMatches,
  saveAdminCase,
  selectAdminPendingMatches,
  selectAdminPendingMatchesError,
  selectAdminPendingMatchesLoading,
  selectAdminProfileError,
  selectAdminProfileLoading,
  selectAdminUserProfile,
} from "../store/slices/adminSlice.js";
import { brand } from "../theme/tokens.js";
import { CaseDetailDialog, CasePreview } from "../components/admin/CaseWidgets.jsx";
import AdminProfileDialog from "../components/admin/AdminProfileDialog.jsx";
import { MATCHMAKER_CASE_TABS, countByTab, matchesMatchmakerTab } from "../utils/caseStatus.js";

const personId = (person) => {
  const id = person?._id || person?.id;
  return id ? String(id) : "";
};

// Both sides forwarded. Anything else stays off this page, even if the list includes it.
const isMatchmakerCase = (match) =>
  match?.stage === "matchmaker" &&
  match?.senderApprovedToManager === true &&
  match?.receiverApprovedToManager === true;

export default function AdminMatchmakerPage() {
  const dispatch = useDispatch();
  const matches = useSelector(selectAdminPendingMatches);
  const loading = useSelector(selectAdminPendingMatchesLoading);
  const error = useSelector(selectAdminPendingMatchesError);
  const selectedProfile = useSelector(selectAdminUserProfile);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const profileError = useSelector(selectAdminProfileError);
  const [group, setGroup] = useState("");
  const [openId, setOpenId] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    dispatch(fetchPendingMatches());
  }, [dispatch]);

  const cases = useMemo(() => matches.filter(isMatchmakerCase), [matches]);
  const counts = useMemo(() => countByTab(cases, MATCHMAKER_CASE_TABS, matchesMatchmakerTab), [cases]);
  const visible = cases.filter((item) => matchesMatchmakerTab(item, group));
  const selected = cases.find((item) => String(item._id) === String(openId)) || null;

  const openProfile = (userId) => {
    const id = personId({ _id: userId });
    if (!id) return;
    setProfileOpen(true);
    setMessage("");
    dispatch(fetchAdminUserProfile(id));
  };

  const save = async (id, payload) => {
    setSaving(true);
    try {
      await dispatch(saveAdminCase({ id, ...payload })).unwrap();
      setMessage("");
    } catch (err) {
      setMessage(typeof err === "string" ? err : err?.message || "לא הצלחנו לעדכן את התיק");
    } finally {
      setSaving(false);
    }
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
          הצעות בטיפול
        </Typography>
        <Typography sx={{ mt: 0.75, color: "text.secondary", fontSize: 17 }}>
          תיקים ששני הצדדים העבירו. הסטטוס, ההיסטוריה והעדכון נפתחים בלחיצה
        </Typography>
      </Box>

      {message || profileError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {message || profileError}
        </Alert>
      ) : null}

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? null : (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: "22px" }}>
            {MATCHMAKER_CASE_TABS.map((tab) => {
              const on = group === tab.value;
              return (
                <Box
                  key={tab.value || "all"}
                  component="button"
                  type="button"
                  onClick={() => setGroup(tab.value)}
                  sx={{
                    borderRadius: "10px",
                    px: "18px",
                    py: "9px",
                    fontWeight: 600,
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: on ? brand.gold : brand.inputLine,
                    bgcolor: on ? brand.tabOn : brand.paper,
                    color: on ? brand.goldText : brand.navy,
                  }}
                >
                  {tab.label} ({counts[tab.value] || 0})
                </Box>
              );
            })}
          </Box>

          {visible.length === 0 ? (
            <Typography>
              {cases.length === 0 ? "אין הצעות ששני הצדדים העבירו לטיפולך" : "אין תיקים בלשונית הזו"}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 470px), 1fr))",
                gap: "20px",
              }}
            >
              {visible.map((match) => (
                <CasePreview
                  key={match._id || `${personId(match.sender)}-${personId(match.receiver)}`}
                  item={match}
                  onOpen={(current) => setOpenId(String(current._id))}
                />
              ))}
            </Box>
          )}
        </>
      )}

      {profileLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      <CaseDetailDialog
        item={selected}
        open={Boolean(openId)}
        onClose={() => setOpenId("")}
        onProfile={openProfile}
        onSave={save}
        saving={saving}
      />

      <AdminProfileDialog
        open={profileOpen}
        onClose={() => {
          setProfileOpen(false);
          dispatch(clearAdminProfile());
        }}
        data={selectedProfile}
        loading={profileLoading}
      />
    </Box>
  );
}
