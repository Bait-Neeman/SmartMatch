import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";

// A friendly message for "nothing here yet", with buttons that lead somewhere useful.
// actions: [{ label, to?, onClick?, variant?, icon? }]
export default function EmptyState({ icon, title, description, actions = [] }) {
  return (
    <Paper
      sx={{
        p: { xs: 3, sm: 5 },
        mx: "auto",
        maxWidth: 560,
        textAlign: "center",
        borderRadius: "16px",
        border: `1px solid ${brand.line}`,
        bgcolor: "background.paper",
        boxShadow: brand.shadow,
      }}
    >
      {icon && (
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: "auto",
            mb: 1.5,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            color: brand.goldText,
            bgcolor: brand.pillGoldBg,
            "& svg": { fontSize: 30 },
          }}
        >
          {icon}
        </Box>
      )}

      <Typography variant="h6" component="h2" sx={{ fontWeight: 800, mb: 1 }}>
        {title}
      </Typography>

      {description && (
        <Typography sx={{ color: "text.secondary", mb: actions.length ? 3 : 0 }}>{description}</Typography>
      )}

      {actions.length > 0 && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "center" }}>
          {actions.map(({ label, to, onClick, variant = "contained", icon: actionIcon }) => (
            <Button
              key={label}
              variant={variant}
              startIcon={actionIcon}
              onClick={onClick}
              {...(to ? { component: RouterLink, to } : {})}
            >
              {label}
            </Button>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
