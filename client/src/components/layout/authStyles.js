import { brand } from "../../theme/tokens.js";

export const authFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    backgroundColor: brand.paper,
    "& fieldset": {
      borderColor: "rgba(151, 166, 188, 0.95)",
    },
    "&:hover fieldset": {
      borderColor: brand.navyMid,
    },
    "&.Mui-focused fieldset": {
      borderWidth: "1.5px",
      borderColor: brand.gold,
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: brand.navy,
  },
};

export const authSubmitSx = {
  mt: 1,
  py: 1.4,
  borderRadius: "12px",
  fontWeight: 700,
  fontSize: "1rem",
  textTransform: "none",
  boxShadow: "none",
};
