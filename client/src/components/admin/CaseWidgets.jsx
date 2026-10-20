import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { AutoAwesome, CalendarMonth, FolderOutlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { brand } from "../../theme/tokens.js";
import StatusPill from "../common/StatusPill.jsx";
import PersonPreviewCard from "./PersonPreviewCard.jsx";
import { isFinalCase, nextMeetingCaption, normalizeCaseStatus, suggestionGroup } from "../../utils/caseStatus.js";
import { EMPTY_NOTE, caseBadge, formatDotDate, formatHistoryWhen, historyWho } from "./format.js";

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

export function MatchMark() {
  return (
    <Box
      aria-hidden
      sx={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        bgcolor: brand.tabOn,
        color: brand.goldDeep,
        flex: "none",
      }}
    >
      <AutoAwesome sx={{ fontSize: 16 }} />
    </Box>
  );
}

function PersonSide({ party, reveal = true, onProfile, compact = false }) {
  return (
    <Box sx={{ flex: compact ? "1 1 160px" : "1 1 200px", minWidth: 0, maxWidth: compact ? 240 : 280 }}>
      <PersonPreviewCard
        person={party}
        reveal={reveal}
        compact={compact}
        onClick={onProfile && party?._id ? () => onProfile(party._id) : undefined}
      />
    </Box>
  );
}

export function CaseStrip({ item, reveal = true, onProfile }) {
  const badge = caseBadge(item);
  const group = suggestionGroup(item);
  return (
    <Paper
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        px: { xs: "14px", sm: "22px" },
        py: "16px",
        mb: 1.5,
      }}
    >
      {badge ? <StatusPill tone={badge.tone} label={badge.label} icon={<StatusIcon Icon={badge.Icon} />} /> : null}
      <PersonSide party={item.sender} reveal={reveal} onProfile={onProfile} compact />
      <MatchMark />
      <PersonSide party={item.receiver} reveal={reveal} onProfile={onProfile} compact />
      <Box sx={{ flexGrow: 1 }} />
      <Typography sx={{ display: "flex", alignItems: "center", gap: 0.75, color: brand.mut, fontSize: 14, width: 120 }}>
        <CalendarMonth sx={{ fontSize: 15 }} />
        {formatDotDate(item.transferredAt)}
      </Typography>
      <Button
        component={RouterLink}
        to={`/admin/cases?case=${item._id}${group ? `&group=${group}` : ""}`}
        variant="contained"
        size="small"
        startIcon={<FolderOutlined />}
      >
        פתח תיק
      </Button>
    </Paper>
  );
}

function PairRow({ item, reveal, onProfile, compact = false }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        my: 2,
        p: "18px",
        borderRadius: "14px",
        bgcolor: brand.background,
        flexWrap: "wrap",
      }}
    >
      <PersonSide party={item.sender} reveal={reveal} onProfile={onProfile} compact={compact} />
      <MatchMark />
      <PersonSide party={item.receiver} reveal={reveal} onProfile={onProfile} compact={compact} />
    </Box>
  );
}

// List preview: photo, name, institution, age, and city for each side, plus the current status.
export function CasePreview({ item, reveal = true, focused = false, onOpen }) {
  const badge = caseBadge(item);
  return (
    <Paper
      id={`case-${item._id}`}
      component="button"
      type="button"
      onClick={() => onOpen(item)}
      sx={{
        p: "22px",
        width: "100%",
        textAlign: "start",
        font: "inherit",
        color: "inherit",
        cursor: "pointer",
        borderColor: focused ? brand.gold : brand.line,
        boxShadow: focused ? brand.cardShadow : undefined,
        "&:hover": { borderColor: brand.rowHoverBorder, boxShadow: brand.rowHoverShadow },
      }}
    >
      {badge ? (
        <StatusPill tone={badge.tone} label={badge.label} icon={<StatusIcon Icon={badge.Icon} />} />
      ) : null}
      <PairRow item={item} reveal={reveal} compact />
    </Paper>
  );
}

export function CaseDetailDialog({ item, open, onClose, reveal = true, onProfile, onSave, saving = false }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(null);
  const manageable = Boolean(item) && (item.manageable === true || item.stage === "matchmaker");
  const badge = item ? caseBadge(item) : null;
  const status = normalizeCaseStatus(item?.status);

  const save = async (payload) => {
    if (!item?._id || !onSave) return;
    await onSave(item._id, payload);
  };

  const ask = (action) => {
    if (action === "ended" || action === "engaged" || isFinalCase(item?.status)) {
      setConfirm(action);
      return;
    }
    save({ action });
  };

  return (
    <>
      <Dialog open={open && Boolean(item)} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: brand.navy, fontWeight: 600 }}>
          {manageable ? `תיק #${item.caseNumber || ""}` : "פרטי הצעה"}
        </DialogTitle>
        <DialogContent>
          {item ? (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 1 }}>
                {badge ? (
                  <StatusPill tone={badge.tone} label={badge.label} icon={<StatusIcon Icon={badge.Icon} />} />
                ) : null}
                {item.transferredAt ? (
                  <Typography sx={{ display: "flex", alignItems: "center", gap: 0.75, color: brand.mut, fontSize: 13 }}>
                    <CalendarMonth sx={{ fontSize: 14 }} />
                    {manageable ? `הועבר ${formatDotDate(item.transferredAt)}` : formatDotDate(item.transferredAt)}
                  </Typography>
                ) : null}
              </Box>

              <PairRow item={item} reveal={reveal} onProfile={onProfile} />

              {manageable ? (
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.25,
                    alignItems: "flex-start",
                    p: "12px 14px",
                    borderRadius: "12px",
                    bgcolor: brand.pillGoldBg,
                    color: brand.goldText,
                    fontSize: 14,
                  }}
                >
                  <AutoAwesome sx={{ fontSize: 16, color: brand.goldDeep, mt: "2px" }} />
                  <span>{item.note || EMPTY_NOTE}</span>
                </Box>
              ) : null}

              {manageable ? <CaseHistory history={item.history} /> : null}
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, pb: 2 }}>
          {manageable ? (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setNote(item.note || "");
                  setNoteOpen(true);
                }}
              >
                הוסף הערה
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={saving || status === "coordinating"}
                onClick={() => ask("coordinating")}
              >
                בתיאום פגישה
              </Button>
              <Button
                variant="contained"
                size="small"
                disabled={saving || (status === "meeting" && Number(item.meetingNumber) >= 99)}
                onClick={() => ask("nextMeeting")}
              >
                {nextMeetingCaption(item.status, item.meetingNumber)}
              </Button>
              <Button variant="outlined" size="small" disabled={saving || status === "ended"} onClick={() => ask("ended")}>
                השידוך ירד
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={saving || status === "engaged"}
                onClick={() => ask("engaged")}
              >
                התארסו
              </Button>
            </>
          ) : null}
          <Box sx={{ flexGrow: 1 }} />
          <Button onClick={onClose}>סגירה</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirm)} onClose={() => setConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{CONFIRM_COPY[confirm]?.title || "לעדכן את שלב התיק?"}</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: brand.ink2 }}>{CONFIRM_COPY[confirm]?.body}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>ביטול</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={async () => {
              const action = confirm;
              setConfirm(null);
              if (action) await save({ action });
            }}
          >
            אישור
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="xs" fullWidth>
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
          <Button onClick={() => setNoteOpen(false)}>ביטול</Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={async () => {
              await save({ note });
              setNoteOpen(false);
            }}
          >
            שמירה
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function CaseHistory({ history }) {
  if (!history?.length) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography sx={{ color: brand.navy, fontWeight: 600, fontSize: 14, mb: 0.75 }}>היסטוריית סטטוס</Typography>
      {history.map((entry, index) => (
        <Typography key={`${entry.changedAt || index}-${entry.status}-${index}`} sx={{ color: brand.ink2, fontSize: 13, mb: 0.25 }}>
          {formatHistoryWhen(entry.changedAt)} · {entry.label} · {historyWho(entry)}
        </Typography>
      ))}
    </Box>
  );
}

function StatusIcon({ Icon }) {
  return Icon ? <Icon /> : null;
}

