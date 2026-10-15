import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  AdminPanelSettings,
  Favorite,
  Forum,
  Group,
  Logout,
  Menu as MenuIcon,
  PendingActions,
  Person,
  Settings,
} from "@mui/icons-material";
import { getSession, logout } from "../../utils/session.js";

const USER_LINKS = [
  { to: "/personal-area", label: "האזור האישי", icon: <Person /> },
  { to: "/matches", label: "התאמות", icon: <Favorite /> },
  { to: "/interests", label: "התעניינויות", icon: <Forum /> },
  { to: "/settings", label: "הגדרות", icon: <Settings /> },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "ניהול", icon: <AdminPanelSettings /> },
  { to: "/admin/users", label: "משתמשים", icon: <Group /> },
  { to: "/admin/pending-matches", label: "הצעות ממתינות", icon: <PendingActions /> },
];

const brandSx = {
  fontWeight: 900,
  fontSize: "1.4rem",
  textDecoration: "none",
  background: "linear-gradient(90deg, #3f71d5, #5c85db, #c4a24f)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

const navButtonSx = {
  px: 1.5,
  py: 1,
  borderRadius: "12px",
  boxShadow: "none",
  color: "text.secondary",
  "&.active": {
    color: "primary.main",
    bgcolor: "rgba(63, 113, 213, 0.1)",
  },
};

// Header with navigation and logout, shown on every page of a logged-in user
export default function AppLayout() {
  const { pathname } = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin } = getSession();
  const links = isAdmin ? ADMIN_LINKS : USER_LINKS;

  // Every page opens at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="inherit"
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(63, 113, 213, 0.12)",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 64, gap: 1 }}>
            {isMobile && (
              <IconButton aria-label="פתיחת תפריט" onClick={() => setMenuOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}

            <Typography component={NavLink} to={links[0].to} sx={brandSx}>
              SmartMatch
            </Typography>

            {!isMobile && (
              <Box component="nav" sx={{ display: "flex", gap: 0.5, mx: 3 }}>
                {links.map((link) => (
                  <Button key={link.to} component={NavLink} to={link.to} end startIcon={link.icon} sx={navButtonSx}>
                    {link.label}
                  </Button>
                ))}
              </Box>
            )}

            <Box sx={{ flexGrow: 1 }} />

            {!isMobile && user?.name && (
              <Typography sx={{ color: "text.secondary", fontWeight: 600, mx: 1 }}>שלום, {user.name}</Typography>
            )}

            {isMobile ? (
              <IconButton aria-label="התנתקות" onClick={logout}>
                <Logout />
              </IconButton>
            ) : (
              <Button variant="outlined" startIcon={<Logout />} onClick={logout} sx={{ boxShadow: "none", py: 0.75 }}>
                התנתקות
              </Button>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* With the RTL theme, anchor "left" opens from the right edge (the start side) */}
      <Drawer anchor="left" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Box sx={{ width: 260, pt: 2 }} role="navigation">
          <Typography sx={{ ...brandSx, px: 2.5, pb: 1, display: "block" }}>SmartMatch</Typography>
          {user?.name && <Typography sx={{ px: 2.5, pb: 2, color: "text.secondary" }}>שלום, {user.name}</Typography>}
          <Divider />
          <List>
            {links.map((link) => (
              <ListItemButton
                key={link.to}
                component={NavLink}
                to={link.to}
                end
                onClick={() => setMenuOpen(false)}
                sx={{ "&.active": { bgcolor: "rgba(63, 113, 213, 0.1)", color: "primary.main" } }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>{link.icon}</ListItemIcon>
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItemButton onClick={logout}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="התנתקות" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
