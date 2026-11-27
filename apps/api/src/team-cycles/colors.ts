// Paleta cerrada de la barra de un ciclo del equipo (docs/diseno/equipos-ancho-completo). La base
// guarda la clave; los valores de cada color los pone la web, que tiene la misma lista de claves.
export const TEAM_CYCLE_COLORS = ["blue", "violet", "teal", "magenta", "brown", "graphite"] as const;
export type TeamCycleColor = (typeof TEAM_CYCLE_COLORS)[number];

export const DEFAULT_COLOR: TeamCycleColor = "blue";

// El de un ciclo nuevo: el primero de la lista que no use otro ciclo del equipo sin archivar; si ya
// se usan todos, azul. Un ciclo sin color guardado es azul.
export function nextColor(used: (string | null)[]): TeamCycleColor {
  const taken = new Set(used.map((c) => c ?? DEFAULT_COLOR));
  return TEAM_CYCLE_COLORS.find((c) => !taken.has(c)) ?? DEFAULT_COLOR;
}
