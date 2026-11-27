// Calendario de un equipo (CYC-318 y docs/diseno/equipos-ancho-completo). Lógica pura.

export type BadgeTone = "ok" | "warn" | "pending";

// «(GMT-3)» según la zona del navegador (minutos como los da getTimezoneOffset).
export function gmtLabel(offsetMinutes: number): string {
  const total = -offsetMinutes;
  const sign = total >= 0 ? "+" : "-";
  const h = Math.floor(Math.abs(total) / 60);
  const m = Math.abs(total) % 60;
  return `GMT${total === 0 ? "" : `${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`}`;
}
