#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console */
// Escribe src/config/sentry.ts con la clave pública del proyecto de Sentry que
// llega en la variable de entorno SENTRY_DSN. Se corre al compilar en Xcode
// Cloud y en GitHub Actions; en la máquina de desarrollo no hace falta (el
// reporte solo se activa en compilaciones Release). Sin la variable no cambia
// nada y la app compila con el reporte apagado. Nunca imprime la clave.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'config', 'sentry.ts');
// https://<clave>@<organización>.ingest[.<región>].sentry.io/<proyecto>
const DSN_FORMAT = /^https:\/\/[0-9a-f]+@[\w.-]+\.sentry\.io\/\d+$/i;

function isValidDsn(value) {
  return DSN_FORMAT.test(value);
}

function render(dsn) {
  return `// Generado al compilar por scripts/write-sentry-config.js. No se sube al repositorio.
export const SENTRY_DSN: string = '${dsn}';
`;
}

function main() {
  const dsn = (process.env.SENTRY_DSN || '').trim();
  if (!dsn) {
    console.log('SENTRY_DSN no está definida: el reporte de caídas queda apagado.');
    return 0;
  }
  if (!isValidDsn(dsn)) {
    console.error('SENTRY_DSN no tiene el formato de una clave de Sentry (https://clave@organizacion.ingest.sentry.io/proyecto).');
    return 1;
  }
  fs.writeFileSync(FILE, render(dsn));
  console.log('Clave de Sentry escrita en src/config/sentry.ts (reporte de caídas activo).');
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { isValidDsn, render };
