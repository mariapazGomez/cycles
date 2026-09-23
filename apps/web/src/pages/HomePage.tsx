import { useAuth } from "../hooks/useAuth";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)" }}>Hola, {user?.name}</h1>
      <p style={{ color: "var(--color-ink-secondary)" }}>
        {user?.role === "coach"
          ? "Gestioná tus atletas y sus planes de entrenamiento desde el menú de arriba."
          : "Plataforma de ciclos de entrenamiento — en construcción."}
      </p>
    </div>
  );
}
