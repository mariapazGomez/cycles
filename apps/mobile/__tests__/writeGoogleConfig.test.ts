const { isValidClientId, reversedScheme, configSource } = require('../scripts/write-google-config');

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
