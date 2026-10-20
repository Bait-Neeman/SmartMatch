import { NavLink } from "react-router-dom";
import { Box } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { pendingCopy } from "../../copy/pendingCopy.js";

export default function BottomNav({ links }) {
  return (
    <Box
      component="nav"
      aria-label={pendingCopy.bottomNavLabel}
      sx={{
        position: "fixed",
        zIndex: 30,
        insetInline: 0,
        bottom: 0,
        display: "grid",
        gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))`,
        bgcolor: brand.navy,
        borderTop: `1px solid ${brand.whiteLine}`,
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      {links.map((link) => (
        <Box
          key={link.to}
          component={NavLink}
          to={link.to}
          end={link.end !== false}
          sx={{
            minHeight: 62,
            px: 0.5,
            py: 0.75,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.25,
            textDecoration: "none",
            color: brand.nav,
            fontSize: 11,
            fontWeight: 600,
            lineHeight: 1.2,
            textAlign: "center",
            "& svg": { fontSize: 22 },
            "&.active": { color: brand.goldLight },
            "&:focus-visible": { outline: `2px solid ${brand.goldLight}`, outlineOffset: -2 },
          }}
        >
          {link.icon}
          {link.label}
        </Box>
      ))}
    </Box>
  );
}
