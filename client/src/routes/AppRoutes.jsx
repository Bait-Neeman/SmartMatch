import { Navigate, Route, Routes } from "react-router-dom";
import RegisterPage from "../pages/RegisterPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import PreferencesPage from "../pages/PreferencesPage";
import ProfilePage from "../pages/ProfilePage";
import PersonalAreaPage from "../pages/PersonalAreaPage";
import MatchesPage from "../pages/MatchesPage";
import InterestsPage from "../pages/InterestsPage";
import SuggestionsPage from "../pages/SuggestionsPage.jsx";
import SuggestionDetailPage from "../pages/SuggestionDetailPage.jsx";
import AdminPage from "../pages/AdminPage";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import AdminUsersPage from "../pages/AdminUsersPage";
import AdminPendingMatchesPage from "../pages/AdminPendingMatchesPage";
import AdminMatchmakerPage from "../pages/AdminMatchmakerPage";
import SettingsPage from "../pages/SettingsPage";
import { getSession, homePathFor } from "../utils/session.js";

// Visitors see the landing page; logged-in users go straight to their area
function HomeRoute() {
  const session = getSession();
  return session.isLoggedIn ? <Navigate to={homePathFor(session)} replace /> : <DashboardPage />;
}

// Login and registration are for visitors only
function PublicOnlyRoute({ children }) {
  const session = getSession();
  return session.isLoggedIn ? <Navigate to={homePathFor(session)} replace /> : children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />

      {/* User Routes (with the site header) */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/personal-area" element={<PersonalAreaPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/suggestions/:kind/:id" element={<SuggestionDetailPage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/interests" element={<InterestsPage />} />
      </Route>

      {/* Admin Routes (with the site header) */}
      <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/pending-matches" element={<AdminPendingMatchesPage />} />
        <Route path="/admin/matchmaker" element={<AdminMatchmakerPage />} />
      </Route>

      {/* Unknown addresses go to the right home page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
