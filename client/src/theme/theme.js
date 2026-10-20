import { createTheme } from "@mui/material/styles";
import { buttonClasses } from "@mui/material/Button";
import { brand } from "./tokens.js";

const heading = {
  fontWeight: 600,
  letterSpacing: "-0.3px",
  color: brand.navy,
};

const theme = createTheme({
  direction: "rtl",
  palette: {
    mode: "light",
    primary: {
      main: brand.gold,
      light: brand.goldLight,
      dark: brand.goldDeep,
      contrastText: brand.paper,
    },
    secondary: {
      main: brand.navy,
      light: brand.navy2,
      dark: brand.navy,
      contrastText: brand.paper,
    },
    success: {
      main: brand.pillGreenText,
      contrastText: brand.paper,
    },
    warning: {
      main: brand.gold,
      contrastText: brand.paper,
    },
    error: {
      main: brand.pillRedText,
      contrastText: brand.paper,
    },
    info: {
      main: brand.navy,
      contrastText: brand.paper,
    },
    background: {
      default: brand.background,
      paper: brand.paper,
    },
    text: {
      primary: brand.ink,
      secondary: brand.mut,
      disabled: brand.mut2,
    },
    divider: brand.line,
  },
  typography: {
    fontFamily: brand.fontFamily,
    h1: { ...heading, fontSize: "1.875rem", lineHeight: 1.15 },
    h2: { ...heading, fontSize: "1.75rem", lineHeight: 1.2 },
    h3: { ...heading, fontSize: "1.3125rem", lineHeight: 1.3 },
    h4: { ...heading, fontSize: "1.25rem", lineHeight: 1.35 },
    h5: { ...heading, fontSize: "1.125rem", lineHeight: 1.4 },
    h6: { ...heading, fontSize: "1rem", lineHeight: 1.45 },
    subtitle1: { fontWeight: 600, fontSize: "1.0625rem", lineHeight: 1.5 },
    subtitle2: { fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.5 },
    body1: { fontSize: "1rem", lineHeight: 1.5, fontWeight: 400 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5, fontWeight: 400 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0, fontSize: "0.875rem" },
  },
  shape: {
    borderRadius: brand.radius,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: "100%",
          backgroundColor: brand.background,
        },
        body: {
          margin: 0,
          minHeight: "100%",
          backgroundColor: brand.background,
          color: brand.ink,
          fontFamily: brand.fontFamily,
          fontSize: "16px",
          lineHeight: 1.5,
          fontWeight: 400,
          overflowX: "hidden",
        },
        "#root": {
          minHeight: "100vh",
          textAlign: "start",
        },
        "*:focus-visible": {
          outline: `2px solid ${brand.goldDark}`,
          outlineOffset: 2,
        },
        "@media (prefers-reduced-motion: reduce)": {
          "*, *::before, *::after": {
            animationDuration: "0.01ms !important",
            animationIterationCount: "1 !important",
            transitionDuration: "0.01ms !important",
            scrollBehavior: "auto !important",
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: "none",
          fontWeight: 600,
          fontSize: "14px",
          minHeight: 40,
          padding: "0 18px",
          boxShadow: "none",
          letterSpacing: 0,
          // MUI 9 does not apply styleOverrides.containedPrimary. Gold contained
          // buttons are styled here so the selector wins over disableElevation.
          [`&.${buttonClasses.contained}.${buttonClasses.colorPrimary}`]: {
            color: brand.paper,
            backgroundColor: "transparent",
            backgroundImage: brand.goldButton,
            boxShadow: brand.goldButtonShadow,
            "&:hover": {
              backgroundColor: "transparent",
              backgroundImage: brand.goldButtonHover,
              boxShadow: brand.goldButtonShadow,
            },
            "&:active, &:focus-visible": {
              boxShadow: brand.goldButtonShadow,
            },
          },
        },
        sizeSmall: {
          minHeight: 34,
          padding: "0 14px",
          fontSize: "13px",
        },
        sizeLarge: {
          minHeight: 44,
          padding: "0 22px",
          fontSize: "15px",
        },
        containedSecondary: {
          color: brand.paper,
          background: brand.navy,
          boxShadow: "none",
          "&:hover": {
            background: brand.navy2,
          },
        },
        outlined: {
          backgroundColor: brand.paper,
          color: brand.navy,
          borderColor: brand.navy,
          borderWidth: "1.5px",
          "&:hover": {
            borderWidth: "1.5px",
            borderColor: brand.navy,
            backgroundColor: brand.navyWash,
          },
        },
        outlinedPrimary: {
          color: brand.goldDark,
          borderColor: brand.gold,
          backgroundColor: brand.paper,
          "&:hover": {
            borderColor: brand.goldDeep,
            backgroundColor: brand.pillGoldBg,
          },
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
          borderRadius: brand.radiusCard,
          backgroundColor: brand.paper,
          border: `1px solid ${brand.line}`,
          boxShadow: brand.shadow,
          backgroundImage: "none",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: brand.radiusPill,
          fontWeight: 600,
          height: 30,
          fontSize: "13px",
          backgroundColor: brand.pillGrayBg,
          color: brand.pillGrayText,
        },
        outlined: {
          backgroundColor: "transparent",
          borderColor: brand.inputLine,
        },
        colorSuccess: {
          backgroundColor: brand.pillGreenBg,
          color: brand.pillGreenText,
        },
        colorWarning: {
          backgroundColor: brand.pillGoldBg,
          color: brand.pillGoldText,
        },
        colorError: {
          backgroundColor: brand.pillRedBg,
          color: brand.pillRedText,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: brand.paper,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: brand.mut2,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: brand.gold,
            borderWidth: "1.5px",
          },
        },
        notchedOutline: {
          borderColor: brand.inputLine,
        },
        input: {
          padding: "13px 18px",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: brand.mut,
          fontWeight: 600,
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
          minHeight: 40,
        },
        indicator: {
          display: "none",
        },
        flexContainer: {
          gap: 8,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          fontSize: "14px",
          minHeight: 40,
          borderRadius: 10,
          color: brand.navy,
          backgroundColor: brand.paper,
          border: `1px solid ${brand.inputLine}`,
          "&.Mui-selected": {
            color: brand.goldText,
            backgroundColor: brand.tabOn,
            borderColor: brand.gold,
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: brand.radiusDialog,
          boxShadow: brand.shadowLift,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          color: brand.navy,
          fontSize: "1.25rem",
          letterSpacing: "-0.3px",
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
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 24,
          padding: 0,
          overflow: "visible",
          flexShrink: 0,
          "& .MuiSwitch-switchBase": {
            padding: 3,
            top: 0,
          },
          "& .MuiSwitch-switchBase.Mui-checked": {
            transform: "translateX(18px)",
          },
          "& .MuiSwitch-thumb": {
            width: 18,
            height: 18,
          },
          "& .MuiSwitch-track": {
            width: 42,
            height: 24,
            borderRadius: 12,
          },
        },
        switchBase: {
          padding: 3,
          color: brand.paper,
          "&.Mui-checked": {
            transform: "translateX(18px)",
            color: brand.paper,
            "& + .MuiSwitch-track": {
              backgroundImage: brand.goldButton,
              backgroundColor: brand.gold,
              opacity: 1,
            },
          },
        },
        track: {
          width: 42,
          height: 24,
          borderRadius: 12,
          backgroundColor: brand.inputLine,
          opacity: 1,
        },
        thumb: {
          width: 18,
          height: 18,
          boxShadow: brand.toastShadow,
        },
      },
    },
  },
});

export default theme;
