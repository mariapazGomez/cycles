/* eslint-disable @typescript-eslint/no-require-imports */
const { isValidDsn, render } = require('../scripts/write-sentry-config');

test('acepta la forma de una clave de Sentry y rechaza lo demás', () => {
  expect(isValidDsn('https://abc123def@o4500000.ingest.us.sentry.io/4500001')).toBe(true);
  expect(isValidDsn('https://abc123@o1.ingest.sentry.io/42')).toBe(true);
  expect(isValidDsn('')).toBe(false);
  expect(isValidDsn('http://abc@o1.ingest.sentry.io/42')).toBe(false);
  expect(isValidDsn('https://abc@otro-servidor.com/42')).toBe(false);
  expect(isValidDsn("https://abc@o1.ingest.sentry.io/42'; alert(1); '")).toBe(false);
});

test('el archivo generado solo exporta la clave', () => {
  const out = render('https://abc@o1.ingest.sentry.io/42');
  expect(out).toContain("export const SENTRY_DSN: string = 'https://abc@o1.ingest.sentry.io/42';");
});
