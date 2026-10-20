import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { identifyUser, resetAnalytics, trackPageview } from "../lib/analytics";

// Une la analítica con la sesión y la navegación: identifica a la persona por su
// ID interno y su rol, y cuenta una visita por cada cambio de pantalla. No
// renderiza nada. Ver lib/analytics.ts.
export function AnalyticsBridge() {
  const { pathname } = useLocation();
  const { status, user } = useAuth();

  // Primero la identidad, para que la visita ya salga a nombre de la persona.
  useEffect(() => {
    if (user?.id) {
      identifyUser(user.id, user.role);
    } else if (status === "unauthenticated") {
      resetAnalytics();
    }
  }, [user?.id, user?.role, status]);

  useEffect(() => {
    if (status === "loading") return;
    trackPageview(pathname, status === "authenticated" ? "app" : "public");
  }, [pathname, status]);

  return null;
}
