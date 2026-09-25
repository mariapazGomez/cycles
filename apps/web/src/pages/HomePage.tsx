import { useAuth } from "../hooks/useAuth";
import { AttentionPage } from "./AttentionPage";
import { TodayPage } from "./TodayPage";

// La pantalla de inicio depende del rol: el coach ve qué atletas necesitan
// atención; el atleta, su próxima sesión.
export function HomePage() {
  const { user } = useAuth();
  return user?.role === "coach" ? <AttentionPage /> : <TodayPage />;
}
