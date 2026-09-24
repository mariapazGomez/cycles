import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { AppLayout } from "./components/AppLayout";
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
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="athletes" element={<AthletesPage />} />
        <Route path="cycles" element={<CyclesPage />} />
        <Route path="routines" element={<RoutinesPage />} />
        <Route path="cycles/:id" element={<CycleDetailPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
