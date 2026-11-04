import { validateEnv } from "./env.validation";

const base = {
  DATABASE_URL: "postgresql://localhost/x",
  JWT_ACCESS_SECRET: "a".repeat(64),
  JWT_REFRESH_SECRET: "b".repeat(64),
  FRONTEND_URL: "http://localhost:5173",
};

describe("validateEnv: Sign in with Apple (CYC-220)", () => {
  it("sin la llave arranca (la revocación se omite y queda un aviso)", () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it("el identificador y el contenido de la llave van juntos o ninguno", () => {
    expect(() => validateEnv({ ...base, APPLE_KEY_ID: "ABC123DEFG" })).toThrow(/APPLE_PRIVATE_KEY/);
    expect(() => validateEnv({ ...base, APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----" })).toThrow(/APPLE_KEY_ID/);
    expect(() => validateEnv({ ...base, APPLE_KEY_ID: "ABC123DEFG", APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----" })).not.toThrow();
  });

  it("el error nunca muestra el valor de la llave", () => {
    try {
      validateEnv({ ...base, APPLE_PRIVATE_KEY: "contenido-secreto" });
    } catch (error) {
      expect((error as Error).message).not.toContain("contenido-secreto");
    }
  });
});
