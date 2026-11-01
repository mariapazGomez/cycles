// Pruebas de extremo a extremo de la API (CYC-90, S-11): arrancan la aplicación
// real contra una base PostgreSQL de pruebas. Ver test/support/app.ts.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test",
  testRegex: "\\.e2e-spec\\.ts$",
  testTimeout: 60000,
  moduleNameMapper: {
    "^@cycles/shared$": "<rootDir>/../../../packages/shared/src",
  },
};
