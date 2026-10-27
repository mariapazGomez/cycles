// Pruebas de la API (primer paso de CYC-90). Corren sin base de datos: los
// servicios se prueban con un Prisma simulado.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: "\\.spec\\.ts$",
  moduleNameMapper: {
    "^@cycles/shared$": "<rootDir>/../../../packages/shared/src",
  },
};
