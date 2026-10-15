import { Box } from "@mui/material";
import logo from "../../assets/brand/logo-shiny.png";
import logo480 from "../../assets/brand/logo-shiny-480.png";
import logo960 from "../../assets/brand/logo-shiny-960.png";

// Approved shiny mark. Sidebar display size is 160px; larger sources stay crisp.
export default function BrandLogo({ maxWidth = 160 }) {
  return (
    <Box
      component="img"
      src={logo}
      srcSet={`${logo480} 480w, ${logo960} 960w, ${logo} 1178w`}
      sizes={`${maxWidth}px`}
      alt="בית נאמן"
      width={1178}
      height={864}
      draggable={false}
      sx={{
        display: "block",
        width: "100%",
        maxWidth,
        height: "auto",
        mx: "auto",
        userSelect: "none",
      }}
    />
  );
}
