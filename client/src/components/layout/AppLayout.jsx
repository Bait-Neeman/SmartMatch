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
  FolderOutlined,
  FormatListBulleted,
  GroupsOutlined,
  HomeOutlined,
  HowToReg,
  Logout,
  SendOutlined,
  Menu as MenuIcon,
  PeopleAlt,
  Person,
  Settings,
} from "@mui/icons-material";
import { getSession, logout } from "../../utils/session.js";
import useMyGender from "../../hooks/useMyGender.js";
import { brand } from "../../theme/tokens.js";
import BrandLogo from "./BrandLogo.jsx";
import TopBar from "./TopBar.jsx";
import PersonAvatar from "../common/PersonAvatar.jsx";
import AdminSearch from "../admin/AdminSearch.jsx";

const USER_LINKS = [
  { to: "/home", label: "דף הבית", icon: <HomeOutlined />, end: true },
  { to: "/personal-area", label: "האזור האישי", icon: <Person /> },
  { to: "/suggestions", label: "הצעות", icon: <FormatListBulleted />, end: false },
  { to: "/active", label: "הצעות פעילות", icon: <HowToReg />, end: false },
  { to: "/matchmaker", label: "בטיפול שדכן", icon: <SendOutlined />, end: false },
  { to: "/matches", label: "התאמות", icon: <PeopleAlt /> },
  { to: "/settings", label: "הגדרות", icon: <Settings /> },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "דשבורד", icon: <HomeOutlined />, end: true },
  { to: "/admin/boys", label: "בחורים", icon: <GroupsOutlined /> },
  { to: "/admin/girls", label: "בחורות", icon: <GroupsOutlined /> },
  { to: "/admin/cases", label: "הצעות בטיפול", icon: <FolderOutlined /> },
  { to: "/admin/settings", label: "הגדרות", icon: <Settings /> },
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
    bgcolor: brand.whiteSoft,
    color: brand.paper,
  },
  "&.active": {
    background: brand.navActive,
    color: brand.navy,
    boxShadow: brand.navActiveShadow,
    "& .MuiListItemIcon-root": {
      color: brand.navy,
    },
    "& .MuiListItemText-primary": {
      fontWeight: 700,
    },
  },
};

function SideNav({ links, onNavigate, identity, gender, logoutLabel = "התנתקות" }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: brand.navy, px: "12px", py: "18px" }}>
      <Box sx={{ px: "4px", pt: "8px", pb: "4px", mb: "8px" }}>
        <BrandLogo maxWidth={190} />
      </Box>
      {identity ? (
        <Box
          sx={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            px: "6px",
            py: "12px",
            mb: "12px",
            borderTop: `1px solid ${brand.whiteLine}`,
            borderBottom: `1px solid ${brand.whiteLine}`,
          }}
        >
          <PersonAvatar size={36} gender={gender} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ color: brand.paper, fontWeight: 600, fontSize: 15, lineHeight: 1.2 }}>
              {identity.name}
            </Typography>
            <Typography sx={{ color: brand.goldLight, fontSize: 12 }}>{identity.subtitle}</Typography>
          </Box>
        </Box>
      ) : null}
      <List sx={{ px: 0.5, py: 0.5 }}>
        {links.map((link) => (
          <ListItemButton key={link.to} component={NavLink} to={link.to} end={link.end !== false} onClick={onNavigate} sx={navItemSx}>
            <ListItemIcon>{link.icon}</ListItemIcon>
            <ListItemText primary={link.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: "auto", pt: 1, borderTop: `1px solid ${brand.whiteLine}` }}>
        <List sx={{ py: 0 }}>
          <ListItemButton onClick={logout} sx={navItemSx}>
            <ListItemIcon>
              <Logout />
            </ListItemIcon>
            <ListItemText primary={logoutLabel} />
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
  const gender = useMyGender();
  const links = isAdmin ? ADMIN_LINKS : USER_LINKS;
  const identity = isAdmin ? { name: user?.name || "מנהל", subtitle: "שדכן · מנהל מערכת" } : null;
  const logoutLabel = isAdmin ? "יציאה" : "התנתקות";

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
            borderInlineEnd: `1px solid ${brand.navyEdge}`,
          }}
        >
          <SideNav links={links} identity={identity} gender={gender} logoutLabel={logoutLabel} />
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="inherit"
          sx={{
            bgcolor: brand.navy,
            color: brand.paper,
            boxShadow: brand.topBarShadow,
          }}
        >
          <Toolbar
            sx={{
              minHeight: brand.topBarHeight,
              gap: "10px",
              px: "clamp(16px, 2vw, 32px)",
              py: "clamp(8px, 1.2vh, 12px)",
            }}
          >
            {isCompact && (
              <IconButton aria-label="פתיחת תפריט" onClick={() => setMenuOpen(true)} sx={{ color: brand.paper }}>
                <MenuIcon />
              </IconButton>
            )}
            <TopBar
              isAdmin={isAdmin}
              name={user?.name || ""}
              gender={gender}
              searchSlot={isAdmin ? <AdminSearch /> : null}
            />
            {isCompact && (
              <IconButton aria-label="התנתקות" onClick={logout} sx={{ color: brand.paper }}>
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
          <SideNav links={links} identity={identity} gender={gender} logoutLabel={logoutLabel} onNavigate={() => setMenuOpen(false)} />
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
