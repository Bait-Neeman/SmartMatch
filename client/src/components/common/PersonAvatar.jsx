import { useId } from "react";
import { Box } from "@mui/material";
import { brand } from "../../theme/tokens.js";

// The approved profile illustration: a navy bust on a light ground.
// The same drawing is cropped to a circle for the small avatars.

export default function PersonAvatar({ locked = false, size = 64, color, gender, fit = "cover", sx }) {
  const rawId = useId().replace(/:/g, "");
  const ink = color || (locked ? brand.portraitSoft : brand.portraitInk);
  const bgTop = locked ? brand.avatarLocked : brand.portraitTop;
  const bgBottom = locked ? brand.avatar : brand.portraitBottom;

  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        bgcolor: locked ? brand.avatarLocked : brand.avatar,
        ...sx,
      }}
    >
      <Box
        component="svg"
        viewBox="-12 -18 124 118"
        preserveAspectRatio={fit === "contain" ? "xMidYMid meet" : "xMidYMax slice"}
        sx={{
          width: "100%",
          height: "100%",
          display: "block",
          filter: locked ? "blur(4px)" : "none",
          opacity: locked ? 0.85 : 1,
        }}
      >
        <defs>
          <linearGradient id={`${rawId}-bg`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={bgTop} />
            <stop offset="1" stopColor={bgBottom} />
          </linearGradient>
        </defs>
        <rect x="-20" y="-30" width="140" height="140" fill={`url(#${rawId}-bg)`} />
        {gender === "male" ? (
          <>
            <path d="M14 100C14 74 30 56 50 56C70 56 86 74 86 100Z" fill={ink} />
            <ellipse cx="50" cy="37" rx="13.5" ry="15.5" fill={ink} />
            <path
              d="M36.3 37C35 24 41 17.5 50.5 17.5C59 17.5 65.5 22.5 63.8 37C62.5 30.5 59 27.5 53 27.5C46 27.5 40 29 36.3 37Z"
              fill={ink}
            />
          </>
        ) : (
          <>
            <path
              d="M50 13C35 13 28.5 25 29 40C29.5 48 30.5 53 32.5 56.5C36 57.5 39.5 56.5 42 54.5H58C60.5 56.5 64 57.5 67.5 56.5C69.5 53 70.5 48 71 40C71.5 25 65 13 50 13Z"
              fill={ink}
            />
            <path d="M20 100C20 75 32 55.5 50 55.5C68 55.5 80 75 80 100Z" fill={ink} />
            <ellipse cx="50" cy="37" rx="12.5" ry="15" fill={ink} />
            <path
              d="M37.5 36C37 24 43 19.5 50.5 19.5C58 19.5 63.5 24.5 62.5 36C59 28 53 25.5 47 27C43 28 39.5 31 37.5 36Z"
              fill={ink}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
