const dateFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

// «hoy», «hace 3 días»; sin dato es «Sin dato». La fecha exacta va en el title.
export function relativeDay(iso: string | null): string {
  if (!iso) return "Sin dato";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

export const roleLabel = (role: string) => (role === "coach" ? "Coach" : "Atleta");

export const modeLabel: Record<string, string> = {
  receive: "Solo recepción",
  send: "Solo envío",
  both: "Envío y recepción",
};
