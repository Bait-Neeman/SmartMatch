import { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { FileDownload, LockOpen, Visibility } from "@mui/icons-material";
import { brand } from "../../theme/tokens.js";
import { downloadProtectedFile, openProtectedFile } from "../../utils/protectedFile.js";
import { formatResumeDate, formatResumeSize } from "../../utils/activeSuggestionView.js";

const LINES = [
  { width: "60%", height: 6, color: brand.navy, mb: "3px" },
  { width: "100%", height: 3, color: brand.fieldLine },
  { width: "100%", height: 3, color: brand.fieldLine },
  { width: "40%", height: 3, color: brand.goldMid, mt: "3px" },
  { width: "100%", height: 3, color: brand.fieldLine },
  { width: "100%", height: 3, color: brand.fieldLine },
  { width: "40%", height: 3, color: brand.goldMid, mt: "3px" },
  { width: "100%", height: 3, color: brand.fieldLine },
  { width: "70%", height: 3, color: brand.fieldLine },
];

export default function ResumeCard({ name, url, size, uploadedAt }) {
  const [error, setError] = useState("");
  const filename = name ? `קורות חיים – ${name}.pdf` : "קורות חיים.pdf";
  const uploaded = formatResumeDate(uploadedAt);
  const meta = ["PDF", formatResumeSize(size), uploaded ? `הועלה ${uploaded}` : ""].filter(Boolean).join(" · ");

  const run = async (action) => {
    try {
      setError("");
      await action();
    } catch (err) {
      setError(err?.message || "לא הצלחנו לפתוח את הקובץ");
    }
  };

  return (
    <Box sx={{ mt: 2.75 }}>
      <Typography
        component="h3"
        sx={{
          m: 0,
          mb: 1.25,
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          fontWeight: 600,
          letterSpacing: "-0.3px",
          color: brand.navy,
          fontSize: "clamp(17px, 1.4vw, 20px)",
        }}
      >
        רזומה
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            gap: "5px",
            alignItems: "center",
            fontWeight: 500,
            fontSize: 12,
            color: brand.pillGreenText,
          }}
        >
          <LockOpen sx={{ fontSize: 13 }} />
          נחשף לאחר אישור הדדי
        </Box>
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: "18px",
          alignItems: "center",
          p: "14px",
          border: `1px solid ${brand.line}`,
          borderRadius: "14px",
          bgcolor: brand.paperSoft,
          maxWidth: 560,
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 74,
            height: 96,
            flex: "none",
            borderRadius: "6px",
            bgcolor: brand.paper,
            boxShadow: brand.shadow,
            p: "10px 9px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            position: "relative",
          }}
        >
          {LINES.map((line, index) => (
            <Box
              key={index}
              sx={{
                display: "block",
                width: line.width,
                height: line.height,
                borderRadius: "2px",
                bgcolor: line.color,
                mt: line.mt,
                mb: line.mb,
              }}
            />
          ))}
          <Box
            component="span"
            sx={{
              position: "absolute",
              bottom: 6,
              left: 6,
              fontWeight: 700,
              fontSize: 8,
              color: brand.paper,
              bgcolor: brand.pillRedText,
              borderRadius: "3px",
              px: "4px",
              py: "1px",
              lineHeight: 1.4,
            }}
          >
            PDF
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
          <Box component="b" sx={{ color: brand.navy, fontSize: 15, wordBreak: "break-word" }}>
            {filename}
          </Box>
          <Box component="small" sx={{ color: "text.secondary", fontSize: 13 }}>
            {meta}
          </Box>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Visibility />}
              onClick={() => run(() => openProtectedFile(url))}
            >
              צפייה
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownload />}
              onClick={() => run(() => downloadProtectedFile(url, filename))}
            >
              הורדה
            </Button>
          </Box>
          {error ? (
            <Box component="small" sx={{ color: "error.main", fontSize: 13, mt: 0.5 }}>
              {error}
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
