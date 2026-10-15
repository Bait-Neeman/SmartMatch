import { Box } from "@mui/material";
import logo160 from "../../assets/brand/logo-shiny-160.png";
import logo320 from "../../assets/brand/logo-shiny-320.png";
import logo200 from "../../assets/brand/logo-shiny-200.png";
import logo400 from "../../assets/brand/logo-shiny-400.png";
import logo240 from "../../assets/brand/logo-shiny-240.png";
import logo480 from "../../assets/brand/logo-shiny-480.png";

// Lanczos downsamples of logo-shiny-original.png (1254). Each slot has a 1x file and a 2x file.
const sources = {
  160: { one: logo160, two: logo320 },
  200: { one: logo200, two: logo400 },
  240: { one: logo240, two: logo480 },
};

export default function BrandLogo({ maxWidth = 160 }) {
  const known = Boolean(sources[maxWidth]);
  const pair = sources[maxWidth] ?? sources[160];
  const width = known ? maxWidth : 160;

  return (
    <Box
      component="img"
      src={pair.one}
      srcSet={`${pair.one} 1x, ${pair.two} 2x`}
      alt="בית נאמן"
      width={width}
      height={width}
      draggable={false}
      sx={{
        display: "block",
        width: "100%",
        maxWidth: width,
        height: "auto",
        mx: "auto",
        imageRendering: "auto",
        userSelect: "none",
      }}
    />
  );
}
