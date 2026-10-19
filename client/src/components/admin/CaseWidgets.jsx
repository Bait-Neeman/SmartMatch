import { Box, Button, Paper, Typography } from "@mui/material";
import { AutoAwesome, CalendarMonth, FolderOutlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { brand } from "../../theme/tokens.js";
import StatusPill from "../common/StatusPill.jsx";
import PersonPreviewCard from "./PersonPreviewCard.jsx";
import { nextMeetingCaption } from "../../utils/caseStatus.js";
import {
  EMPTY_NOTE,
  SUGGESTION_STAGE,
  casePill,
  formatDotDate,
  formatHistoryWhen,
  historyWho,
} from "./format.js";

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
  const stage = SUGGESTION_STAGE[item.stage];
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
      {stage ? <StatusPill tone={stage.tone} label={stage.label} /> : null}
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
        to={`/admin/cases?case=${item._id}${item.stage ? `&stage=${item.stage}` : ""}`}
        variant="contained"
        size="small"
        startIcon={<FolderOutlined />}
      >
        פתח תיק
      </Button>
    </Paper>
  );
}

export function CaseCard({ item, reveal = true, focused = false, onProfile, onNote, onAction }) {
  const tone = casePill(item.status, item.meetingNumber);
  const stage = SUGGESTION_STAGE[item.stage];
  const manageable = item.manageable === true || item.stage === "matchmaker";

  return (
    <Paper
      id={`case-${item._id}`}
      sx={{
        p: "22px",
        borderColor: focused ? brand.gold : brand.line,
        boxShadow: focused ? brand.cardShadow : undefined,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        {stage ? <StatusPill tone={stage.tone} label={stage.label} /> : null}
        {manageable ? <StatusPill tone={tone.tone} label={tone.label} icon={<StatusIcon Icon={tone.Icon} />} /> : null}
        {manageable ? (
          <Typography sx={{ display: "flex", alignItems: "center", gap: 0.75, color: brand.mut, fontSize: 13 }}>
            <CalendarMonth sx={{ fontSize: 14 }} />
            הועבר {formatDotDate(item.transferredAt)} · תיק #{item.caseNumber}
          </Typography>
        ) : item.transferredAt ? (
          <Typography sx={{ display: "flex", alignItems: "center", gap: 0.75, color: brand.mut, fontSize: 13 }}>
            <CalendarMonth sx={{ fontSize: 14 }} />
            {formatDotDate(item.transferredAt)}
          </Typography>
        ) : null}
      </Box>

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
        <PersonSide party={item.sender} reveal={reveal} onProfile={onProfile} />
        <MatchMark />
        <PersonSide party={item.receiver} reveal={reveal} onProfile={onProfile} />
      </Box>

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

      {manageable ? (
        <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end", flexWrap: "wrap", mt: 1.75 }}>
          <Button variant="outlined" size="small" onClick={() => onNote(item)}>
            הוסף הערה
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={item.status === "coordinating"}
            onClick={() => onAction(item, "coordinating")}
          >
            בתיאום פגישה
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={item.status === "meeting" && Number(item.meetingNumber) >= 99}
            onClick={() => onAction(item, "nextMeeting")}
          >
            {nextMeetingCaption(item.status, item.meetingNumber)}
          </Button>
          <Button variant="outlined" size="small" disabled={item.status === "ended"} onClick={() => onAction(item, "ended")}>
            השידוך ירד
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={item.status === "engaged"}
            onClick={() => onAction(item, "engaged")}
          >
            התארסו
          </Button>
        </Box>
      ) : null}
    </Paper>
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

