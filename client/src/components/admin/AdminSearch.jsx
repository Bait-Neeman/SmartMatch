import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, InputBase, Typography } from "@mui/material";
import { Search } from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";
import { searchAdmin } from "../../services/admin.service.js";
import AdminAvatar from "./AdminAvatar.jsx";
import { institutionLine } from "./format.js";

export default function AdminSearch() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const text = query.trim();
    if (!text) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const data = await searchAdmin(text);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults({ candidates: [], cases: [] });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onPointer = (event) => {
      if (!boxRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const candidates = results?.candidates || [];
  const cases = results?.cases || [];
  const show = open && query.trim().length > 0;

  const openCandidate = (person) => {
    const path = person.gender === "female" ? "/admin/girls" : "/admin/boys";
    setOpen(false);
    setQuery("");
    navigate(`${path}?q=${encodeURIComponent(person.name || "")}&user=${person._id}`);
  };

  const openCase = (item) => {
    setOpen(false);
    setQuery("");
    navigate(`/admin/cases?case=${item._id}`);
  };

  return (
    <Box ref={boxRef} sx={{ position: "relative", width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          height: 42,
          px: 2,
          borderRadius: 999,
          bgcolor: brand.whiteSoft,
          boxShadow: `inset 0 0 0 1px ${brand.whiteLine}`,
          color: brand.navIcon,
        }}
      >
        <Search sx={{ fontSize: 18 }} />
        <InputBase
          inputRef={inputRef}
          value={query}
          placeholder="חיפוש מועמדים, תיקים…"
          inputProps={{ "aria-label": "חיפוש מועמדים ותיקים", "aria-controls": show ? listId : undefined }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          sx={{
            flex: 1,
            color: brand.paper,
            fontSize: 15,
            "& input::placeholder": { color: brand.navIcon, opacity: 1 },
          }}
        />
        <Box
          component="kbd"
          sx={{
            display: { xs: "none", md: "inline-block" },
            font: "600 11px Rubik, sans-serif",
            color: brand.navIcon,
            border: `1px solid ${brand.whiteLine}`,
            borderRadius: "6px",
            px: "6px",
            py: "2px",
          }}
        >
          ⌘K
        </Box>
      </Box>

      {show ? (
        <Box
          id={listId}
          role="listbox"
          sx={{
            position: "absolute",
            top: 48,
            insetInline: 0,
            zIndex: 30,
            bgcolor: brand.paper,
            border: `1px solid ${brand.line}`,
            borderRadius: "12px",
            boxShadow: brand.shadowLift,
            maxHeight: 320,
            overflow: "auto",
            py: 0.5,
          }}
        >
          {!results ? (
            <Typography sx={{ px: 2, py: 1.25, color: brand.mut, fontSize: 14 }}>מחפש…</Typography>
          ) : null}
          {results && candidates.length === 0 && cases.length === 0 ? (
            <Typography sx={{ px: 2, py: 1.25, color: brand.mut, fontSize: 14 }}>אין תוצאות</Typography>
          ) : null}
          {candidates.map((person) => (
            <Box
              key={person._id}
              component="button"
              type="button"
              role="option"
              onClick={() => openCandidate(person)}
              sx={resultSx}
            >
              <AdminAvatar image={person.image} crop={person.photoCrop} gender={person.gender} size={40} rounded="10px" />
              <Box sx={{ minWidth: 0, textAlign: "start" }}>
                <b>{person.name}</b>
                <small>
                  {[
                    institutionLine(person),
                    [person.age, person.city].filter(Boolean).join(" · "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </small>
              </Box>
            </Box>
          ))}
          {cases.map((item) => (
            <Box
              key={item._id}
              component="button"
              type="button"
              role="option"
              onClick={() => openCase(item)}
              sx={resultSx}
            >
              <Box sx={{ minWidth: 0, textAlign: "start" }}>
                <b>
                  {item.senderName} · {item.receiverName}
                </b>
                <small>תיק #{item.caseNumber}</small>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

const resultSx = {
  display: "flex",
  alignItems: "center",
  gap: 1.25,
  width: "100%",
  border: 0,
  background: "transparent",
  textAlign: "start",
  px: 1.5,
  py: 0.75,
  cursor: "pointer",
  font: "inherit",
  "& b": { display: "block", color: brand.navy, fontWeight: 600, fontSize: 15 },
  "& small": { display: "block", color: brand.mut, fontSize: 13 },
  "&:hover": { bgcolor: brand.rowHover },
};
