import { Box } from "@mui/material";
import logo1x from "../../assets/brand/logo-shiny.png";
import logo2x from "../../assets/brand/logo-shiny@2x.png";

// Shiny wordmark only. No tagline under the logo.
export default function BrandLogo({ width = 196 }) {
  return (
    <Box
      component="img"
      src={logo1x}
      srcSet={`${logo1x} 1x, ${logo2x} 2x`}
      alt="בית נאמן"
      width={392}
      height={104}
      draggable={false}
      sx={{
        display: "block",
        width,
        height: "auto",
        maxWidth: "calc(100% - 28px)",
        mx: "auto",
        mt: 2.5,
        mb: 1,
        userSelect: "none",
      }}
    />
  );
}
