// Pruebas de la web: solo lógica pura (rutas y marcas de la guía), sin DOM.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "__tests__",
  testRegex: "\\.test\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { module: "commonjs", target: "ES2020", strict: true, esModuleInterop: true }, diagnostics: false }],
  },
  moduleNameMapper: { "^@cycles/shared$": "<rootDir>/../../../packages/shared/src" },
};
