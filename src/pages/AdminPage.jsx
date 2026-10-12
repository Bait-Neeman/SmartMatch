import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

const AdminPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        אזור מנהל
      </Typography>

      <Stack spacing={2}>
        <Button variant="contained" onClick={() => navigate("/admin/users")}>
          צפייה בכל המשתמשים
        </Button>

        <Button variant="contained" onClick={() => navigate("/admin/pending-matches")}>
          הצעות שממתינות לטיפול
        </Button>
      </Stack>
    </Box>
  );
};

export default AdminPage;