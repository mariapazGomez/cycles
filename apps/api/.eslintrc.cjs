// ESLint de la API (CYC-97). Reglas recomendadas de ESLint y de typescript-eslint,
// sin reglas que necesiten información de tipos (rápido y sin configurar el tsconfig).
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  env: { node: true, es2022: true, jest: true },
  ignorePatterns: ["dist", "node_modules", "prisma"],
  rules: {
    // Los argumentos y variables con guion bajo se ignoran a propósito (p. ej. `_dto`).
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    // Nest inyecta por constructor: las clases con solo decoradores no son un error.
    "@typescript-eslint/no-extraneous-class": "off",
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
