import { validateEnv } from "./env.validation";

const base = {
  DATABASE_URL: "postgresql://localhost/x",
  JWT_ACCESS_SECRET: "a".repeat(64),
  JWT_REFRESH_SECRET: "b".repeat(64),
  FRONTEND_URL: "http://localhost:5173",
};

describe("validateEnv: portal del equipo y PostHog (CYC-193)", () => {
  it("sin las variables del portal arranca (las rutas /admin/* responden 401)", () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it("Cloudflare Access: las dos juntas o ninguna", () => {
    expect(() => validateEnv({ ...base, CF_ACCESS_AUD: "aud" })).toThrow(/CF_ACCESS_TEAM_DOMAIN/);
    expect(() => validateEnv({ ...base, CF_ACCESS_TEAM_DOMAIN: "equipo.cloudflareaccess.com" })).toThrow(/CF_ACCESS_AUD/);
    expect(() => validateEnv({ ...base, CF_ACCESS_TEAM_DOMAIN: "equipo.cloudflareaccess.com", CF_ACCESS_AUD: "aud" })).not.toThrow();
  });

  it("el dominio del equipo no lleva https:// ni es de otro sitio", () => {
    expect(() => validateEnv({ ...base, CF_ACCESS_TEAM_DOMAIN: "https://equipo.cloudflareaccess.com", CF_ACCESS_AUD: "aud" })).toThrow(/CF_ACCESS_TEAM_DOMAIN/);
    expect(() => validateEnv({ ...base, CF_ACCESS_TEAM_DOMAIN: "equipo.ejemplo.com", CF_ACCESS_AUD: "aud" })).toThrow(/CF_ACCESS_TEAM_DOMAIN/);
  });

  it("PostHog de lectura: clave y proyecto juntos o ninguno, y el error no muestra valores", () => {
    expect(() => validateEnv({ ...base, POSTHOG_PERSONAL_API_KEY: "phx_secreta" })).toThrow(/POSTHOG_PROJECT_ID/);
    try {
      validateEnv({ ...base, POSTHOG_PERSONAL_API_KEY: "phx_secreta" });
    } catch (error) {
      expect(String(error)).not.toContain("phx_secreta");
    }
    expect(() => validateEnv({ ...base, POSTHOG_PERSONAL_API_KEY: "phx_secreta", POSTHOG_PROJECT_ID: "123" })).not.toThrow();
  });
});
