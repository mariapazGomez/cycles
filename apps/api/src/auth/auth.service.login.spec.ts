import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService, DUMMY_PASSWORD_HASH } from "./auth.service";

// Igualar los tiempos del login (CYC-95, S-10): el login siempre corre bcrypt, y
// el hash ficticio nunca deja entrar a nadie.

function setup(user: object | null) {
  const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
  const alerts = { failedLogin: jest.fn() };
  const jwt = { sign: jest.fn().mockReturnValue("jwt") };
  const prismaFull = { ...prisma, refreshToken: { create: jest.fn() } };
  const service = new AuthService(prismaFull as never, jwt as never, { get: jest.fn() } as never, {} as never, alerts as never, {} as never, {} as never, { recordRegistration: jest.fn(), onEmailVerified: jest.fn() } as never);
  return { service, alerts };
}

describe("AuthService.login: tiempos iguales", () => {
  let compare: jest.SpyInstance;
  beforeEach(() => {
    compare = jest.spyOn(bcrypt, "compare");
  });
  afterEach(() => compare.mockRestore());

  it("el hash ficticio es un bcrypt de costo 12 válido", () => {
    expect(DUMMY_PASSWORD_HASH).toMatch(/^\$2[aby]\$12\$.{53}$/);
    expect(bcrypt.getRounds(DUMMY_PASSWORD_HASH)).toBe(12);
  });

  it("con un correo que no existe también corre bcrypt, contra el hash ficticio", async () => {
    const { service, alerts } = setup(null);
    await expect(service.login({ email: "nadie@e2e.test", password: "lo-que-sea-123" }, "1.1.1.1")).rejects.toThrow(UnauthorizedException);
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare).toHaveBeenCalledWith("lo-que-sea-123", DUMMY_PASSWORD_HASH);
    expect(alerts.failedLogin).toHaveBeenCalled();
  });

  it("con una cuenta solo de Google (sin contraseña) también corre bcrypt y no entra", async () => {
    const { service } = setup({ id: "u1", email: "g@e2e.test", passwordHash: null, emailVerifiedAt: new Date() });
    await expect(service.login({ email: "g@e2e.test", password: "lo-que-sea-123" }, "1.1.1.1")).rejects.toThrow(UnauthorizedException);
    expect(compare).toHaveBeenCalledWith("lo-que-sea-123", DUMMY_PASSWORD_HASH);
  });

  it("con una cuenta real y la contraseña equivocada corre bcrypt contra su hash y da el mismo error", async () => {
    const passwordHash = await bcrypt.hash("la-correcta-123", 4);
    const { service } = setup({ id: "u1", email: "a@e2e.test", passwordHash, emailVerifiedAt: new Date() });
    await expect(service.login({ email: "a@e2e.test", password: "la-equivocada-1" }, "1.1.1.1")).rejects.toThrow("Credenciales inválidas");
    expect(compare).toHaveBeenCalledWith("la-equivocada-1", passwordHash);
  });

  it("nadie entra «contraseña contra el hash ficticio»: ni siquiera si adivinara la contraseña de un hash vacío", async () => {
    const { service } = setup(null);
    // Aunque la comparación fuera verdadera, sin cuenta real no hay sesión.
    compare.mockResolvedValue(true);
    await expect(service.login({ email: "nadie@e2e.test", password: "x" }, "1.1.1.1")).rejects.toThrow(UnauthorizedException);
  });
});
