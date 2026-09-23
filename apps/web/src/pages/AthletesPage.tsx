import { AthletesPanel } from "../components/AthletesPanel";

export function AthletesPage() {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", marginBottom: 4 }}>Atletas</h1>
      <p style={{ color: "var(--color-ink-secondary)", marginTop: 0 }}>
        Invitá atletas y llevá el control de quién ya activó su cuenta.
      </p>
      <AthletesPanel />
    </div>
  );
}
