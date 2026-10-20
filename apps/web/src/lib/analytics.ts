import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";

// Analítica de uso con PostHog (T-179). Decisiones y límites de privacidad en
// docs/deploy/POSTHOG.md y en la política de privacidad v1.1:
//
// - Apagada por defecto: sin VITE_POSTHOG_KEY esto no hace nada.
// - Sin cookies ni almacenamiento local (`persistence: "memory"`): no guarda nada
//   en el navegador. Respeta la señal «No rastrear».
// - Solo eventos explícitos (sin autocaptura, sin grabación de pantalla, sin
//   encuestas ni banderas): no ve lo que la gente escribe ni toca.
// - La persona se identifica por su ID interno y su rol; nunca por nombre o correo.
// - NUNCA se envían datos de salud ni de entrenamiento (dolor, notas, cargas,
//   RIR, esfuerzo, comentarios). Los eventos solo llevan conteos y categorías.
// - Las direcciones se limpian antes de salir: sin query ni identificadores.

const KEY = (import.meta.env.VITE_POSTHOG_KEY ?? "").trim();
// Región UE por defecto (decisión 2026-10-20).
const HOST = (import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com").trim();

let started = false;

// "/cycles/6f1c…" → "/cycles/:id"; sin query ni hash (llevan tokens de enlaces).
export function safePath(url: string): string {
  let path = url;
  try {
    path = new URL(url, "https://app.local").pathname;
  } catch {
    path = url.split(/[?#]/)[0];
  }
  return path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id");
}

// PostHog agrega solo varias propiedades con la dirección de la página
// ($current_url, $session_entry_url, $referrer, …). Cualquier propiedad cuyo
// nombre termine en url, referrer o pathname y parezca una dirección se limpia.
const URL_KEY = /(url|referrer|pathname)$/i;

function looksLikeAddress(value: string): boolean {
  return value.startsWith("http") || value.startsWith("/");
}

function scrub(event: CaptureResult | null): CaptureResult | null {
  if (!event) return null;
  try {
    for (const bag of [event.properties, event.$set, event.$set_once] as Array<Record<string, unknown> | undefined>) {
      if (!bag) continue;
      for (const key of Object.keys(bag)) {
        const value = bag[key];
        if (URL_KEY.test(key) && typeof value === "string" && looksLikeAddress(value)) {
          bag[key] = safePath(value);
        }
      }
    }
    return event;
  } catch {
    // Ante la duda, el evento no sale.
    return null;
  }
}

export function initAnalytics(): void {
  if (started || !KEY) return;
  try {
    posthog.init(KEY, {
      api_host: HOST,
      persistence: "memory",
      person_profiles: "identified_only",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_exceptions: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      // No carga extensiones de terceros (grabación, encuestas): todo va en el paquete.
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
      respect_dnt: true,
      ip: false,
      before_send: scrub,
    });
    started = true;
  } catch {
    started = false;
  }
}

// Eventos que se miden. Sin identificadores y sin datos de salud en sus propiedades.
export type AnalyticsEvent =
  | "contact_requested"
  | "login_succeeded"
  | "coach_registered"
  | "athlete_invited"
  | "athlete_joined"
  | "cycle_created"
  | "routine_created"
  | "routine_assigned"
  | "session_closed";

// Propiedades permitidas: solo categorías y conteos.
type Props = Record<string, string | number | boolean>;

export function track(event: AnalyticsEvent, props?: Props): void {
  if (!started) return;
  try {
    posthog.capture(event, props);
  } catch {
    // La analítica nunca debe romper la app.
  }
}

export function trackPageview(pathname: string, area: "public" | "app"): void {
  if (!started) return;
  try {
    posthog.capture("$pageview", { $current_url: safePath(pathname), $pathname: safePath(pathname), area });
  } catch {
    // Igual que arriba.
  }
}

export function identifyUser(id: string, role: string | null): void {
  if (!started) return;
  try {
    posthog.identify(id, role ? { role } : undefined);
  } catch {
    // Igual que arriba.
  }
}

export function resetAnalytics(): void {
  if (!started) return;
  try {
    posthog.reset();
  } catch {
    // Igual que arriba.
  }
}
