import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface UsageRow {
  distinctId: string;
  visits: number;
  logins: number;
  routines: number;
  cycles: number;
  sessions: number;
  tourCompleted: number;
  tourSkipped: number;
  lastAt: string | null;
}

export interface ScreenRow {
  path: string;
  visits: number;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lee el uso de la web desde PostHog con una clave PERSONAL de solo lectura que
// vive solo en el servidor (S4). Las personas llegan identificadas por su ID
// interno: el cruce con nombre y correo se hace aquí, en la base, nunca en
// PostHog. Docs en docs/deploy/POSTHOG.md.
@Injectable()
export class PosthogService {
  constructor(private readonly config: ConfigService) {}

  private get key(): string {
    return (this.config.get<string>("POSTHOG_PERSONAL_API_KEY") ?? "").trim();
  }
  private get projectId(): string {
    return (this.config.get<string>("POSTHOG_PROJECT_ID") ?? "").trim();
  }
  private get host(): string {
    return ((this.config.get<string>("POSTHOG_API_HOST") ?? "").trim() || "https://eu.posthog.com").replace(/\/+$/, "");
  }

  get connected(): boolean {
    return Boolean(this.key && this.projectId);
  }

  private async query(hogql: string): Promise<unknown[][]> {
    let response: Response;
    try {
      response = await fetch(`${this.host}/api/projects/${encodeURIComponent(this.projectId)}/query/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query: { kind: "HogQLQuery", query: hogql } }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException({ code: "posthog_error", message: "No pudimos leer PostHog." });
    }
    if (!response.ok) {
      throw new ServiceUnavailableException({ code: "posthog_error", message: "No pudimos leer PostHog." });
    }
    const body = (await response.json()) as { results?: unknown[][] };
    return body.results ?? [];
  }

  // `excludeIds`: cuentas demo; se validan como UUID antes de armar la consulta.
  async usage(days: 7 | 30, excludeIds: string[]): Promise<{ users: UsageRow[]; screens: ScreenRow[] }> {
    const ids = excludeIds.filter((id) => UUID.test(id));
    const notDemo = ids.length ? `AND distinct_id NOT IN (${ids.map((id) => `'${id}'`).join(", ")})` : "";
    const since = `timestamp > now() - INTERVAL ${days} DAY`;

    const users = await this.query(`
      SELECT distinct_id,
        countIf(event = '$pageview') AS visits,
        countIf(event = 'login_succeeded') AS logins,
        countIf(event = 'routine_created') AS routines,
        countIf(event = 'cycle_created') AS cycles,
        countIf(event = 'session_closed') AS sessions,
        countIf(event = 'tour_completed') AS tour_completed,
        countIf(event = 'tour_skipped') AS tour_skipped,
        max(timestamp) AS last_at
      FROM events
      WHERE ${since} ${notDemo}
      GROUP BY distinct_id
      ORDER BY visits DESC
      LIMIT 200`);

    const screens = await this.query(`
      SELECT properties.$current_url AS path, count() AS visits
      FROM events
      WHERE event = '$pageview' AND ${since} ${notDemo}
      GROUP BY path
      ORDER BY visits DESC
      LIMIT 20`);

    return {
      users: users.map((r) => ({
        distinctId: String(r[0]),
        visits: Number(r[1]),
        logins: Number(r[2]),
        routines: Number(r[3]),
        cycles: Number(r[4]),
        sessions: Number(r[5]),
        tourCompleted: Number(r[6]),
        tourSkipped: Number(r[7]),
        lastAt: r[8] ? String(r[8]) : null,
      })),
      screens: screens.map((r) => ({ path: String(r[0] ?? ""), visits: Number(r[1]) })),
    };
  }
}
