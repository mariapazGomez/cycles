export const NOTE_MAX_LENGTH = 500;

// Lo que ve el atleta: la nota del coach para un ejercicio (CYC-62). Texto libre que
// puede hablar de salud: se muestra solo en las pantallas del atleta y del coach de
// esa sesión, y no viaja en los avisos.
export function CoachNote({ note }: { note: string | null | undefined }) {
  if (!note) return null;
  return (
    <p className="ex-note">
      <strong>Nota de tu coach</strong>
      {note}
    </p>
  );
}
