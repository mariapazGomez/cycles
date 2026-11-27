// Color de la barra de cada ciclo del equipo (docs/diseno/equipos-ancho-completo). Paleta cerrada:
// todos superan 4,5:1 con texto blanco y no hay rojo, verde ni naranja, que ya significan otra cosa.
// El color nunca es la única señal: el nombre va en la barra y en el encabezado. La API tiene la
// misma lista de claves (su prueba las compara).
export const TEAM_CYCLE_COLORS = [
  { key: "blue", name: "Azul", value: "#1b66dc" },
  { key: "violet", name: "Violeta", value: "#6d45c4" },
  { key: "teal", name: "Turquesa", value: "#0f766e" },
  { key: "magenta", name: "Magenta", value: "#a82d6b" },
  { key: "brown", name: "Café", value: "#7c5232" },
  { key: "graphite", name: "Grafito", value: "#3d4451" },
] as const;

export type TeamCycleColorKey = (typeof TEAM_CYCLE_COLORS)[number]["key"];

interface Colored {
  id: string;
  name: string;
  status: string;
  color?: string | null;
}

// Sin color guardado, azul.
export function colorOf(cycle: { color?: string | null }) {
  return TEAM_CYCLE_COLORS.find((c) => c.key === cycle.color) ?? TEAM_CYCLE_COLORS[0];
}

// El selector sale con dos o más ciclos sin archivar, aunque en el mes se vea uno. Si la API todavía
// no devuelve el color (la web puede publicarse antes), no sale: no se podría guardar.
export function canPickColor(cycle: Colored, cycles: Colored[]): boolean {
  return cycle.color !== undefined && cycle.status !== "archived" && cycles.filter((c) => c.status !== "archived").length >= 2;
}

// El nombre de otro ciclo que ya usa ese color.
export function colorUser(cycles: Colored[], key: string, exceptId: string): string | null {
  return cycles.find((c) => c.id !== exceptId && c.status !== "archived" && colorOf(c).key === key)?.name ?? null;
}
