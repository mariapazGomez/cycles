// Avisos dentro de la app. Los textos se arman aquí, a partir del tipo y el
// payload, para que web y app digan lo mismo. Reglas y copy:
// docs/diseno/notificaciones/README.md. Sin datos de salud (R7).

export type NotificationType =
  | "plan_assigned"
  | "session_added"
  | "session_changed"
  | "session_scheduled"
  | "session_logged";

export interface AppNotification {
  id: string;
  type: NotificationType;
  planId: string | null;
  sessionId: string | null;
  count: number;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  // La hora que se muestra: la del último cambio que entró al aviso.
  at: string;
}

export type NotificationIcon = "plan" | "plus" | "edit" | "initials";

export type NotificationTarget =
  | { kind: "plan"; planId: string }
  | { kind: "session"; sessionId: string }
  | { kind: "sessionLog"; sessionId: string }
  | { kind: "athlete"; athleteId: string }
  | { kind: "none" };

export interface NotificationCopy {
  title: string;
  text: string;
  icon: NotificationIcon;
  // Iniciales del atleta, solo en los avisos del coach.
  initials?: string;
  target: NotificationTarget;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function notificationCopy(n: AppNotification): NotificationCopy {
  const p = n.payload;
  const coach = str(p.coachName, "Tu coach");
  const plan = str(p.planName, "tu ciclo");
  const routine = str(p.routineName, "tu sesión");
  const day = str(p.dayLabel);
  const athlete = str(p.athleteName, "Un atleta");
  const planTarget: NotificationTarget = n.planId ? { kind: "plan", planId: n.planId } : { kind: "none" };
  const sessionTarget: NotificationTarget = n.sessionId ? { kind: "session", sessionId: n.sessionId } : planTarget;

  switch (n.type) {
    case "plan_assigned":
      return {
        title: "Ciclo nuevo",
        text: `${coach} te asignó ${plan}. Ya puedes verlo.`,
        icon: "plan",
        target: planTarget,
      };
    case "session_added":
    case "session_changed": {
      if (n.count > 1) {
        return {
          title: `Cambios en ${plan}`,
          text: `${coach} hizo ${n.count} ajustes. Revísalos antes de entrenar.`,
          icon: "edit",
          target: planTarget,
        };
      }
      if (n.type === "session_added") {
        return {
          title: "Sesión nueva",
          text: `Hay una sesión nueva en ${plan}: ${routine}.`,
          icon: "plus",
          target: sessionTarget,
        };
      }
      return {
        title: "Cambió tu sesión",
        text: `${coach} ajustó ${routine}${day ? ` del ${day}` : ""}. Revísala antes de entrenar.`,
        icon: "edit",
        target: sessionTarget,
      };
    }
    case "session_scheduled": {
      const initials = initialsOf(athlete);
      if (n.count > 1) {
        return {
          title: "Sesión programada",
          text: `${athlete} programó ${n.count} sesiones en ${plan}.`,
          icon: "initials",
          initials,
          target: planTarget,
        };
      }
      return {
        title: "Sesión programada",
        text: `${athlete} programó ${routine}${day ? ` para el ${day}` : ""}.`,
        icon: "initials",
        initials,
        target: planTarget,
      };
    }
    case "session_logged": {
      const initials = initialsOf(athlete);
      if (n.count > 1) {
        const athleteId = str(p.athleteId);
        return {
          title: "Sesiones registradas",
          text: `${athlete} registró ${n.count} sesiones.`,
          icon: "initials",
          initials,
          target: athleteId ? { kind: "athlete", athleteId } : { kind: "none" },
        };
      }
      const target: NotificationTarget = n.sessionId ? { kind: "sessionLog", sessionId: n.sessionId } : { kind: "none" };
      const outcome = str(p.outcome);
      if (outcome === "skipped") {
        return {
          title: "Sesión omitida",
          text: `${athlete} no pudo entrenar ${routine}. Quedó como omitida.`,
          icon: "initials",
          initials,
          target,
        };
      }
      if (outcome === "partial") {
        return {
          title: "Completó una parte",
          text: `${athlete} completó una parte de ${routine}.`,
          icon: "initials",
          initials,
          target,
        };
      }
      return {
        title: "Sesión completada",
        text: `${athlete} completó ${routine}.`,
        icon: "initials",
        initials,
        target,
      };
    }
  }
}

// "ahora", "hace 12 min", "hace 3 h", "ayer", "12 oct".
export function notificationTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  if (hours < 48) return "ayer";
  return then.toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");
}

export function unreadLabel(count: number): string {
  if (count <= 0) return "Avisos, ninguno sin leer";
  return `Avisos, ${count} sin leer`;
}

export function unreadBadge(count: number): string {
  return count > 9 ? "9+" : String(count);
}
