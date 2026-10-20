import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "./LoadingScreen";

interface ProtectedRouteProps {
  children: ReactNode;
  // "any": requiere sesión iniciada, sin importar si ya tiene rol asignado.
  // "withRole" (default): además exige rol asignado — si no, manda a completar perfil.
  // "withoutRole": lo contrario — para /complete-profile, que no debe verse si ya tiene rol.
  require?: "any" | "withRole" | "withoutRole";
}

export function ProtectedRoute({ children, require = "withRole" }: ProtectedRouteProps) {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  if (require === "withRole" && !user?.role) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Quien aún no aceptó la versión vigente de los Términos y la Política no
  // sigue hasta aceptarla (T-147).
  if (require === "withRole" && user?.needsPolicyAcceptance) {
    return <Navigate to="/accept-policy" replace />;
  }

  if (require === "withoutRole" && user?.role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
