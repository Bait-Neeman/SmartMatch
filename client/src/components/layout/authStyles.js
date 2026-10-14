// Shared styles of the login and registration forms

export const authFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "18px",
    backgroundColor: "rgba(255,255,255,0.7)",
    transition: "0.3s",
    "& fieldset": {
      borderColor: "rgba(63, 113, 213, 0.2)",
    },
    "&:hover fieldset": {
      borderColor: "#3f71d5",
    },
    "&.Mui-focused fieldset": {
      borderWidth: "2px",
      borderColor: "#3f71d5",
      boxShadow: "0 0 0 4px rgba(63, 113, 213, 0.14)",
    },
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#3f71d5",
  },
};

export const authSubmitSx = {
  mt: 1,
  py: 1.7,
  borderRadius: "18px",
  fontWeight: 800,
  fontSize: "1rem",
  textTransform: "none",
  background: "linear-gradient(90deg, #3f71d5 0%, #5c85db 50%, #c4a24f 100%)",
  boxShadow: "0 15px 30px rgba(63, 113, 213, 0.2)",
  transition: "0.35s",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 20px 40px rgba(63, 113, 213, 0.25)",
    background: "linear-gradient(90deg, #315bb0 0%, #4d78d4 50%, #b18f3c 100%)",
  },
  "&:disabled": {
    background: "#a8b9e7",
    color: "#fff",
  },
};
