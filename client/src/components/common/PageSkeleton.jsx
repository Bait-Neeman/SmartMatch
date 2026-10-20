import { Box, Skeleton } from "@mui/material";
import { pendingCopy } from "../../copy/pendingCopy.js";

export function ListSkeleton({ rows = 4 }) {
  return (
    <Box role="status" aria-label={pendingCopy.loadingLabel} sx={{ display: "grid", gap: 1.5 }}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={88} sx={{ borderRadius: "16px" }} />
      ))}
    </Box>
  );
}

export function CardGridSkeleton({ cards = 4 }) {
  return (
    <Box
      role="status"
      aria-label={pendingCopy.loadingLabel}
      sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2 }}
    >
      {Array.from({ length: cards }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={112} sx={{ borderRadius: "16px" }} />
      ))}
    </Box>
  );
}

export function FormSkeleton() {
  return (
    <Box role="status" aria-label={pendingCopy.loadingLabel} sx={{ display: "grid", gap: 1.5, maxWidth: 720 }}>
      <Skeleton variant="rounded" height={36} width="40%" />
      <Skeleton variant="rounded" height={280} sx={{ borderRadius: "16px" }} />
      <Skeleton variant="rounded" height={180} sx={{ borderRadius: "16px" }} />
    </Box>
  );
}
