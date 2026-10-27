import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { AppLayout } from "./components/AppLayout";
import { useAuth } from "./hooks/useAuth";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CalendarPage } from "./pages/CalendarPage";
import { AcceptPolicyPage } from "./pages/AcceptPolicyPage";
import { AnalyticsBridge } from "./components/AnalyticsBridge";
import { ACCESS_CODE_PARAM, REGISTRATION_OPEN, loadAccessCode, storeAccessCode } from "./lib/features";
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
import { BibliotecaPage } from "./pages/BibliotecaPage";
import { RoutineEditorPage } from "./pages/RoutineEditorPage";
import { AthleteSummaryPage } from "./pages/AthleteSummaryPage";
import { SessionLogPage } from "./pages/SessionLogPage";
import { libraryPath } from "./lib/library";

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

// «Ciclos» del coach ahora vive en la Biblioteca; el atleta conserva «Mis ciclos».
function CyclesRoute() {
  const { user } = useAuth();
  if (user?.role === "coach") return <Navigate to={libraryPath("cycle")} replace />;
  return <CyclesPage />;
}

// El registro está cerrado al público (early adopters): se entra con el enlace
// privado del piloto, /register?codigo=…, que el equipo da a cada coach.
function RegisterRoute() {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get(ACCESS_CODE_PARAM);

  useEffect(() => {
    if (fromUrl) {
      storeAccessCode(fromUrl);
      // El código no se queda en la barra de direcciones ni en el historial.
      setParams({}, { replace: true });
    }
  }, [fromUrl, setParams]);

  const code = fromUrl ?? loadAccessCode();
  if (!REGISTRATION_OPEN && !code) return <Navigate to="/login" replace />;
  return (
    <PublicOnlyRoute>
      <RegisterPage accessCode={code} />
    </PublicOnlyRoute>
  );
}

export function App() {
  return (
    <>
      <AnalyticsBridge />
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
        element={<RegisterRoute />}
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
        path="/accept-policy"
        element={
          <ProtectedRoute require="any">
            <AcceptPolicyPage />
          </ProtectedRoute>
        }
      />
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
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="biblioteca" element={<BibliotecaPage />} />
        <Route path="cycles" element={<CyclesRoute />} />
        <Route path="routines" element={<Navigate to={libraryPath("routine")} replace />} />
        <Route path="routines/new" element={<RoutineEditorPage />} />
        <Route path="routines/:id" element={<RoutineEditorPage />} />
        <Route path="cycles/:id" element={<CycleDetailPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route path="sessions/:id/registro" element={<SessionLogPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
