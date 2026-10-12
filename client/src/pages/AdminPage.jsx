import { Box, Button, Container, Paper, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const AdminPage = () => {
  const navigate = useNavigate();

  return (
    <Container
      maxWidth="md"
      sx={{
        py: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <Paper
        sx={{
          p: 5,
          width: "100%",
          textAlign: "center",
          bgcolor: "#f8fbff",
          border: "1px solid rgba(31,63,149,0.12)",
          borderRadius: 3,
        }}
        elevation={2}
      >
        <Typography
          variant="h3"
          sx={{
            mb: 5,
            color: "#1f3f95",
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          אזור מנהל
        </Typography>

        <Stack
          spacing={3}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Button
            variant="contained"
            onClick={() => navigate("/admin/users")}
            sx={{
              bgcolor: "#1f4aac",
              color: "#f8d25d",
              fontSize: "1.1rem",
              py: 2.5,
              px: 5,
              borderRadius: 3,
              fontWeight: 600,
              textTransform: "none",
              minWidth: 350,
              boxShadow: "0 4px 12px rgba(31,63,149,0.25)",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: "#163e86",
                boxShadow: "0 6px 16px rgba(31,63,149,0.35)",
                transform: "translateY(-2px)",
              },
            }}
          >
            צפייה בכל המשתמשים
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate("/admin/pending-matches")}
            sx={{
              bgcolor: "#1f4aac",
              color: "#f8d25d",
              fontSize: "1.1rem",
              py: 2.5,
              px: 5,
              borderRadius: 3,
              fontWeight: 600,
              textTransform: "none",
              minWidth: 350,
              boxShadow: "0 4px 12px rgba(31,63,149,0.25)",
              transition: "all 0.3s ease",
              "&:hover": {
                bgcolor: "#163e86",
                boxShadow: "0 6px 16px rgba(31,63,149,0.35)",
                transform: "translateY(-2px)",
              },
            }}
          >
            הצעות שממתינות לטיפול
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AdminPage;