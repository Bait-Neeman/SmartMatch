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
      }}
    >
      <Paper
        sx={{
          p: 5,
          width: "100%",
          textAlign: "center",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            mb: 5,
            color: "text.primary",
            fontWeight: 700,
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
              py: 1.75,
              px: 5,
              width: "100%",
              maxWidth: 350,
            }}
          >
            צפייה בכל המשתמשים
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate("/admin/pending-matches")}
            sx={{
              py: 1.75,
              px: 5,
              width: "100%",
              maxWidth: 350,
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