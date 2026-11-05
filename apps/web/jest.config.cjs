// Pruebas de la web: solo lógica pura (rutas, marcas de la guía, filtros, gráficos), sin DOM.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "__tests__",
  testRegex: "\\.test\\.ts$",
  transform: {
    "^.+\\.(m?[jt]s|[jt]sx)$": ["ts-jest", { tsconfig: { module: "commonjs", target: "ES2020", strict: true, esModuleInterop: true, allowJs: true }, diagnostics: false }],
  },
  // d3 se publica solo como módulos ES: se transforman para que jest los lea.
  transformIgnorePatterns: ["/node_modules/(?!(d3-[a-z-]+|internmap)/)"],
  moduleNameMapper: { "^@cycles/shared$": "<rootDir>/../../../packages/shared/src" },
};
