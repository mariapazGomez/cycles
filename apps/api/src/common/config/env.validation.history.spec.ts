import { validateEnv } from "./env.validation";

const base = {
  DATABASE_URL: "postgresql://localhost/x",
  JWT_ACCESS_SECRET: "a".repeat(64),
  JWT_REFRESH_SECRET: "b".repeat(64),
  FRONTEND_URL: "http://localhost:5173",
};

describe("variables del historial de correos (CYC-295)", () => {
  it("sin ellas arranca (apagado)", () => {
    expect(() => validateEnv(base)).not.toThrow();
  });
  it("encendido sin clave no arranca", () => {
    expect(() => validateEnv({ ...base, EMAIL_HISTORY_ENABLED: "true" })).toThrow(/EMAIL_HISTORY_HMAC_KEY/);
  });
  it("rechaza una clave corta o igual a un secreto de sesión, sin mostrarla", () => {
    expect(() => validateEnv({ ...base, EMAIL_HISTORY_HMAC_KEY: "corta" })).toThrow(/al menos 64/);
    expect(() => validateEnv({ ...base, EMAIL_HISTORY_HMAC_KEY: base.JWT_ACCESS_SECRET })).toThrow(/distinta/);
  });
  it("encendido con una clave propia arranca", () => {
    expect(() => validateEnv({ ...base, EMAIL_HISTORY_ENABLED: "true", EMAIL_HISTORY_HMAC_KEY: "c".repeat(64) })).not.toThrow();
  });
});
