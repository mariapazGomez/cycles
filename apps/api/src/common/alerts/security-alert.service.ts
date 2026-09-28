import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { maskEmail, postToSlack, slackValue } from "../slack/slack";

// Alertas de seguridad a Slack (docs/PLAN-Seguridad.md, 1E). Avisan cuando
// las defensas se activan de una forma que no parece un usuario
// equivocándose. Los contadores viven en memoria, igual que el throttler:
// alcanza con una instancia de la API; con varias, pasan a Redis.
// Nunca incluir contraseñas, tokens ni enlaces con token (R8).

const MINUTE = 60_000;

// Umbrales iniciales: están aquí para ajustarlos fácil, igual que LIMITS.
export const ALERT_RULES = {
  // Una IP que prueba muchos emails distintos en el login.
  ipManyEmails: { distinctEmails: 10, windowMs: 10 * MINUTE },
  // Una cuenta con muchos logins fallidos desde varias IPs.
  accountManyIps: { failures: 10, distinctIps: 3, windowMs: 15 * MINUTE },
  // Una IP bloqueada varias veces por el límite de intentos.
  ipThrottled: { blocks: 3, windowMs: 10 * MINUTE },
  // Resend falla varias veces seguidas.
  mailFailures: { failures: 5, windowMs: 15 * MINUTE },
  // Anti-inundación: como máximo 1 alerta por patrón y por IP o cuenta.
  cooldownMs: 15 * MINUTE,
} as const;

const LOCAL_TIME_ZONE = "America/Santiago";
const SWEEP_EVERY_MS = 5 * MINUTE;

type Level = "Alta" | "Media";

interface Alert {
  pattern: string;
  key: string;
  level: Level;
  title: string;
  fields: Record<string, string | number | undefined>;
}

interface Hit {
  at: number;
  value: string;
}

@Injectable()
export class SecurityAlertService implements OnModuleDestroy {
  private readonly logger = new Logger(SecurityAlertService.name);
  private readonly webhookUrl: string | undefined;

  // Eventos recientes por clave; cada Hit guarda el dato que se cuenta como distinto.
  private readonly failedLoginsByIp = new Map<string, Hit[]>();
  private readonly failedLoginsByEmail = new Map<string, Hit[]>();
  private readonly throttledByIp = new Map<string, Hit[]>();
  private mailFailures: Hit[] = [];

  // Anti-inundación: última alerta enviada por patrón+clave y cuántas se omitieron desde entonces.
  private readonly sent = new Map<string, { at: number; suppressed: number }>();

  private readonly sweepTimer: NodeJS.Timeout;

  constructor(private readonly config: ConfigService) {
    this.webhookUrl = this.config.get<string>("SLACK_SECURITY_WEBHOOK_URL")?.trim() || undefined;
    if (!this.webhookUrl) {
      this.logger.warn("SLACK_SECURITY_WEBHOOK_URL no está definida: las alertas de seguridad solo quedan en el log.");
    }
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_EVERY_MS);
    this.sweepTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.sweepTimer);
  }

  failedLogin(ip: string, email: string, route: string): void {
    const now = Date.now();
    const normalized = email.trim().toLowerCase();

    const byIp = this.record(this.failedLoginsByIp, ip, normalized, now, ALERT_RULES.ipManyEmails.windowMs);
    const distinctEmails = new Set(byIp.map((h) => h.value)).size;
    if (distinctEmails >= ALERT_RULES.ipManyEmails.distinctEmails) {
      this.emit({
        pattern: "ip-many-emails",
        key: ip,
        level: "Alta",
        title: "Una IP está probando muchos emails distintos en el login",
        fields: { IP: ip, "Emails distintos": distinctEmails, Ventana: "10 min", Ruta: route },
      });
    }

    const byEmail = this.record(this.failedLoginsByEmail, normalized, ip, now, ALERT_RULES.accountManyIps.windowMs);
    const distinctIps = new Set(byEmail.map((h) => h.value)).size;
    if (byEmail.length >= ALERT_RULES.accountManyIps.failures && distinctIps >= ALERT_RULES.accountManyIps.distinctIps) {
      this.emit({
        pattern: "account-many-ips",
        key: normalized,
        level: "Alta",
        title: "Una cuenta recibe logins fallidos desde varias IPs",
        fields: {
          Cuenta: maskEmail(normalized),
          "Intentos fallidos": byEmail.length,
          "IPs distintas": distinctIps,
          "Última IP": ip,
          Ventana: "15 min",
          Ruta: route,
        },
      });
    }
  }

  throttled(ip: string, route: string): void {
    const hits = this.record(this.throttledByIp, ip, route, Date.now(), ALERT_RULES.ipThrottled.windowMs);
    if (hits.length >= ALERT_RULES.ipThrottled.blocks) {
      this.emit({
        pattern: "ip-throttled",
        key: ip,
        level: "Media",
        title: "Una IP fue bloqueada varias veces por el límite de intentos",
        fields: {
          IP: ip,
          Bloqueos: hits.length,
          Ventana: "10 min",
          Rutas: [...new Set(hits.map((h) => h.value))].join(", "),
        },
      });
    }
  }

  refreshTokenReused(ip: string, email: string, route: string): void {
    this.emit({
      pattern: "refresh-reuse",
      key: email.trim().toLowerCase(),
      level: "Alta",
      title: "Se reusó un refresh token ya rotado: se cerraron todas las sesiones de la cuenta",
      fields: { Cuenta: maskEmail(email), IP: ip, Ruta: route },
    });
  }

  mailFailed(): void {
    const now = Date.now();
    this.mailFailures = this.prune(this.mailFailures, now, ALERT_RULES.mailFailures.windowMs);
    this.mailFailures.push({ at: now, value: "" });
    if (this.mailFailures.length >= ALERT_RULES.mailFailures.failures) {
      this.emit({
        pattern: "mail-failures",
        key: "resend",
        level: "Media",
        title: "Resend no está enviando emails",
        fields: { "Envíos fallidos": this.mailFailures.length, Ventana: "15 min" },
      });
    }
  }

  private record(map: Map<string, Hit[]>, key: string, value: string, now: number, windowMs: number): Hit[] {
    const hits = this.prune(map.get(key) ?? [], now, windowMs);
    hits.push({ at: now, value });
    map.set(key, hits);
    return hits;
  }

  private prune(hits: Hit[], now: number, windowMs: number): Hit[] {
    return hits.filter((h) => now - h.at < windowMs);
  }

  // Libera memoria: borra claves sin eventos recientes.
  private sweep(): void {
    const now = Date.now();
    const clean = (map: Map<string, Hit[]>, windowMs: number) => {
      for (const [key, hits] of map) {
        const kept = this.prune(hits, now, windowMs);
        if (kept.length === 0) map.delete(key);
        else map.set(key, kept);
      }
    };
    clean(this.failedLoginsByIp, ALERT_RULES.ipManyEmails.windowMs);
    clean(this.failedLoginsByEmail, ALERT_RULES.accountManyIps.windowMs);
    clean(this.throttledByIp, ALERT_RULES.ipThrottled.windowMs);
    this.mailFailures = this.prune(this.mailFailures, now, ALERT_RULES.mailFailures.windowMs);
    for (const [key, entry] of this.sent) {
      if (now - entry.at >= ALERT_RULES.cooldownMs && entry.suppressed === 0) this.sent.delete(key);
    }
  }

  private emit(alert: Alert): void {
    const now = Date.now();
    const sentKey = `${alert.pattern}:${alert.key}`;
    const previous = this.sent.get(sentKey);
    if (previous && now - previous.at < ALERT_RULES.cooldownMs) {
      previous.suppressed += 1;
      return;
    }
    this.sent.set(sentKey, { at: now, suppressed: 0 });

    const fields = { ...alert.fields };
    if (previous?.suppressed) {
      fields["Repeticiones omitidas desde la alerta anterior"] = previous.suppressed;
    }
    const at = new Date(now);
    fields["Hora"] = `${at.toISOString().replace("T", " ").slice(0, 19)} UTC (${at.toLocaleString("es-CL", { timeZone: LOCAL_TIME_ZONE, hour12: false })} Chile)`;
    const entries = Object.entries(fields).filter(([, v]) => v !== undefined && v !== "");

    this.logger.warn(`[${alert.level}] ${alert.title} | ${entries.map(([k, v]) => `${k}: ${v}`).join(" | ")}`);

    const icon = alert.level === "Alta" ? ":rotating_light:" : ":warning:";
    const slackText = [
      `${icon} *[${alert.level}] ${alert.title}*`,
      ...entries.map(([k, v]) => `• *${k}:* ${slackValue(v as string | number)}`),
    ].join("\n");
    // En segundo plano: una falla de Slack nunca afecta la respuesta de la API.
    if (this.webhookUrl) void postToSlack(this.webhookUrl, slackText, this.logger);
  }
}
