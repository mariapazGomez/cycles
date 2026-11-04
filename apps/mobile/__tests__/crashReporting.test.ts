import * as Sentry from '@sentry/react-native';
import { redact, scrubEvent } from '../src/services/crashReporting';

const sentryMock = Sentry as unknown as { init: jest.Mock; captureException: jest.Mock };
const g = globalThis as unknown as { __DEV__: boolean };
const DSN = 'https://abc123@o1.ingest.us.sentry.io/42';

const initialDev = g.__DEV__;
afterEach(() => {
  g.__DEV__ = initialDev;
});

// Carga el módulo con una clave y un modo de compilación concretos (el modo se
// lee al arrancar el reporte, así que se mantiene hasta que termina la prueba).
function load(dev: boolean, dsn: string) {
  g.__DEV__ = dev;
  let mod!: typeof import('../src/services/crashReporting');
  jest.isolateModules(() => {
    jest.doMock('../src/config/sentry', () => ({ SENTRY_DSN: dsn }));
    mod = require('../src/services/crashReporting');
  });
  return mod;
}

beforeEach(() => jest.clearAllMocks());

describe('redact', () => {
  test('quita correos, tokens y los parámetros de una URL', () => {
    expect(redact('No existe ana.perez@gmail.com')).toBe('No existe [correo]');
    expect(redact('falló con Bearer abc.def.ghi')).toBe('falló con [token]');
    expect(redact('token eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.firma_larga123 vencido')).toBe('token [token] vencido');
    expect(redact('GET https://api.getcycles.app/reset?token=secreto&x=1 falló')).toBe('GET https://api.getcycles.app/reset falló');
  });

  test('recorta los mensajes largos', () => {
    expect(redact('x'.repeat(1000))).toHaveLength(300);
  });
});

describe('scrubEvent', () => {
  const event = () =>
    ({
      message: 'Error de ana@x.cl',
      user: { id: 'u1', email: 'ana@x.cl' },
      request: { url: 'https://api/x?token=1', headers: { Authorization: 'Bearer z' } },
      extra: { nombre: 'Ana' },
      breadcrumbs: [{ message: 'tap en Mi cuenta' }],
      server_name: 'iPhone de Ana',
      contexts: { device: { name: 'iPhone de Ana', model: 'iPhone16,2' }, culture: { locale: 'es-CL', timezone: 'America/Santiago' }, app: { app_version: '1.0.0' } },
      exception: { values: [{ type: 'TypeError', value: 'No se pudo leer ana@x.cl', stacktrace: { frames: [{ function: 'render' }] } }] },
    } as never);

  test('deja solo lo técnico', () => {
    const scrubbed = scrubEvent(event()) as unknown as Record<string, any>;
    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.request).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
    expect(scrubbed.breadcrumbs).toBeUndefined();
    expect(scrubbed.server_name).toBeUndefined();
    expect(scrubbed.contexts.culture).toBeUndefined();
    expect(scrubbed.contexts.device.name).toBeUndefined();
    expect(scrubbed.message).toBe('Error de [correo]');
    // Lo útil para corregir el error se conserva.
    expect(scrubbed.contexts.device.model).toBe('iPhone16,2');
    expect(scrubbed.contexts.app.app_version).toBe('1.0.0');
    expect(scrubbed.exception.values[0].type).toBe('TypeError');
    expect(scrubbed.exception.values[0].value).toBe('No se pudo leer [correo]');
    expect(scrubbed.exception.values[0].stacktrace.frames).toHaveLength(1);
  });
});

describe('arranque', () => {
  test('en desarrollo no se enciende', () => {
    const mod = load(true, DSN);
    expect(mod.initCrashReporting()).toBe(false);
    expect(sentryMock.init).not.toHaveBeenCalled();
  });

  test('sin clave de Sentry no se enciende', () => {
    const mod = load(false, '');
    expect(mod.initCrashReporting()).toBe(false);
    expect(sentryMock.init).not.toHaveBeenCalled();
  });

  test('en producción con clave se enciende sin datos de la persona, una sola vez', () => {
    const mod = load(false, DSN);
    expect(mod.initCrashReporting()).toBe(true);
    expect(mod.initCrashReporting()).toBe(true);
    expect(sentryMock.init).toHaveBeenCalledTimes(1);
    const options = sentryMock.init.mock.calls[0][0];
    expect(options).toMatchObject({
      dsn: DSN,
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      enableAutoSessionTracking: false,
      maxBreadcrumbs: 0,
    });
    expect(options.beforeBreadcrumb({ message: 'tap' })).toBeNull();
    // El filtro de datos personales es el que se conectó al envío.
    expect(options.beforeSend({ user: { id: 'u1' }, message: 'x' })).toEqual({ message: 'x' });
  });
});

describe('reportError', () => {
  test('no envía nada si el reporte está apagado', () => {
    load(true, DSN).reportError(new Error('x'));
    expect(sentryMock.captureException).not.toHaveBeenCalled();
  });

  test('con el reporte encendido envía el error y el árbol de componentes', () => {
    const mod = load(false, DSN);
    mod.initCrashReporting();
    const error = new Error('x');
    mod.reportError(error, '\n  in Pantalla');
    expect(sentryMock.captureException).toHaveBeenCalledWith(error, { contexts: { react: { componentStack: '\n  in Pantalla' } } });
  });
});
