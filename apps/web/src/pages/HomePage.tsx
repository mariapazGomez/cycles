import { useAuth } from "../hooks/useAuth";
import { AthletesPanel } from "../components/AthletesPanel";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <main style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
      <h1>Cycles</h1>
      <p>
        Bienvenido, {user?.name} ({user?.role}).
      </p>
      <p>Plataforma de ciclos de entrenamiento — en construcción.</p>
      <button type="button" className="button-secondary" style={{ width: "auto" }} onClick={() => logout()}>
        Cerrar sesión
      </button>

      {user?.role === "coach" && <AthletesPanel />}
    </main>
  );
}
