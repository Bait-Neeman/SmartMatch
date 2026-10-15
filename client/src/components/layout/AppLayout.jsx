import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
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
  mx: 0.5,
  my: 0.25,
  px: 1.5,
  py: "10px",
  borderRadius: "10px",
  color: brand.nav,
  minHeight: 40,
  "& .MuiListItemIcon-root": {
    minWidth: 32,
    color: brand.navIcon,
  },
  "& .MuiListItemText-primary": {
    fontWeight: 500,
    fontSize: "15px",
  },
  "&:hover": {
    bgcolor: "rgba(255, 255, 255, 0.06)",
    color: "#ffffff",
  },
  "&.active": {
    background: brand.navActive,
    color: brand.navy,
    boxShadow: "0 6px 16px -8px rgba(201, 162, 74, 0.8)",
    "& .MuiListItemIcon-root": {
      color: brand.navy,
    },
    "& .MuiListItemText-primary": {
      fontWeight: 700,
    },
  },
};

function SideNav({ links, onNavigate }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: brand.navy, px: "12px", py: "18px" }}>
      <Box sx={{ px: "4px", pt: "8px", pb: "4px", mb: "8px" }}>
        <BrandLogo maxWidth={190} />
      </Box>
      <List sx={{ px: 0.5, py: 0.5 }}>
        {links.map((link) => (
          <ListItemButton key={link.to} component={NavLink} to={link.to} end onClick={onNavigate} sx={navItemSx}>
            <ListItemIcon>{link.icon}</ListItemIcon>
            <ListItemText primary={link.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", pt: 1, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
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
            bgcolor: brand.navy,
            color: "#ffffff",
            boxShadow: "0 4px 16px -8px rgba(11, 31, 58, 0.5)",
          }}
        >
          <Toolbar sx={{ minHeight: brand.topBarHeight, gap: 1.5, px: { xs: 2, lg: 3 } }}>
            {isCompact && (
              <IconButton aria-label="פתיחת תפריט" onClick={() => setMenuOpen(true)} sx={{ color: "#ffffff" }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {user?.name && (
              <Typography sx={{ color: "#ffffff", fontWeight: 600, fontSize: "15px" }}>
                שלום, {user.name}
              </Typography>
            )}
            <PersonAvatar size={32} />
            {isCompact && (
              <IconButton aria-label="התנתקות" onClick={logout} sx={{ color: "#ffffff" }}>
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
                bgcolor: brand.navy,
                color: brand.nav,
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
            px: "clamp(20px, 2.4vw, 36px)",
            py: 3,
            pb: 7,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
