import { Box, Paper, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import AdminAvatar from "./AdminAvatar.jsx";
import { displayName, institutionLine } from "./format.js";

export default function PersonPreviewCard({ person, onClick, reveal = true, compact = false, footer = null }) {
  const profile = person?.profile || {};
  const gender = profile.gender || person?.gender || "";
  const age = profile.age ?? person?.age;
  const city = profile.city || person?.city || "";
  const institution = institutionLine({
    gender,
    yeshiva: profile.yeshiva || person?.yeshiva,
    seminar: profile.seminar || person?.seminar,
  });
  const image = reveal ? person?.image || profile.image : "";
  const name = displayName({ ...person, gender }, reveal);
  const meta = [age != null && age !== "" ? String(age) : "", city].filter(Boolean).join(" · ");
  const photoHeight = compact ? 132 : 188;

  const body = (
    <>
      <Box sx={{ height: photoHeight, bgcolor: brand.background }}>
        <AdminAvatar image={image} gender={gender} size="100%" rounded="0" reveal={reveal} />
      </Box>
      <Box sx={{ px: 1.5, py: 1.25, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: compact ? 15 : 17, lineHeight: 1.3 }}>
          {name}
        </Typography>
        <Typography sx={{ color: brand.mut, fontSize: 13, mt: 0.25 }}>{institution || "—"}</Typography>
        <Typography sx={{ color: brand.ink2, fontSize: 13 }}>{meta || "—"}</Typography>
        {footer}
      </Box>
    </>
  );

  const sx = {
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minWidth: 0,
    p: 0,
    borderColor: brand.line,
    textAlign: "start",
    font: "inherit",
    color: "inherit",
  };

  if (!onClick) {
    return <Paper sx={sx}>{body}</Paper>;
  }

  return (
    <Paper
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        ...sx,
        cursor: "pointer",
        "&:hover": { borderColor: brand.rowHoverBorder, boxShadow: brand.rowHoverShadow, bgcolor: brand.rowHover },
      }}
    >
      {body}
    </Paper>
  );
}
