import { Logger } from "@nestjs/common";
import { AuthService } from "./auth.service";

// Igualar los tiempos de la recuperación de contraseña y del reenvío de
// verificación (CYC-95, S-10): la respuesta no depende de que la cuenta exista.

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const SLOW = 400; // lo que tardaría una base lenta o Resend

function setup(user: object | null, opts: { mailFails?: boolean } = {}) {
  const slow = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), SLOW));
  const prisma = {
    user: { findUnique: jest.fn(() => slow(user)) },
    passwordResetToken: { deleteMany: jest.fn(() => slow({})), create: jest.fn(() => slow({})) },
    emailVerificationToken: { deleteMany: jest.fn(() => slow({})), create: jest.fn(() => slow({})) },
  };
  const mail = {
    sendPasswordResetEmail: jest.fn(() => (opts.mailFails ? Promise.reject(new Error("Resend caído")) : slow(undefined))),
    sendVerificationEmail: jest.fn(() => slow(undefined)),
  };
  const service = new AuthService(prisma as never, {} as never, { get: jest.fn() } as never, mail as never, {} as never, {} as never, {} as never);
  return { service, prisma, mail };
}

async function elapsed(run: () => Promise<void>): Promise<number> {
  const start = Date.now();
  await run();
  return Date.now() - start;
}

const registered = { id: "u1", email: "a@e2e.test", passwordHash: "hash", emailVerifiedAt: null };

describe("recuperación de contraseña: mismo tiempo exista o no la cuenta", () => {
  it("responde de inmediato aunque la base y el envío tarden", async () => {
    const existing = setup(registered);
    const missing = setup(null);
    const withAccount = await elapsed(() => existing.service.requestPasswordReset("a@e2e.test"));
    const withoutAccount = await elapsed(() => missing.service.requestPasswordReset("nadie@e2e.test"));
    expect(withAccount).toBeLessThan(100);
    expect(withoutAccount).toBeLessThan(100);
    expect(Math.abs(withAccount - withoutAccount)).toBeLessThan(50);
  });

  it("igual hace el trabajo en segundo plano: crea el token y manda el correo", async () => {
    const { service, prisma, mail } = setup(registered);
    await service.requestPasswordReset("a@e2e.test");
    await new Promise((r) => setTimeout(r, SLOW * 5));
    expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
    expect(mail.sendPasswordResetEmail).toHaveBeenCalledWith("a@e2e.test", expect.any(String));
  });

  it("no hace nada con una cuenta que no existe o es solo de Google", async () => {
    const missing = setup(null);
    await missing.service.requestPasswordReset("nadie@e2e.test");
    const google = setup({ ...registered, passwordHash: null });
    await google.service.requestPasswordReset("a@e2e.test");
    await new Promise((r) => setTimeout(r, SLOW * 2));
    expect(missing.mail.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(google.mail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("si falla la base o el envío, quien pidió el correo no se entera y el log no lleva el email", async () => {
    const error = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const { service, prisma } = setup(registered);
    prisma.user.findUnique.mockImplementation(() => Promise.reject(new Error("a@e2e.test: conexión perdida")) as never);
    await expect(service.requestPasswordReset("a@e2e.test")).resolves.toBeUndefined();
    await flush();
    await flush();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).not.toContain("a@e2e.test");
    error.mockRestore();
  });
});

describe("reenvío de verificación: mismo tiempo exista o no la cuenta", () => {
  it("responde de inmediato en los tres casos (sin verificar, ya verificada, inexistente)", async () => {
    const times = [
      await elapsed(() => setup(registered).service.resendVerification("a@e2e.test")),
      await elapsed(() => setup({ ...registered, emailVerifiedAt: new Date() }).service.resendVerification("a@e2e.test")),
      await elapsed(() => setup(null).service.resendVerification("nadie@e2e.test")),
    ];
    for (const t of times) expect(t).toBeLessThan(100);
    expect(Math.max(...times) - Math.min(...times)).toBeLessThan(50);
  });

  it("igual manda el correo en segundo plano solo a una cuenta sin verificar", async () => {
    const pending = setup(registered);
    const verified = setup({ ...registered, emailVerifiedAt: new Date() });
    await pending.service.resendVerification("a@e2e.test");
    await verified.service.resendVerification("a@e2e.test");
    await new Promise((r) => setTimeout(r, SLOW * 5));
    expect(pending.mail.sendVerificationEmail).toHaveBeenCalledWith("a@e2e.test", expect.any(String));
    expect(verified.mail.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
