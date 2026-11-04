// Clave pública del proyecto de Sentry (DSN) para el reporte de caídas.
// Queda vacía en el repo: las compilaciones de producción la reciben de la
// variable de entorno SENTRY_DSN (Xcode Cloud y el flujo de Android) mediante
// `node scripts/write-sentry-config.js`, que reescribe este archivo solo en la
// copia de trabajo de la compilación. Vacía, el reporte queda apagado.
export const SENTRY_DSN: string = '';
