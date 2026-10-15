import { createTheme } from "@mui/material/styles";
import { brand } from "./tokens.js";

const statusChipBackground = "#E7EDF4";

const theme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
    primary: {
      main: brand.navy,
      light: brand.navyMid,
      dark: brand.navyDeep,
      contrastText: "#ffffff",
    },
    secondary: {
      main: brand.gold,
      light: brand.goldLight,
      dark: brand.goldDark,
      contrastText: brand.navyDeep,
    },
    success: {
      main: "#2F6F4E",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#A68534",
      contrastText: brand.navyDeep,
    },
    error: {
      main: "#8E3B3B",
      contrastText: "#ffffff",
    },
    info: {
      main: brand.navy,
      contrastText: "#ffffff",
    },
    background: {
      default: brand.background,
      paper: brand.paper,
    },
    text: {
      primary: brand.navy,
      secondary: brand.mistDeep,
      disabled: brand.mist,
    },
    divider: brand.line,
  },
  typography: {
    fontFamily: brand.fontFamily,
    h1: { fontWeight: 700, fontSize: "2rem", lineHeight: 1.25, letterSpacing: 0 },
    h2: { fontWeight: 700, fontSize: "1.625rem", lineHeight: 1.3, letterSpacing: 0 },
    h3: { fontWeight: 700, fontSize: "1.375rem", lineHeight: 1.35, letterSpacing: 0 },
    h4: { fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.4, letterSpacing: 0 },
    h5: { fontWeight: 700, fontSize: "1.125rem", lineHeight: 1.4, letterSpacing: 0 },
    h6: { fontWeight: 700, fontSize: "1rem", lineHeight: 1.45, letterSpacing: 0 },
    subtitle1: { fontWeight: 600, lineHeight: 1.5 },
    subtitle2: { fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: "1rem", lineHeight: 1.65 },
    body2: { fontSize: "0.9375rem", lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0, fontSize: "0.9375rem" },
  },
  shape: {
    borderRadius: brand.radius,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: "100%",
        },
        body: {
          margin: 0,
          minHeight: "100%",
          backgroundColor: brand.background,
          color: brand.navy,
          fontFamily: brand.fontFamily,
          overflowX: "hidden",
        },
        "#root": {
          minHeight: "100vh",
          textAlign: "start",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 600,
          padding: "10px 18px",
          boxShadow: "none",
          letterSpacing: 0,
        },
        sizeLarge: {
          padding: "12px 22px",
          fontSize: "1rem",
        },
        containedPrimary: {
          backgroundColor: brand.navy,
          "&:hover": {
            backgroundColor: brand.navyDeep,
          },
        },
        containedSecondary: {
          backgroundColor: brand.gold,
          color: brand.navyDeep,
          "&:hover": {
            backgroundColor: brand.goldDark,
            color: "#ffffff",
          },
        },
        outlined: {
          borderColor: "rgba(151, 166, 188, 0.95)",
          "&:hover": {
            borderColor: brand.gold,
            backgroundColor: "rgba(196, 162, 79, 0.08)",
          },
        },
        outlinedPrimary: {
          borderColor: "rgba(29, 53, 87, 0.35)",
          color: brand.navy,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: brand.navy,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: brand.paper,
          border: `1px solid ${brand.lineSoft}`,
          boxShadow: brand.shadow,
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 600,
          height: 28,
          backgroundColor: statusChipBackground,
          color: brand.navy,
        },
        outlined: {
          backgroundColor: "transparent",
          borderColor: "rgba(29, 53, 87, 0.22)",
        },
        colorSuccess: {
          backgroundColor: "#E5F3EA",
          color: "#1E6B45",
        },
        colorWarning: {
          backgroundColor: "#F6EED9",
          color: "#7A6232",
        },
        colorError: {
          backgroundColor: "#F8E8E6",
          color: "#8C3D38",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: brand.paper,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: brand.navyMid,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: brand.gold,
            borderWidth: "1.5px",
          },
        },
        notchedOutline: {
          borderColor: "rgba(151, 166, 188, 0.95)",
        },
        input: {
          padding: "12.5px 14px",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: brand.mistDeep,
          "&.Mui-focused": {
            color: brand.navy,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 0,
          marginRight: 0,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          backgroundColor: brand.gold,
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          minHeight: 44,
          color: brand.mistDeep,
          "&.Mui-selected": {
            color: brand.navy,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: "0 24px 60px rgba(4, 15, 32, 0.18)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          color: brand.navy,
          fontSize: "1.25rem",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: brand.line,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        bar: {
          backgroundColor: brand.gold,
        },
      },
    },
  },
});

export default theme;
