import { Routes, Route } from "react-router-dom";
import RegisterPage from "../pages/RegisterPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import PreferencesPage from "../pages/PreferencesPage";
import ProfilePage from "../pages/ProfilePage";
import PersonalAreaPage from "../pages/PersonalAreaPage";
import MatchesPage from "../pages/MatchesPage";
import InterestsPage from "../pages/InterestsPage";
import AdminPage from "../pages/AdminPage";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute.jsx";
import AdminUsersPage from "../pages/AdminUsersPage";
import AdminPendingMatchesPage from "../pages/AdminPendingMatchesPage";
export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* User Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/preferences"
        element={
          <ProtectedRoute>
            <PreferencesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/personal-area"
        element={
          <ProtectedRoute>
            <PersonalAreaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/matches"
        element={
          <ProtectedRoute>
            <MatchesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/interests"
        element={
          <ProtectedRoute>
            <InterestsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/pending-matches"
        element={
          <AdminRoute>
            <AdminPendingMatchesPage />
          </AdminRoute>
        }
      />
    </Routes>
    
  );
}