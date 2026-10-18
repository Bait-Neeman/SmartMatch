import { Box, Button, Paper, Typography } from "@mui/material";
import { AutoAwesome, CalendarMonth, DescriptionOutlined, FolderOutlined, VisibilityOutlined } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import { brand } from "../../theme/tokens.js";
import MatchRing from "../common/MatchRing.jsx";
import StatusPill from "../common/StatusPill.jsx";
import AdminAvatar from "./AdminAvatar.jsx";
import { CASE_STATUS, EMPTY_NOTE, SUGGESTION_STAGE, contactLine, displayName, formatDotDate, partyLine } from "./format.js";

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
  const contact = contactLine(party);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: compact ? 0 : 200, flex: compact ? 1 : "1 1 200px" }}>
      <AdminAvatar
        image={party?.image || party?.profile?.image}
        gender={party?.gender || party?.profile?.gender}
        size={compact ? 56 : 64}
        rounded="14px"
        reveal={reveal}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 17, lineHeight: 1.2 }}>
          {displayName(party, reveal)}
        </Typography>
        <Typography sx={{ color: brand.mut, fontSize: 13 }}>{partyLine(party)}</Typography>
        {reveal && contact ? (
          <Typography sx={{ color: brand.ink2, fontSize: 13, wordBreak: "break-word" }}>{contact}</Typography>
        ) : null}
      </Box>
      {onProfile && party?._id ? (
        <Button size="small" onClick={() => onProfile(party._id)} sx={{ color: brand.goldDark, fontWeight: 600, minWidth: 0 }}>
          פרופיל
        </Button>
      ) : null}
    </Box>
  );
}

export function CaseStrip({ item, reveal = true }) {
  const unknown = item.matchPercent == null;
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
      <PersonSide party={item.sender} reveal={reveal} compact />
      <MatchMark />
      <PersonSide party={item.receiver} reveal={reveal} compact />
      <Box sx={{ flexGrow: 1 }} />
      <MatchRing value={item.matchPercent || 0} unknown={unknown} size={60} caption="התאמה" />
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

export function CaseCard({ item, reveal = true, focused = false, onProfile, onResume, onNote, onStatus }) {
  const tone = CASE_STATUS[item.status] || CASE_STATUS.new;
  const stage = SUGGESTION_STAGE[item.stage];
  const unknown = item.matchPercent == null;
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
        <Box sx={{ flexGrow: 1 }} />
        <MatchRing value={item.matchPercent || 0} unknown={unknown} size={58} caption="התאמה" />
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
        <CasePerson party={item.sender} reveal={reveal} onProfile={onProfile} onResume={onResume} />
        <MatchMark />
        <CasePerson party={item.receiver} reveal={reveal} onProfile={onProfile} onResume={onResume} />
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

      {manageable ? (
        <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end", mt: 1.75 }}>
          <Button variant="outlined" size="small" onClick={() => onNote(item)}>
            הוסף הערה
          </Button>
          <Button variant="contained" size="small" onClick={(event) => onStatus(item, event.currentTarget)}>
            עדכן סטטוס
          </Button>
        </Box>
      ) : null}
    </Paper>
  );
}

function StatusIcon({ Icon }) {
  return Icon ? <Icon /> : null;
}

function CasePerson({ party, reveal, onProfile, onResume }) {
  const contact = reveal ? contactLine(party) : "";
  return (
    <Box
      sx={{
        flex: "1 1 220px",
        minWidth: 0,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        textAlign: "start",
      }}
    >
      <AdminAvatar
        image={party?.image || party?.profile?.image}
        gender={party?.gender || party?.profile?.gender}
        size={72}
        rounded="16px"
        ring
        reveal={reveal}
      />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 18 }}>{displayName(party, reveal)}</Typography>
        <Typography sx={{ color: brand.mut, fontSize: 13 }}>{partyLine(party)}</Typography>
        {contact ? (
          <Typography sx={{ color: brand.ink2, fontSize: 13, wordBreak: "break-word" }}>{contact}</Typography>
        ) : null}
      <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
        {party?._id ? (
          <Button
            size="small"
            startIcon={<VisibilityOutlined />}
            onClick={() => onProfile(party._id)}
            sx={{ color: brand.goldDark, fontWeight: 600, minWidth: 0, px: 0.5 }}
          >
            פרופיל
          </Button>
        ) : null}
        {party?.resumePdf || party?.profile?.resumePdf ? (
          <Button
            size="small"
            startIcon={<DescriptionOutlined />}
            onClick={() => onResume(party.resumePdf || party.profile.resumePdf)}
            sx={{ color: brand.goldDark, fontWeight: 600, minWidth: 0, px: 0.5 }}
          >
            רזומה
          </Button>
        ) : null}
      </Box>
      </Box>
    </Box>
  );
}
