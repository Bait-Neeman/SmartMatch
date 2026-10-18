import { Navigate, Route, Routes } from "react-router-dom";
import RegisterPage from "../pages/RegisterPage";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import HomePage from "../pages/HomePage";
import PreferencesPage from "../pages/PreferencesPage";
import ProfilePage from "../pages/ProfilePage";
import PersonalAreaPage from "../pages/PersonalAreaPage";
import MatchesPage from "../pages/MatchesPage";
import InterestsPage from "../pages/InterestsPage";
import SuggestionsPage from "../pages/SuggestionsPage.jsx";
import SuggestionDetailPage from "../pages/SuggestionDetailPage.jsx";
import ActiveSuggestionsPage from "../pages/ActiveSuggestionsPage.jsx";
import ActiveSuggestionDetailPage from "../pages/ActiveSuggestionDetailPage.jsx";
import MatchmakerPage from "../pages/MatchmakerPage.jsx";
import MatchmakerDetailPage from "../pages/MatchmakerDetailPage.jsx";
import AdminPage from "../pages/AdminPage";
import AdminDirectoryPage from "../pages/AdminDirectoryPage";
import AdminCasesPage from "../pages/AdminCasesPage";
import AdminSettingsPage from "../pages/AdminSettingsPage";
import ProtectedRoute from "../components/ProtectedRoute";
import AdminRoute from "../components/AdminRoute.jsx";
import AppLayout from "../components/layout/AppLayout.jsx";
import AdminMatchmakerPage from "../pages/AdminMatchmakerPage";
import SettingsPage from "../pages/SettingsPage";
import StatusesPage from "../pages/StatusesPage";
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
        <Route path="/home" element={<HomePage />} />
        <Route path="/personal-area" element={<PersonalAreaPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/statuses" element={<StatusesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/preferences" element={<PreferencesPage />} />
        <Route path="/suggestions/:kind/:id" element={<SuggestionDetailPage />} />
        <Route path="/suggestions" element={<SuggestionsPage />} />
        <Route path="/active/:id" element={<ActiveSuggestionDetailPage />} />
        <Route path="/active" element={<ActiveSuggestionsPage />} />
        <Route path="/matchmaker/:id" element={<MatchmakerDetailPage />} />
        <Route path="/matchmaker" element={<MatchmakerPage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/interests" element={<InterestsPage />} />
      </Route>

      {/* Admin Routes (with the site header) */}
      <Route element={<AdminRoute><AppLayout /></AdminRoute>}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/boys" element={<AdminDirectoryPage gender="male" />} />
        <Route path="/admin/girls" element={<AdminDirectoryPage gender="female" />} />
        <Route path="/admin/cases" element={<AdminCasesPage />} />
        <Route path="/admin/matchmaker" element={<AdminMatchmakerPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/users" element={<Navigate to="/admin/boys" replace />} />
        <Route path="/admin/pending-matches" element={<Navigate to="/admin/cases" replace />} />
      </Route>

      {/* Unknown addresses go to the right home page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
