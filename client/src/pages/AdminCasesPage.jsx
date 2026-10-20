import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
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
import { CaseDetailDialog, CasePreview } from "../components/admin/CaseWidgets.jsx";
import {
  ADMIN_CASE_TABS,
  countByTab,
  groupFromCaseQuery,
  matchesAdminCaseTab,
} from "../utils/caseStatus.js";

export default function AdminCasesPage() {
  const dispatch = useDispatch();
  const suggestions = useSelector(selectAdminSuggestions);
  const loading = useSelector(selectAdminCasesLoading);
  const error = useSelector(selectAdminCasesError);
  const profile = useSelector(selectAdminUserProfile);
  const profileLoading = useSelector(selectAdminProfileLoading);
  const profileError = useSelector(selectAdminProfileError);
  const [params, setParams] = useSearchParams();
  const group = groupFromCaseQuery({
    group: params.get("group") || "",
    stage: params.get("stage") || "",
    status: params.get("status") || "",
  });
  const focus = params.get("case") || "";
  const query = (params.get("q") || "").trim().toLowerCase();
  const [profileOpen, setProfileOpen] = useState(false);
  const [openId, setOpenId] = useState(focus);
  const [seenFocus, setSeenFocus] = useState(focus);
  const [saving, setSaving] = useState(false);
  if (focus !== seenFocus) {
    setSeenFocus(focus);
    setOpenId(focus);
  }

  useEffect(() => {
    dispatch(fetchAdminCases());
  }, [dispatch]);

  const counts = useMemo(
    () => countByTab(suggestions, ADMIN_CASE_TABS, matchesAdminCaseTab),
    [suggestions]
  );

  const visible = suggestions.filter((item) => {
    if (!matchesAdminCaseTab(item, group)) return false;
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

  const closeCase = () => {
    setOpenId("");
    if (!params.get("case")) return;
    const next = new URLSearchParams(params);
    next.delete("case");
    setParams(next, { replace: true });
  };

  const setGroup = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set("group", value);
    else next.delete("group");
    next.delete("stage");
    next.delete("status");
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
        subtitle="תצוגה מקדימה של תמונה, שם, מוסד, גיל ועיר. היסטוריה ופרטים נפתחים בלחיצה"
      />

      {error || profileError ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || profileError}
        </Alert>
      ) : null}

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2.5 }}>
        {ADMIN_CASE_TABS.map((tab) => {
          const on = group === tab.value;
          return (
            <Box key={tab.value || "all"} component="button" type="button" onClick={() => setGroup(tab.value)} sx={tabSx(on)}>
              {tab.label} ({counts[tab.value] || 0})
            </Box>
          );
        })}
      </Box>

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
            <CasePreview
              key={item._id}
              item={item}
              reveal
              focused={focus === String(item._id)}
              onOpen={(current) => setOpenId(String(current._id))}
            />
          ))}
        </Box>
      )}

      <CaseDetailDialog
        item={suggestions.find((item) => String(item._id) === String(openId)) || null}
        open={Boolean(openId)}
        onClose={closeCase}
        reveal
        onProfile={openProfile}
        onSave={save}
        saving={saving}
      />

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
