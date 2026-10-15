import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
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
} from "@mui/icons-material";
import { getSession, logout } from "../../utils/session.js";
import { brand } from "../../theme/tokens.js";
import BrandLogo from "./BrandLogo.jsx";
import PersonAvatar from "../common/PersonAvatar.jsx";

const USER_LINKS = [
  { to: "/personal-area", label: "האזור האישי", icon: <Person /> },
  { to: "/matches", label: "התאמות", icon: <Favorite /> },
  { to: "/interests", label: "התעניינויות", icon: <Forum /> },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "ניהול", icon: <AdminPanelSettings /> },
  { to: "/admin/users", label: "משתמשים", icon: <Group /> },
  { to: "/admin/pending-matches", label: "הצעות ממתינות", icon: <PendingActions /> },
];

const navItemSx = {
  mx: 1.25,
  my: 0.25,
  borderRadius: "12px",
  color: brand.mist,
  minHeight: 44,
  "& .MuiListItemIcon-root": {
    minWidth: 36,
    color: "inherit",
  },
  "& .MuiListItemText-primary": {
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  "&:hover": {
    bgcolor: "rgba(196, 162, 79, 0.10)",
    color: brand.goldLight,
  },
  "&.active": {
    bgcolor: "rgba(196, 162, 79, 0.16)",
    color: brand.gold,
  },
};

function SideNav({ links, onNavigate }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: brand.navyDeep }}>
      <BrandLogo />
      <Divider sx={{ borderColor: "rgba(151, 166, 188, 0.18)", mx: 2, mb: 1 }} />
      <List sx={{ px: 0.5, py: 0.5 }}>
        {links.map((link) => (
          <ListItemButton key={link.to} component={NavLink} to={link.to} end onClick={onNavigate} sx={navItemSx}>
            <ListItemIcon>{link.icon}</ListItemIcon>
            <ListItemText primary={link.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", pb: 1.5 }}>
        <Divider sx={{ borderColor: "rgba(151, 166, 188, 0.18)", mx: 2, mb: 1 }} />
        <List sx={{ py: 0 }}>
          <ListItemButton onClick={logout} sx={navItemSx}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary="התנתקות" />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down("lg"));
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin } = getSession();
  const links = isAdmin ? ADMIN_LINKS : USER_LINKS;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", bgcolor: "background.default" }}>
      {!isCompact && (
        <Box
          component="nav"
          aria-label="ניווט ראשי"
          sx={{
            width: brand.sidebarWidth,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            height: "100vh",
            overflowY: "auto",
            borderInlineEnd: "1px solid rgba(4, 15, 32, 0.4)",
          }}
        >
          <SideNav links={links} />
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="inherit"
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.94)",
            backdropFilter: "blur(12px)",
            borderBottom: `1px solid ${brand.line}`,
            color: "text.primary",
          }}
        >
          <Toolbar sx={{ minHeight: brand.topBarHeight, gap: 1.5, px: { xs: 2, lg: 3 } }}>
            {isCompact && (
              <IconButton aria-label="פתיחת תפריט" onClick={() => setMenuOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {user?.name && (
              <Typography sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.95rem" }}>
                שלום, {user.name}
              </Typography>
            )}
            <PersonAvatar size={36} />
            {isCompact && (
              <IconButton aria-label="התנתקות" onClick={logout}>
                <Logout />
              </IconButton>
            )}
          </Toolbar>
        </AppBar>

        <Drawer
          anchor="left"
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          slotProps={{
            paper: {
              sx: {
                width: brand.sidebarWidth,
                bgcolor: brand.navyDeep,
                color: brand.mist,
              },
            },
          }}
        >
          <SideNav links={links} onNavigate={() => setMenuOpen(false)} />
        </Drawer>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            px: { xs: 2, lg: 3.5 },
            py: { xs: 2, lg: 3 },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
