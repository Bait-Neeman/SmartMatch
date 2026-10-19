import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { brand } from "../theme/tokens.js";
import {
  clearAdminProfile,
  fetchAdminCases,
  fetchAdminUserProfile,
  saveAdminCase,
  selectAdminCasesError,
  selectAdminCasesLoading,
  selectAdminProfileError,
  selectAdminProfileLoading,
  selectAdminSuggestions,
  selectAdminUserProfile,
} from "../store/slices/adminSlice.js";
import AdminHeading from "../components/admin/AdminHeading.jsx";
import AdminProfileDialog from "../components/admin/AdminProfileDialog.jsx";
import { CaseCard } from "../components/admin/CaseWidgets.jsx";
import { SUGGESTION_STAGE } from "../components/admin/format.js";
import { openProtectedFile } from "../utils/protectedFile.js";
import { toSafeFileUrl } from "../utils/files.js";
import { CASE_WORK_TABS, isFinalCase } from "../utils/caseStatus.js";

const STAGE_TABS = [
  { value: "", label: "הכל" },
  ...Object.entries(SUGGESTION_STAGE).map(([value, meta]) => ({ value, label: meta.label })),
];

const CONFIRM_COPY = {
  ended: {
    title: "לסמן שהשידוך ירד?",
    body: "שני הצדדים יחזרו להיות פנויים להצעות חדשות, ולא יוצעו שוב זה לזה.",
  },
  engaged: {
    title: "לסמן שהתארסו?",
    body: "שני הצדדים יוצגו כמאורסים ולא יוצעו יותר לאף אחד.",
  },
  coordinating: {
    title: "לעדכן את שלב התיק?",
    body: "התיק יסומן כבתיאום פגישה.",
  },
  nextMeeting: {
    title: "לעדכן את שלב התיק?",
    body: "התיק יחזור לטיפול, והשלב הבא יהיה פגישה.",
  },
};

export default function AdminCasesPage() {
  const dispatch = useDispatch();
  const suggestions = useSelector(selectAdminSuggestions);
  const loading = useSelector(selectAdminCasesLoading);
  const error = useSelector(selectAdminCasesError);
  const profile = useSelector(selectAdminUserProfile);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const profileError = useSelector(selectAdminProfileError);
  const [params, setParams] = useSearchParams();
  const requestedStatus = params.get("status") || "";
  const stage = params.get("stage") ?? (requestedStatus ? "matchmaker" : "");
  const status = stage === "matchmaker" ? requestedStatus : "";
  const focus = params.get("case") || "";
  const query = (params.get("q") || "").trim().toLowerCase();
  const [profileOpen, setProfileOpen] = useState(false);
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    dispatch(fetchAdminCases());
  }, [dispatch]);

  const counts = useMemo(() => {
    const byStage = { "": suggestions.length };
    for (const key of Object.keys(SUGGESTION_STAGE)) {
      byStage[key] = suggestions.filter((item) => item.stage === key).length;
    }
    return byStage;
  }, [suggestions]);

  const workCounts = useMemo(() => {
    const openCases = suggestions.filter((item) => item.stage === "matchmaker");
    const counts = { "": openCases.length };
    for (const tab of CASE_WORK_TABS) {
      if (!tab.value) continue;
      counts[tab.value] = openCases.filter((item) => item.status === tab.value).length;
    }
    return counts;
  }, [suggestions]);

  const visible = suggestions.filter((item) => {
    if (stage && item.stage !== stage) return false;
    if (status && item.status !== status) return false;
    if (!query) return true;
    return [
      item.sender?.name,
      item.receiver?.name,
      item.sender?.email,
      item.receiver?.email,
      item.sender?.phone,
      item.receiver?.phone,
      item.caseNumber,
      item.sender?.city,
      item.receiver?.city,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  useEffect(() => {
    if (!focus || loading) return undefined;
    document.getElementById(`case-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return undefined;
  }, [focus, loading, visible.length]);

  const setStage = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set("stage", value);
    else next.delete("stage");
    next.delete("status");
    setParams(next, { replace: true });
  };

  const setStatus = (value) => {
    const next = new URLSearchParams(params);
    next.set("stage", "matchmaker");
    if (value) next.set("status", value);
    else next.delete("status");
    setParams(next, { replace: true });
  };

  const openProfile = (userId) => {
    setProfileOpen(true);
    dispatch(fetchAdminUserProfile(userId));
  };

  const closeProfile = () => {
    setProfileOpen(false);
    dispatch(clearAdminProfile());
  };

  const save = async (id, payload) => {
    setSaving(true);
    try {
      await dispatch(saveAdminCase({ id, ...payload })).unwrap();
    } catch {
      // The slice keeps the server message.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <AdminHeading
        title="הצעות"
        subtitle="כל שלב, כולל נדחו. שם, קשר, תמונה ורזומה של שני הצדדים גלויים"
      />

      {error || profileError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || profileError}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
        {STAGE_TABS.map((tab) => {
          const on = stage === tab.value;
          return (
            <Box key={tab.value || "all"} component="button" type="button" onClick={() => setStage(tab.value)} sx={tabSx(on)}>
              {tab.label} ({counts[tab.value] || 0})
            </Box>
          );
        })}
      </Box>

      {stage === "matchmaker" ? (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
          {CASE_WORK_TABS.map((tab) => {
            const on = status === tab.value;
            return (
              <Box key={tab.label} component="button" type="button" onClick={() => setStatus(tab.value)} sx={tabSx(on)}>
                {tab.label} ({workCounts[tab.value] || 0})
              </Box>
            );
          })}
        </Box>
      ) : null}

      {loading && suggestions.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : visible.length === 0 ? (
        <Typography sx={{ color: brand.mut, py: 4, textAlign: "center" }}>
          {suggestions.length === 0 ? "אין הצעות להצגה" : "אין הצעות בלשונית הזו"}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 470px), 1fr))",
            gap: "20px",
          }}
        >
          {visible.map((item) => (
            <CaseCard
              key={item._id}
              item={item}
              reveal
              focused={focus === String(item._id)}
              onProfile={openProfile}
              onResume={(url) => openProtectedFile(toSafeFileUrl(url))}
              onNote={(current) => {
                setNoteFor(current);
                setNote(current.note || "");
              }}
              onAction={(current, action) => {
                if (action === "ended" || action === "engaged" || isFinalCase(current.status)) {
                  setConfirm({ item: current, action });
                  return;
                }
                save(current._id, { action });
              }}
            />
          ))}
        </Box>
      )}

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{CONFIRM_COPY[confirm?.action]?.title || "לעדכן את שלב התיק?"}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: brand.ink2 }}>{CONFIRM_COPY[confirm?.action]?.body}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ביטול</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={async () => {
              const pending = confirm;
              setConfirm(null);
              if (pending?.item?._id) await save(pending.item._id, { action: pending.action });
            }}
          >
            אישור
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(noteFor)} onClose={() => setNoteFor(null)} maxWidth="xs" fullWidth>
        <DialogTitle>הערה לתיק</DialogTitle>
        <DialogContent>
          <TextField
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={3}
            fullWidth
            placeholder="מה סוכם בטיפול?"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoteFor(null)}>ביטול</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={async () => {
              const id = noteFor._id;
              await save(id, { note });
              setNoteFor(null);
            }}
          >
            שמירה
          </Button>
        </DialogActions>
      </Dialog>

      <AdminProfileDialog
        open={profileOpen}
        onClose={closeProfile}
        data={profile}
        loading={profileLoading}
      />
    </Box>
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
