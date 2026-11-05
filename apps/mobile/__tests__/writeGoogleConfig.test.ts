const { isValidClientId, reversedScheme, configSource, run } = require('../scripts/write-google-config');

test('acepta el formato de un ID de cliente de iOS y rechaza lo demás', () => {
  expect(isValidClientId('834971199177-m635kfhe6lc5jv0fq1jefjeltd38lpu5.apps.googleusercontent.com')).toBe(true);
  expect(isValidClientId('')).toBe(false);
  expect(isValidClientId('abc.apps.googleusercontent.com')).toBe(false);
  expect(isValidClientId('123-abc.example.com')).toBe(false);
  expect(isValidClientId("123-abc.apps.googleusercontent.com';rm -rf /")).toBe(false);
});

test('el esquema de URL es el ID invertido que exige Google', () => {
  expect(reversedScheme('123456-abc.apps.googleusercontent.com')).toBe('com.googleusercontent.apps.123456-abc');
});

test('el archivo generado exporta el ID', () => {
  expect(configSource('123456-abc.apps.googleusercontent.com')).toContain(
    "export const GOOGLE_IOS_CLIENT_ID = '123456-abc.apps.googleusercontent.com';",
  );
});

test('el archivo generado exporta también el ID de Android, vacío si no hay', () => {
  const both = configSource('1-a.apps.googleusercontent.com', '2-b.apps.googleusercontent.com');
  expect(both).toContain("export const GOOGLE_ANDROID_CLIENT_ID = '2-b.apps.googleusercontent.com';");
  expect(configSource('1-a.apps.googleusercontent.com')).toContain("export const GOOGLE_ANDROID_CLIENT_ID = '';");
});

test('sin variables no hace nada y con un ID mal formado de Android falla sin imprimir su valor', () => {
  const log = jest.spyOn(console, 'log').mockImplementation(() => {});
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(run({})).toBe(0);
  expect(run({ GOOGLE_ANDROID_CLIENT_ID: 'valor-secreto-mal-formado' })).toBe(1);
  expect(error.mock.calls.flat().join(' ')).not.toContain('valor-secreto-mal-formado');
  expect(error.mock.calls.flat().join(' ')).toContain('GOOGLE_ANDROID_CLIENT_ID');
  log.mockRestore();
  error.mockRestore();
});
