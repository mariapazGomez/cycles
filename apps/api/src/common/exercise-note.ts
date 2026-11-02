// Nota del coach para el atleta, una por ejercicio (CYC-60). Texto libre y opcional.
// Puede mencionar la salud de la persona («cuida el hombro»): solo la ven el coach
// dueño y el atleta de esa sesión, y nunca va en los avisos (SEGURIDAD.md, R7).
export const NOTE_MAX_LENGTH = 500;

// undefined = no se toca; "" o solo espacios = borrar la nota (null); si no, el texto sin
// espacios de más.
export function cleanNote(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
