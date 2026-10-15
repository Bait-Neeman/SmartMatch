import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { appearanceOptions, ethnicityOptions, labelOf, roleLabel, styleOptions } from "../../constants/profileOptions.js";
import { toSafeFileUrl } from "../../utils/files.js";
import { openProtectedFile } from "../../utils/protectedFile.js";
import ProtectedImage from "../common/ProtectedFile.jsx";
import AdminAvatar from "./AdminAvatar.jsx";

const Row = ({ label, value }) => {
  if (value == null || value === "") return null;
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "120px minmax(0, 1fr)", gap: 1, py: 0.6 }}>
      <Typography sx={{ color: brand.mut, fontSize: 14 }}>{label}</Typography>
      <Typography sx={{ color: brand.navy, fontWeight: 600, fontSize: 15 }}>{value}</Typography>
    </Box>
  );
};

export default function AdminProfileDialog({ open, onClose, data, loading, revealIdentity = true }) {
  const user = data?.user;
  const profile = data?.profile;
  const image = toSafeFileUrl(profile?.image);
  const resume = toSafeFileUrl(profile?.resumePdf);
  const school = [profile?.yeshiva, profile?.seminar].filter(Boolean).join(" · ");
  const title = revealIdentity && user?.name ? user.name : "פרופיל";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{loading ? "פרופיל" : title}</DialogTitle>
      <DialogContent dividers>
        {loading || !data ? (
          <Typography sx={{ color: brand.mut, py: 2 }}>טוען פרופיל…</Typography>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              {revealIdentity && image ? (
                <ProtectedImage
                  url={image}
                  alt=""
                  sx={{
                    width: 84,
                    height: 84,
                    borderRadius: "50%",
                    objectFit: "cover",
                    boxShadow: `0 0 0 3px ${brand.paper}, 0 0 0 4px ${brand.goldLight}`,
                  }}
                />
              ) : (
                <AdminAvatar gender={profile?.gender} size={84} ring reveal={false} />
              )}
              <Box>
                {revealIdentity && user?.name ? (
                  <Typography sx={{ fontWeight: 600, color: brand.navy, fontSize: 20 }}>{user.name}</Typography>
                ) : null}
                <Typography sx={{ color: brand.mut, fontSize: 14 }}>{roleLabel(user?.role)}</Typography>
              </Box>
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, color: brand.navy, mb: 0.5 }}>פרטי קשר</Typography>
              <Row label="מספר זהות" value={user?.idNumber} />
              <Row label="אימייל" value={user?.email} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 600, color: brand.navy, mb: 0.5 }}>פרופיל</Typography>
              <Row label="גיל" value={profile?.age} />
              <Row label="עיר" value={profile?.city} />
              <Row label="גובה" value={profile?.height ? `${profile.height} ס״מ` : ""} />
              <Row label="עדה" value={labelOf(ethnicityOptions, profile?.ethnicity)} />
              <Row label="סגנון" value={labelOf(styleOptions, profile?.style)} />
              <Row label="מראה" value={labelOf(appearanceOptions, profile?.appearance)} />
              <Row label="מוסד" value={school} />
              <Row label="עיסוק" value={profile?.occupation} />
              <Row label="דרישה כספית" value={profile?.financialRequirement} />
              <Row label="יכולת כספית" value={profile?.financialCapabilities} />
              <Row label="מדד כספי" value={profile?.financialStatus} />
              <Row label="תיאור" value={profile?.description} />
            </Box>

            {resume ? (
              <Button variant="outlined" onClick={() => openProtectedFile(resume)}>
                צפייה ברזומה
              </Button>
            ) : null}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>סגירה</Button>
      </DialogActions>
    </Dialog>
  );
}
