import { Box } from "@mui/material";
import logo480 from "../../assets/brand/logo-shiny-480.png";
import logo960 from "../../assets/brand/logo-shiny-960.png";
import logo from "../../assets/brand/logo-shiny.png";

// Approved demo masters, used as-is (1178×864, 960×704, 480×352). Do not resample.
const LOGO_RATIO = 864 / 1178;

const sources = {
  190: { one: logo480, two: logo960 },
  240: { one: logo480, two: logo960 },
  400: { one: logo960, two: logo },
};

export default function BrandLogo({ maxWidth = 190 }) {
  const pair = sources[maxWidth] ?? sources[190];
  const width = sources[maxWidth] ? maxWidth : 190;
  const height = Math.round(width * LOGO_RATIO);

  return (
    <Box
      component="img"
      src={pair.one}
      srcSet={`${pair.one} 1x, ${pair.two} 2x`}
      alt="בית נאמן"
      width={width}
      height={height}
      draggable={false}
      sx={{
        display: "block",
        width: "100%",
        maxWidth: width,
        height: "auto",
        mx: "auto",
        bgcolor: "transparent",
        border: 0,
        boxShadow: "none",
        filter: "none",
        mixBlendMode: "normal",
      }}
    />
  );
}
