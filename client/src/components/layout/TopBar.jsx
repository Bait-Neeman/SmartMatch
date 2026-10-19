import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Box, InputBase } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import PersonAvatar from "../common/PersonAvatar.jsx";
import { searchPeople } from "../../services/search.service.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notification.service.js";

function StrokeIcon({ children }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      sx={{ width: 18, height: 18, display: "block" }}
    >
      {children}
    </Box>
  );
}

function SearchIcon() {
  return (
    <StrokeIcon>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </StrokeIcon>
  );
}

function MailIcon() {
  return (
    <StrokeIcon>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </StrokeIcon>
  );
}

function BellIcon() {
  return (
    <StrokeIcon>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" />
    </StrokeIcon>
  );
}

function Dot() {
  return (
    <Box
      component="i"
      aria-hidden
      sx={{
        position: "absolute",
        top: "10px",
        left: "11px",
        width: 8,
        height: 8,
        borderRadius: "50%",
        bgcolor: brand.goldLight,
        boxShadow: `0 0 0 2px ${brand.navy}`,
        pointerEvents: "none",
      }}
    />
  );
}

const controlSx = {
  position: "relative",
  width: 42,
  height: 42,
  flex: "none",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  p: 0,
  border: 0,
  cursor: "pointer",
  color: brand.navIcon,
  bgcolor: brand.topBarControl,
  boxShadow: `inset 0 0 0 1px ${brand.topBarLine}`,
  textDecoration: "none",
  "&:hover": { bgcolor: brand.whiteSoft },
};

const panelSx = {
  position: "absolute",
  top: "calc(100% + 8px)",
  zIndex: 30,
  maxHeight: 320,
  overflowY: "auto",
  bgcolor: brand.paper,
  color: brand.ink,
  border: `1px solid ${brand.line}`,
  borderRadius: `${brand.radius}px`,
  boxShadow: brand.shadow,
  py: 0.5,
};

const rowSx = {
  display: "block",
  width: "100%",
  textAlign: "start",
  border: 0,
  background: "transparent",
  cursor: "pointer",
  font: "inherit",
  color: brand.ink,
  px: 2,
  py: 1.25,
  "&:hover": { bgcolor: brand.navyWash },
};

export default function TopBar({ isAdmin = false, name = "", gender = "", searchSlot = null }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const searchId = useId();
  const listId = `${searchId}-results`;
  const searchRef = useRef(null);
  const bellRef = useRef(null);
  const inputRef = useRef(null);
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mailCount, setMailCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const searchTimer = useRef(null);
  const searchRequest = useRef(0);

  const mailTo = isAdmin ? "/admin/pending-matches" : "/interests";
  const placeholder = isAdmin ? "חיפוש מועמדים, תיקים…" : "חיפוש הצעות, שמות, ערים…";

  useEffect(() => {
    let ignore = false;

    const load = () => {
      getNotifications()
        .then((data) => {
          if (ignore) return;
          setNotes(data.notifications);
          setUnreadCount(data.unreadCount);
          setMailCount(data.mailCount);
        })
        .catch(() => {});
    };

    load();
    const timer = window.setInterval(load, 60000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const onDraft = (value) => {
    setDraft(value);
    setSearchOpen(true);
    window.clearTimeout(searchTimer.current);
    const query = value.trim();
    const requestId = searchRequest.current + 1;
    searchRequest.current = requestId;
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      return;
    }
    setResults([]);
    setSearching(true);
    setSearchError(false);
    searchTimer.current = window.setTimeout(() => {
      searchPeople(query)
        .then((found) => {
          if (searchRequest.current !== requestId) return;
          setResults(found);
          setSearching(false);
        })
        .catch(() => {
          if (searchRequest.current !== requestId) return;
          setResults([]);
          setSearchError(true);
          setSearching(false);
        });
    }, 250);
  };

  useEffect(() => {
    if (searchSlot) return undefined;
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchSlot]);

  useEffect(() => {
    const onPointer = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false);
      if (bellRef.current && !bellRef.current.contains(event.target)) setBellOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const openResult = (href) => {
    setSearchOpen(false);
    setDraft("");
    navigate(href);
  };

  const openNote = (note) => {
    setBellOpen(false);
    if (!note.read) {
      markNotificationRead(note.id)
        .then(() => {
          setNotes((current) => current.map((item) => (item.id === note.id ? { ...item, read: true } : item)));
          setUnreadCount((count) => Math.max(0, count - 1));
          if (note.type === "interestReceived") setMailCount((count) => Math.max(0, count - 1));
        })
        .catch(() => {});
    }
    navigate(note.href);
  };

  const readAll = () => {
    markAllNotificationsRead()
      .then(() => {
        setNotes((current) => current.map((item) => ({ ...item, read: true })));
        setUnreadCount(0);
        if (!isAdmin) setMailCount(0);
      })
      .catch(() => {});
  };

  const showSearchPanel = searchOpen && draft.trim().length >= 2;
  const bellLabel = unreadCount > 0 ? `התראות, ${unreadCount} חדשות` : "התראות";
  const mailLabel = mailCount > 0 ? `הודעות, ${mailCount}` : "הודעות";

  return (
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "10px" }}>
      {searchSlot ? (
        <Box sx={{ position: "relative", flex: { xs: 1, lg: "0 1 auto" }, minWidth: 0, maxWidth: 380, width: "100%" }}>
          {searchSlot}
        </Box>
      ) : (
      <Box ref={searchRef} sx={{ position: "relative", flex: { xs: 1, lg: "0 1 auto" }, minWidth: 0, maxWidth: 380 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: { lg: "clamp(220px, 26vw, 380px)" },
            maxWidth: "100%",
            height: 42,
            px: 2,
            borderRadius: 999,
            bgcolor: brand.topBarControl,
            boxShadow: `inset 0 0 0 1px ${brand.topBarLine}`,
            color: brand.navIcon,
          }}
        >
          <SearchIcon />
          <InputBase
            inputRef={inputRef}
            value={draft}
            placeholder={placeholder}
            inputProps={{
              "aria-label": placeholder,
              "aria-expanded": showSearchPanel,
              "aria-controls": listId,
              "aria-autocomplete": "list",
              role: "combobox",
            }}
            onChange={(event) => onDraft(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearchOpen(false);
              if (event.key === "Enter" && !searching && results[0]) openResult(results[0].href);
            }}
            sx={{
              flex: 1,
              minWidth: 0,
              color: brand.navIcon,
              fontSize: 15,
              "& input": { p: 0 },
              "& input::placeholder": { color: brand.navIcon, opacity: 1 },
            }}
          />
          <Box
            component="kbd"
            sx={{
              marginInlineStart: "auto",
              flex: "none",
              fontWeight: 600,
              fontSize: 11,
              fontFamily: brand.fontFamily,
              lineHeight: 1.4,
              color: brand.topBarKbd,
              border: `1px solid ${brand.topBarKbdLine}`,
              borderRadius: "6px",
              px: "6px",
              py: "2px",
              bgcolor: "transparent",
              "@media (max-width:1180px)": { display: "none" },
            }}
          >
            ⌘K
          </Box>
        </Box>
        {showSearchPanel && (
          <Box id={listId} role="listbox" aria-label="תוצאות חיפוש" sx={{ ...panelSx, insetInlineStart: 0, width: "100%", minWidth: 240 }}>
            {searching && <Box sx={{ px: 2, py: 1.5, color: brand.mut, fontSize: 14 }}>מחפש…</Box>}
            {searchError && <Box sx={{ px: 2, py: 1.5, color: brand.mut, fontSize: 14 }}>לא הצלחנו לחפש</Box>}
            {!searching && !searchError && results.length === 0 && (
              <Box sx={{ px: 2, py: 1.5, color: brand.mut, fontSize: 14 }}>אין תוצאות</Box>
            )}
            {!searching &&
              results.map((item) => (
              <Box
                key={`${item.kind}-${item.id}`}
                component="button"
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => openResult(item.href)}
                sx={rowSx}
              >
                <Box component="b" sx={{ display: "block", color: brand.navy, fontWeight: 600 }}>
                  {item.title}
                </Box>
                {item.subtitle && (
                  <Box component="small" sx={{ display: "block", color: brand.mut, fontSize: 13 }}>
                    {item.subtitle}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
      )}

      <Box sx={{ flex: 1 }} />

      <Box component={Link} to={mailTo} aria-label={mailLabel} sx={controlSx}>
        <MailIcon />
        {mailCount > 0 && <Dot />}
      </Box>

      <Box ref={bellRef} sx={{ position: "relative" }}>
        <Box
          component="button"
          type="button"
          aria-label={bellLabel}
          aria-expanded={bellOpen}
          aria-haspopup="dialog"
          onClick={() => setBellOpen((open) => !open)}
          sx={controlSx}
        >
          <BellIcon />
          {unreadCount > 0 && <Dot />}
        </Box>
        {bellOpen && (
          <Box
            role="dialog"
            aria-label="התראות"
            sx={{ ...panelSx, insetInlineEnd: 0, width: 320, maxWidth: "70vw" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, px: 2, py: 1 }}>
              <Box component="b" sx={{ color: brand.navy, fontWeight: 600 }}>
                התראות
              </Box>
              {unreadCount > 0 && (
                <Box
                  component="button"
                  type="button"
                  onClick={readAll}
                  sx={{
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 13,
                    fontWeight: 600,
                    color: brand.goldDark,
                    p: 0,
                  }}
                >
                  סמן הכל כנקרא
                </Box>
              )}
            </Box>
            {notes.length === 0 && <Box sx={{ px: 2, py: 1.5, color: brand.mut, fontSize: 14 }}>אין התראות</Box>}
            {notes.map((note) => (
              <Box key={note.id} component="button" type="button" onClick={() => openNote(note)} sx={rowSx}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {!note.read && (
                    <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: brand.gold, flex: "none" }} />
                  )}
                  <Box component="b" sx={{ color: brand.navy, fontWeight: 600 }}>
                    {note.title}
                  </Box>
                </Box>
                {note.detail && (
                  <Box component="small" sx={{ display: "block", color: brand.mut, fontSize: 13, mt: 0.25 }}>
                    {note.detail}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          height: 42,
          paddingInlineStart: "4px",
          paddingInlineEnd: "16px",
          borderRadius: 999,
          bgcolor: brand.topBarControl,
          boxShadow: `inset 0 0 0 1px ${brand.topBarLine}`,
          color: brand.paper,
          fontWeight: 600,
          fontSize: 15,
          flex: "none",
        }}
      >
        <PersonAvatar size={32} gender={gender} />
        {name && (
          <Box component="b" sx={{ fontWeight: 600, "@media (max-width:1060px)": { display: "none" } }}>
            {name}
          </Box>
        )}
      </Box>
    </Box>
  );
}
