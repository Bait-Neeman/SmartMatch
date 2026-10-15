import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { AutoAwesome, FolderOutlined, GroupsOutlined, WorkspacePremium } from "@mui/icons-material";
import { brand } from "../theme/tokens.js";
import { getSession } from "../utils/session.js";
import {
  fetchAdminSummary,
  selectAdminRevealIdentity,
  selectAdminSummary,
  selectAdminSummaryError,
  selectAdminSummaryLoading,
} from "../store/slices/adminSlice.js";
import { CaseStrip } from "../components/admin/CaseWidgets.jsx";
import { closedTrend, freshCaseLine, freshTrend, greeting, monthTrend, todayLine } from "../components/admin/format.js";

const heroBackground = `radial-gradient(400px 200px at 0% 0%, ${brand.goldGlow}, transparent 70%), linear-gradient(90deg, ${brand.paper}, ${brand.heroEnd})`;

export default function AdminPage() {
  const dispatch = useDispatch();
  const summary = useSelector(selectAdminSummary);
  const loading = useSelector(selectAdminSummaryLoading);
  const error = useSelector(selectAdminSummaryError);
  const reveal = useSelector(selectAdminRevealIdentity);
  const sessionName = getSession().user?.name || "";

  useEffect(() => {
    dispatch(fetchAdminSummary());
  }, [dispatch]);

  const fresh = summary?.cases?.fresh || 0;
  const name = summary?.adminName || sessionName;

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
          p: { xs: "22px", md: "22px 30px" },
          borderRadius: "18px",
          border: `1px solid ${brand.line}`,
          boxShadow: brand.shadow,
          background: heroBackground,
        }}
      >
        <Box>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              bgcolor: brand.tabOn,
              color: brand.goldText,
              borderRadius: 999,
              px: 1.5,
              py: 0.5,
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <AutoAwesome sx={{ fontSize: 16, color: brand.goldDeep }} />
            {todayLine()}
          </Box>
          <Typography
            component="h1"
            sx={{
              mt: 1,
              mb: 0.5,
              fontSize: "clamp(24px, 2vw, 30px)",
              fontWeight: 600,
              letterSpacing: "-0.3px",
              color: brand.navy,
              lineHeight: 1.15,
            }}
          >
            {greeting(name)}
            <br />
            <Box
              component="em"
              sx={{
                fontStyle: "normal",
                background: `linear-gradient(90deg, ${brand.goldDeep}, ${brand.goldLight})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {summary ? freshCaseLine(fresh) : "…"}
            </Box>
          </Typography>
          <Typography sx={{ color: brand.ink2, fontSize: 15, m: 0 }}>
            {fresh > 0
              ? "שני הצדדים אישרו והעבירו לטיפולך. כדאי לפתוח אותם היום."
              : "כששני הצדדים יעבירו הצעה לטיפול, היא תופיע כאן."}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
          <Button component={RouterLink} to="/admin/cases?status=new" variant="contained">
            לתיקים החדשים
          </Button>
          <Button component={RouterLink} to="/admin/boys" variant="outlined">
            ניהול מועמדים
          </Button>
        </Box>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading && !summary ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {summary ? (
        <>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: "clamp(12px, 1.3vw, 20px)",
              mt: "20px",
            }}
          >
            <Stat icon={<GroupsOutlined />} value={summary.boys.total} label="בחורים במערכת" trend={monthTrend(summary.boys.addedThisMonth)} />
            <Stat icon={<GroupsOutlined />} value={summary.girls.total} label="בחורות במערכת" trend={monthTrend(summary.girls.addedThisMonth)} />
            <Stat icon={<FolderOutlined />} value={summary.cases.total} label="הצעות שהועברו לטיפולך" trend={freshTrend(summary.cases.fresh)} />
            <Stat icon={<WorkspacePremium />} value={summary.closed.total} label="שידוכים שנסגרו" trend={closedTrend(summary.closed.total)} />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mt: 4, mb: 2 }}>
            <Typography component="h3" sx={{ fontSize: "clamp(18px, 1.4vw, 21px)", fontWeight: 600, color: brand.navy }}>
              הצעות חדשות שהועברו אליך
            </Typography>
            <Button
              component={RouterLink}
              to="/admin/cases"
              sx={{ color: brand.goldDark, fontWeight: 600 }}
            >
              לכל התיקים
            </Button>
          </Box>

          {summary.recent.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: "center" }}>
              <Typography sx={{ color: brand.mut }}>אין תיקים פתוחים</Typography>
            </Paper>
          ) : (
            summary.recent.map((item) => <CaseStrip key={item._id} item={item} reveal={reveal} />)
          )}
        </>
      ) : null}
    </Box>
  );
}

function Stat({ icon, value, label, trend }) {
  return (
    <Paper
      sx={{
        p: "18px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        textAlign: "center",
      }}
    >
      <Box sx={{ color: brand.gold, display: "grid", "& svg": { fontSize: 26 } }}>{icon}</Box>
      <Typography sx={{ fontSize: "clamp(22px, 1.8vw, 28px)", fontWeight: 600, color: brand.navy, lineHeight: 1 }}>
        {value}
      </Typography>
      <Typography sx={{ color: brand.mut, fontSize: 14 }}>{label}</Typography>
      <Typography sx={{ color: brand.goldDark, fontWeight: 600, fontSize: 12 }}>{trend}</Typography>
    </Paper>
  );
}
