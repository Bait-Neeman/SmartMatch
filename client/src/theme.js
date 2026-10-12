import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#3f71d5",
      light: "#8fb7ff",
      dark: "#305bb0",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#c4a24f",
      light: "#e6cf88",
      dark: "#9f7d35",
      contrastText: "#111b33",
    },
    background: {
      default: "#f4f7ff",
      paper: "#ffffff",
    },
    text: {
      primary: "#111b33",
      secondary: "#4b5f7d",
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
    body1: { color: "#273145" },
    body2: { color: "#475969" },
  },
  shape: {
    borderRadius: 18,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f4f7ff",
          overflowX: "hidden",
          minHeight: "100vh",
        },
        "#root": {
          width: "100%",
          maxWidth: "100%",
          minHeight: "100vh",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: "medium",
      },
      styleOverrides: {
        root: {
          borderRadius: 18,
          textTransform: "none",
          padding: "12px 20px",
          boxShadow: "0 12px 30px rgba(63, 113, 213, 0.12)",
        },
        containedPrimary: {
          backgroundColor: "#3f71d5",
          color: "#ffffff",
          '&:hover': {
            backgroundColor: "#315bb0",
          },
        },
        containedSecondary: {
          backgroundColor: "#c4a24f",
          color: "#111b33",
          '&:hover': {
            backgroundColor: "#a68b3f",
          },
        },
        outlined: {
          borderColor: "rgba(63, 113, 213, 0.3)",
          '&:hover': {
            backgroundColor: "rgba(63, 113, 213, 0.08)",
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: "#ffffff",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: "#f7f9ff",
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: "#3f71d5",
            borderWidth: "1.5px",
          },
        },
        notchedOutline: {
          borderColor: "rgba(63, 113, 213, 0.2)",
        },
        input: {
          padding: "14px 16px",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#5e6f89",
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          marginLeft: 0,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: "auto",
        },
        indicator: {
          backgroundColor: "#3f71d5",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          minHeight: "auto",
          padding: "10px 16px",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 18,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
        },
      },
    },
  },
});

export default theme;
