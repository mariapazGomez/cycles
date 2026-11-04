import * as Sentry from '@sentry/react-native';
import type { ErrorEvent } from '@sentry/react-native';
import { SENTRY_DSN } from '../config/sentry';

// Reporte de caídas (CYC-104). Reglas: no sale nada de la persona (ni nombre,
// correo, cuenta, pantallas, peticiones, grabaciones ni migas de pan) y solo
// funciona en compilaciones Release con la clave de Sentry configurada. Lo que
// llega es el tipo de error, su traza, la versión de la app y el modelo del
// teléfono. Ver docs/SEGURIDAD.md.

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const TOKEN = /\b(?:eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*|Bearer\s+\S+)/g;
const URL_WITH_QUERY = /(https?:\/\/[^\s?#]+)[?#]\S*/g;
const MAX_TEXT = 300;

// Quita de un texto de error lo que podría identificar a alguien: correos,
// tokens y los parámetros de una URL. Además lo recorta.
export function redact(text: string): string {
  return text.replace(TOKEN, '[token]').replace(EMAIL, '[correo]').replace(URL_WITH_QUERY, '$1').slice(0, MAX_TEXT);
}

// Último filtro antes de enviar un evento: deja solo lo técnico.
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  delete event.user;
  delete event.request;
  delete event.extra;
  delete event.breadcrumbs;
  delete event.server_name;
  if (event.message) {
    event.message = redact(event.message);
  }
  event.exception?.values?.forEach(item => {
    if (item.value) {
      item.value = redact(item.value);
    }
  });
  if (event.contexts) {
    // El nombre del aparato suele ser el de su dueña; el idioma y la zona horaria acotan a una persona.
    delete event.contexts.culture;
    if (event.contexts.device) {
      delete event.contexts.device.name;
    }
  }
  return event;
}

let started = false;

// Enciende el reporte. No hace nada en desarrollo ni sin clave de Sentry.
export function initCrashReporting(): boolean {
  if (started || __DEV__ || !SENTRY_DSN) {
    return started;
  }
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: 'production',
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableAutoSessionTracking: false,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: scrubEvent,
  });
  started = true;
  return true;
}

// Registra un error que la app capturó (por ejemplo, el error boundary).
export function reportError(error: unknown, componentStack?: string | null) {
  if (!started) {
    return;
  }
  Sentry.captureException(error, componentStack ? { contexts: { react: { componentStack } } } : undefined);
}
