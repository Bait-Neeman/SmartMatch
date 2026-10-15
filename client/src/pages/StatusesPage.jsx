import { Box, Card, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import StatusPill from "../components/common/StatusPill.jsx";
import { brand } from "../theme/tokens.js";

const STEPS = [
  {
    tone: "pending",
    label: "הצעה חדשה",
    who: "מערכת",
    reveal: "תמונה ושם מוסתרים",
    text: "פרטים יבשים בלבד: גובה, גיל, עיר, מוסד, תכונות ומה מחפש. ללא תמונה וללא שם.",
    action: "שלח התעניינות",
  },
  {
    tone: "sent",
    label: "התעניינות נשלחה",
    who: "השולח/ת",
    reveal: "תמונה ושם מוסתרים",
    text: "השולח/ת רואה שההתעניינות נשלחה וממתינה לתגובת הצד השני.",
    action: "—",
  },
  {
    tone: "received",
    label: "התקבלה התעניינות",
    who: "המקבל/ת",
    reveal: "תמונה ושם מוסתרים",
    text: "המקבל/ת רואה שהתקבלה התעניינות. אם שניהם שלחו בו-זמנית – ההתעניינות אושרה מיד.",
    action: "אשר התעניינות / לא מעוניין/ת",
  },
  {
    tone: "accepted",
    label: "אושרה · פרטים גלויים",
    who: "שני הצדדים",
    reveal: "תמונה ושם גלויים",
    text: "התמונה והשם נחשפים לשני הצדדים.",
    action: "העבר לטיפול שדכן / לא מעוניין להמשיך",
  },
  {
    tone: "forwarded",
    label: "העברתי לשדכן · ממתין לצד השני",
    who: "צד אחד העביר",
    reveal: "תמונה ושם גלויים",
    text: "מי שהעביר רואה שממתינים לצד השני. הצד השני רואה שאפשר להעביר גם.",
    action: "העבר לטיפול שדכן",
  },
  {
    tone: "matchmaker",
    label: "בטיפול שדכן",
    who: "שני הצדדים העבירו",
    reveal: "תמונה ושם גלויים",
    text: 'ההצעה מופיעה בעמוד "בטיפול שדכן" והשדכן מטפל.',
    action: "—",
  },
];

const LEGEND = [
  ["pending", "הצעה חדשה", "הצעה חדשה – פרטים כלליים בלבד"],
  ["sent", "התעניינות נשלחה", "שלחתי התעניינות – ממתין לתגובה"],
  ["received", "התקבלה התעניינות", "קיבלתי התעניינות – עליי לאשר או לדחות"],
  ["accepted", "אושרה · פרטים גלויים", "שני הצדדים אישרו, תמונה ושם נחשפו"],
  ["forwarded", "העברתי לשדכן · ממתין לצד השני", "הצד השני עוד לא העביר לשדכן"],
  ["otherForwarded", "הצד השני מעוניין להתקדם לשדכן", "הצד השני העביר לשדכן – תורי להחליט"],
  ["matchmaker", "בטיפול שדכן", "שני הצדדים העבירו – השדכן מטפל"],
  ["rejected", "דחיתי", "אני דחיתי. ההצעה נשארת בלשונית נדחו, בלי כפתור הסרה"],
  ["neutral", "נדחה", "הצד השני דחה. ההצעה נשארת בלשונית נדחו, בלי כפתור הסרה"],
];

const PLACES = [
  ["/suggestions", "הצעות", "הצעות חדשות, התעניינות שנשלחה והתעניינות שהתקבלה"],
  ["/active", "הצעות פעילות", "אושרו הדדית – תמונה ושם גלויים, אפשר להעביר לשדכן"],
  ["/active", "בטיפול שדכן", "העברתי לשדכן וממתין לצד השני, או ששניכם העברתם והשדכן מטפל"],
];

export default function StatusesPage() {
  return (
    <Box>
      <Typography
        component="h1"
        sx={{ m: 0, color: brand.navy, fontWeight: 600, letterSpacing: "-0.3px", fontSize: "clamp(22px, 1.9vw, 28px)" }}
      >
        מסלול ההצעה – סטטוסים
      </Typography>
      <Typography sx={{ mt: 0.75, mb: 2.25, color: brand.mut, fontSize: 17 }}>
        כך מתקדמת כל הצעה, מנקודת המבט של כל צד
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 2,
          mb: 3,
        }}
      >
        {STEPS.map((step, index) => (
          <Card key={step.label} sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.25, fontSize: 13.5 }}>
            <Typography sx={{ color: brand.goldText, fontWeight: 700, m: 0 }}>{index + 1}</Typography>
            <StatusPill tone={step.tone} label={step.label} />
            <Typography sx={{ color: brand.mut, m: 0 }}>{step.who}</Typography>
            <Typography sx={{ color: brand.ink2, m: 0 }}>{step.reveal}</Typography>
            <Typography sx={{ color: brand.ink2, lineHeight: 1.6, flex: 1, m: 0 }}>{step.text}</Typography>
            <Typography sx={{ borderTop: `1px solid ${brand.line}`, pt: 1.25, color: brand.navy, m: 0 }}>
              <b>פעולה:</b> {step.action}
            </Typography>
          </Card>
        ))}
      </Box>

      <Card sx={{ p: 2.25, mb: 2, display: "flex", gap: 1.5, alignItems: "flex-start" }}>
        <Box>
          <Typography component="b" sx={{ display: "block", color: brand.navy, fontSize: 20, fontWeight: 500 }}>
            דחייה בכל שלב
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mt: 0.75 }}>
            <Typography sx={{ m: 0, color: brand.ink2 }}>הצד שדחה רואה</Typography>
            <StatusPill tone="rejected" label="דחיתי" />
            <Typography sx={{ m: 0, color: brand.ink2 }}>והצד השני רואה</Typography>
            <StatusPill tone="neutral" label="נדחה" />
          </Box>
          <Typography sx={{ mt: 1, color: brand.ink2 }}>
            ההצעה נשארת בלשונית השקטה „נדחו” בעמוד ההצעות. אין כפתור הסרה. הגישה לשם, לטלפון, לתמונה ולרזומה נסגרת מיד.
          </Typography>
        </Box>
      </Card>

      <Card sx={{ p: 2.25, mb: 2 }}>
        <Typography component="h2" sx={{ m: 0, mb: 1.5, color: brand.navy, fontSize: 20, fontWeight: 600 }}>
          איפה תמצאי כל הצעה
        </Typography>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" } }}>
          {PLACES.map(([to, title, text]) => (
            <Box
              key={title}
              component={RouterLink}
              to={to}
              sx={{ color: "inherit", textDecoration: "none", display: "grid", gap: 0.5 }}
            >
              <Typography component="b" sx={{ color: brand.navy, fontWeight: 700 }}>
                {title}
              </Typography>
              <Typography sx={{ color: brand.mut, m: 0 }}>{text}</Typography>
            </Box>
          ))}
        </Box>
        <Typography sx={{ mt: 1.5, color: brand.mut, fontSize: 14 }}>
          הצעות שנדחו נשארות בלשונית נדחו, ולא נמחקות מהרשימה.
        </Typography>
      </Card>

      <Card sx={{ p: 2.25 }}>
        <Typography component="h2" sx={{ m: 0, mb: 1, color: brand.navy, fontSize: 26, fontWeight: 600 }}>
          מקרא
        </Typography>
        {LEGEND.map(([tone, label, text]) => (
          <Box
            key={label}
            sx={{
              display: "flex",
              gap: 2.5,
              alignItems: "center",
              py: 1.75,
              borderBottom: `1px solid ${brand.line}`,
              "&:last-of-type": { borderBottom: 0 },
              flexWrap: "wrap",
            }}
          >
            <StatusPill tone={tone} label={label} />
            <Typography sx={{ color: brand.ink2, m: 0 }}>{text}</Typography>
          </Box>
        ))}
      </Card>
    </Box>
  );
}
