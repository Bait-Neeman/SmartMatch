import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

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
        border: "1px dashed rgba(151, 166, 188, 0.9)",
        bgcolor: "background.paper",
        boxShadow: "none",
      }}
    >
      {icon && (
        <Box sx={{ color: "primary.main", mb: 1.5, "& svg": { fontSize: 52 } }}>{icon}</Box>
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
