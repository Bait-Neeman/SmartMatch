import { Box } from "@mui/material";
import logo160 from "../../assets/brand/logo-transparent-new-160.png";
import logo320 from "../../assets/brand/logo-transparent-new-320.png";
import logo200 from "../../assets/brand/logo-transparent-new-200.png";
import logo400 from "../../assets/brand/logo-transparent-new-400.png";
import logo240 from "../../assets/brand/logo-transparent-new-240.png";
import logo480 from "../../assets/brand/logo-transparent-new-480.png";
import logo640 from "../../assets/brand/logo-transparent-new-640.png";

// Lanczos cuts of logo-transparent-new.png (1565×1005). Height follows that ratio.
const sources = {
  160: { one: logo160, two: logo320, height: 103 },
  200: { one: logo200, two: logo400, height: 128 },
  240: { one: logo240, two: logo480, height: 154 },
  320: { one: logo320, two: logo640, height: 205 },
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
      height={pair.height}
      draggable={false}
      sx={{
        display: "block",
        width: "100%",
        maxWidth: width,
        height: "auto",
        mx: "auto",
        bgcolor: "transparent",
      }}
    />
  );
}
