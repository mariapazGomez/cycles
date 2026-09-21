import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { LoadingScreen } from "./LoadingScreen";

// Para /login, /register, /forgot-password: si ya hay sesión activa, no
// tiene sentido mostrarlas — se redirige a donde corresponda.
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to={user?.role ? "/" : "/complete-profile"} replace />;
  }

  return <>{children}</>;
}
