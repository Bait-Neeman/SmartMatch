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
  Menu,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { brand } from "../theme/tokens.js";
import {
  clearAdminProfile,
  fetchAdminCases,
  fetchAdminUserProfile,
  saveAdminCase,
  selectAdminCases,
  selectAdminCasesError,
  selectAdminCasesLoading,
  selectAdminProfileError,
  selectAdminProfileLoading,
  selectAdminRevealIdentity,
  selectAdminUserProfile,
} from "../store/slices/adminSlice.js";
import AdminHeading from "../components/admin/AdminHeading.jsx";
import AdminProfileDialog from "../components/admin/AdminProfileDialog.jsx";
import { CaseCard } from "../components/admin/CaseWidgets.jsx";
import { CASE_STATUS } from "../components/admin/format.js";
import { openProtectedFile } from "../utils/protectedFile.js";
import { toSafeFileUrl } from "../utils/files.js";

const TABS = [
  { value: "", label: "הכל" },
  { value: "new", label: "חדשות" },
  { value: "in_progress", label: "בתהליך" },
  { value: "closed", label: "נסגרו" },
];

export default function AdminCasesPage() {
  const dispatch = useDispatch();
  const cases = useSelector(selectAdminCases);
  const loading = useSelector(selectAdminCasesLoading);
  const error = useSelector(selectAdminCasesError);
  const reveal = useSelector(selectAdminRevealIdentity);
  const profile = useSelector(selectAdminUserProfile);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const profileError = useSelector(selectAdminProfileError);
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const focus = params.get("case") || "";
  const query = (params.get("q") || "").trim().toLowerCase();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [noteFor, setNoteFor] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminCases());
  }, [dispatch]);

  const counts = useMemo(
    () => ({
      "": cases.length,
      new: cases.filter((item) => item.status === "new").length,
      in_progress: cases.filter((item) => item.status === "in_progress").length,
      closed: cases.filter((item) => item.status === "closed").length,
    }),
    [cases]
  );

  const visible = cases.filter((item) => {
    if (status && item.status !== status) return false;
    if (!query) return true;
    return [item.sender?.name, item.receiver?.name, item.caseNumber, item.sender?.city, item.receiver?.city]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  useEffect(() => {
    if (!focus || loading) return undefined;
    document.getElementById(`case-${focus}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return undefined;
  }, [focus, loading, visible.length]);

  const setStatus = (value) => {
    const next = new URLSearchParams(params);
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
      <AdminHeading title="הצעות בטיפול" subtitle="הצעות ששני הצדדים העבירו לטיפולך" />

      {error || profileError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || profileError}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
        {TABS.map((tab) => {
          const on = status === tab.value;
          return (
            <Box key={tab.label} component="button" type="button" onClick={() => setStatus(tab.value)} sx={tabSx(on)}>
              {tab.label} ({counts[tab.value] || 0})
            </Box>
          );
        })}
      </Box>

      {loading && cases.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : visible.length === 0 ? (
        <Typography sx={{ color: brand.mut, py: 4, textAlign: "center" }}>
          {cases.length === 0 ? "אין הצעות שהועברו לטיפול" : "אין תיקים בלשונית הזו"}
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
              reveal={reveal}
              focused={focus === String(item._id)}
              onProfile={openProfile}
              onResume={(url) => openProtectedFile(toSafeFileUrl(url))}
              onNote={(current) => {
                setNoteFor(current);
                setNote(current.note || "");
              }}
              onStatus={(current, anchor) => setMenu({ anchor, item: current })}
            />
          ))}
        </Box>
      )}

      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {Object.entries(CASE_STATUS).map(([value, meta]) => (
          <MenuItem
            key={value}
            selected={menu?.item?.status === value}
            disabled={saving}
            onClick={() => {
              const id = menu.item._id;
              setMenu(null);
              save(id, { status: value });
            }}
          >
            {meta.label}
          </MenuItem>
        ))}
      </Menu>

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
        revealIdentity={reveal}
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
