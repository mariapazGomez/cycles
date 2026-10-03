import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { AppLayout } from "./components/AppLayout";
import { useAuth } from "./hooks/useAuth";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CheckEmailPage } from "./pages/CheckEmailPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage";
import { CompleteProfilePage } from "./pages/CompleteProfilePage";
import { AcceptInvitationPage } from "./pages/AcceptInvitationPage";
import { HomePage } from "./pages/HomePage";
import { AthletesPage } from "./pages/AthletesPage";
import { CyclesPage } from "./pages/CyclesPage";
import { CycleDetailPage } from "./pages/CycleDetailPage";
import { SessionDetailPage } from "./pages/SessionDetailPage";
import { RoutinesPage } from "./pages/RoutinesPage";
import { RoutineEditorPage } from "./pages/RoutineEditorPage";
import { AthleteSummaryPage } from "./pages/AthleteSummaryPage";
import { SessionLogPage } from "./pages/SessionLogPage";

// "/" es la landing para quien no tiene sesión y el inicio de la app para quien
// sí; el resto de rutas bajo "/" siguen exigiendo sesión.
function RootGate() {
  const { status } = useAuth();
  const { pathname } = useLocation();
  if (status === "unauthenticated" && pathname === "/") {
    return <LandingPage />;
  }
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnlyRoute>
            <ForgotPasswordPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/check-email" element={<CheckEmailPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute require="withoutRole">
            <CompleteProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={<RootGate />}
      >
        <Route index element={<HomePage />} />
        <Route path="athletes" element={<AthletesPage />} />
        <Route path="athletes/:athleteId" element={<AthleteSummaryPage />} />
        <Route path="cycles" element={<CyclesPage />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="routines/new" element={<RoutineEditorPage />} />
        <Route path="routines/:id" element={<RoutineEditorPage />} />
        <Route path="cycles/:id" element={<CycleDetailPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route path="sessions/:id/registro" element={<SessionLogPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
