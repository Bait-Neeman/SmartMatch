import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { brand } from "../../theme/tokens.js";
import { pendingCopy } from "../../copy/pendingCopy.js";

export default function AccessCodePanel({ code }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: "14px",
        border: `1px solid ${brand.pillGoldLine}`,
        bgcolor: brand.pillGoldBg,
      }}
    >
      <Typography sx={{ color: brand.goldText, fontWeight: 600, mb: 1 }}>{pendingCopy.codeLabel}</Typography>
      <Box
        dir="ltr"
        sx={{
          fontFamily: "ui-monospace, monospace",
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: "0.08em",
          color: brand.navy,
          wordBreak: "break-all",
        }}
      >
        {code}
      </Box>
      <Button variant="contained" onClick={copy} sx={{ mt: 1.5 }}>
        {copied ? pendingCopy.codeCopied : pendingCopy.copyCode}
      </Button>
    </Box>
  );
}
