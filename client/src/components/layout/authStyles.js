import { brand } from "../../theme/tokens.js";

export const authFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    backgroundColor: brand.paper,
    "& fieldset": {
      borderColor: brand.inputLine,
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
  minHeight: 44,
  fontWeight: 600,
};
