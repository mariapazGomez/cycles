import { ConflictException, ForbiddenException } from "@nestjs/common";
import { APPLE_HIDDEN_EMAIL_MESSAGE, AuthService, NO_ACCOUNT_MESSAGE, REGISTRATION_CLOSED_MESSAGE } from "./auth.service";

const dto = { idToken: "t", nonce: "nonce-aleatorio-de-prueba-1234" };

function setup(opts: {
  verified?: { subject: string; email: string | null; emailVerified: boolean };
  identity?: unknown;
  user?: unknown;
  open?: boolean;
}) {
  const prisma = {
    userIdentity: {
      findUnique: jest.fn().mockResolvedValue(opts.identity ?? null),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue(opts.user ?? null),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...(opts.user as object), ...data })),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "nuevo", ...data })),
    },
  };
  const verifier = {
    verify: jest.fn().mockResolvedValue(opts.verified ?? { subject: "s1", email: "ana@x.cl", emailVerified: true }),
  };
  const config = { get: (key: string) => (key === "REGISTRATION_OPEN" && opts.open ? "true" : undefined) };
  const service = new AuthService(prisma as never, {} as never, config as never, {} as never, {} as never, {} as never, verifier as never, { recordRegistration: jest.fn(), onEmailVerified: jest.fn() } as never);
  const issue = jest.spyOn(service as never, "issueTokenPair" as never).mockImplementation(((u: { id: string }) =>
    Promise.resolve({ accessToken: `a-${u.id}`, refreshToken: "r" })) as never);
  return { service, prisma, verifier, issue };
}

describe("AuthService.loginWithIdentityToken", () => {
  it("entra con la identidad ya vinculada, sin mirar el correo", async () => {
    const { service, prisma } = setup({ identity: { user: { id: "u1" } } });
    await expect(service.loginWithIdentityToken("apple", dto)).resolves.toMatchObject({ accessToken: "a-u1" });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.userIdentity.findUnique).toHaveBeenCalledWith({
      where: { provider_subject: { provider: "apple", subject: "s1" } },
      include: { user: true },
    });
  });

  it("vincula por correo verificado y verifica el correo de la cuenta si faltaba", async () => {
    const { service, prisma } = setup({ user: { id: "u2", emailVerifiedAt: null } });
    await expect(service.loginWithIdentityToken("google", dto)).resolves.toMatchObject({ accessToken: "a-u2" });
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.userIdentity.create).toHaveBeenCalledWith({
      data: { userId: "u2", provider: "google", subject: "s1", email: "ana@x.cl" },
    });
  });

  it("no vincula por un correo que el proveedor no verificó", async () => {
    const { service, prisma } = setup({
      verified: { subject: "s1", email: "ana@x.cl", emailVerified: false },
      user: { id: "u2", emailVerifiedAt: new Date() },
    });
    await expect(service.loginWithIdentityToken("google", dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.userIdentity.create).not.toHaveBeenCalled();
  });

  it("con el registro cerrado no crea cuentas", async () => {
    const { service, prisma } = setup({});
    await expect(service.loginWithIdentityToken("google", dto)).rejects.toThrow(REGISTRATION_CLOSED_MESSAGE);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("con «Ocultar mi correo» de Apple explica qué hacer", async () => {
    const { service } = setup({ verified: { subject: "s1", email: "abc@privaterelay.appleid.com", emailVerified: true } });
    await expect(service.loginWithIdentityToken("apple", dto)).rejects.toThrow(APPLE_HIDDEN_EMAIL_MESSAGE);
  });

  it("con el registro abierto tampoco crea cuentas: manda a registrarse en la web", async () => {
    const { service, prisma } = setup({ open: true });
    const error = await service.loginWithIdentityToken("apple", dto).catch((e) => e);
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error.getResponse()).toMatchObject({ message: NO_ACCOUNT_MESSAGE, code: "no_account" });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("sin correo verificado y sin cuenta, también responde «sin cuenta»", async () => {
    const { service, prisma } = setup({ open: true, verified: { subject: "s1", email: null, emailVerified: false } });
    await expect(service.loginWithIdentityToken("apple", dto)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});


describe("AuthService.linkIdentity (Vincular Apple)", () => {
  it("vincula la cuenta de Apple verificada a la cuenta con sesión", async () => {
    const { service, prisma, verifier } = setup({});
    await expect(service.linkIdentity("u1", "apple", dto)).resolves.toBeUndefined();
    expect(verifier.verify).toHaveBeenCalledWith("apple", dto.idToken, dto.nonce);
    expect(prisma.userIdentity.create).toHaveBeenCalledWith({
      data: { userId: "u1", provider: "apple", subject: "s1", email: "ana@x.cl" },
    });
  });

  it("no guarda un correo que Apple no verificó", async () => {
    const { service, prisma } = setup({ verified: { subject: "s1", email: "ana@x.cl", emailVerified: false } });
    await service.linkIdentity("u1", "apple", dto);
    expect(prisma.userIdentity.create).toHaveBeenCalledWith({
      data: { userId: "u1", provider: "apple", subject: "s1", email: null },
    });
  });

  it("repetir lo ya vinculado no es un error ni crea otra identidad", async () => {
    const { service, prisma } = setup({ identity: { userId: "u1" } });
    await expect(service.linkIdentity("u1", "apple", dto)).resolves.toBeUndefined();
    expect(prisma.userIdentity.create).not.toHaveBeenCalled();
  });

  it("una cuenta de Apple de otra cuenta de Cycles se rechaza sin vincular", async () => {
    const { service, prisma } = setup({ identity: { userId: "otra" } });
    await expect(service.linkIdentity("u1", "apple", dto)).rejects.toThrow("Esa cuenta de Apple ya está vinculada a otra cuenta de Cycles.");
    expect(prisma.userIdentity.create).not.toHaveBeenCalled();
  });

  it("una cuenta de Cycles con otra Apple ya vinculada la rechaza", async () => {
    const { service, prisma } = setup({});
    prisma.userIdentity.findFirst.mockResolvedValue({ userId: "u1", subject: "otro-sub" });
    await expect(service.linkIdentity("u1", "apple", dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.userIdentity.create).not.toHaveBeenCalled();
  });

  it("si dos pedidos llegan a la vez, el índice único deja pasar solo uno", async () => {
    const { service, prisma } = setup({});
    prisma.userIdentity.create.mockRejectedValue({ code: "P2002" });
    await expect(service.linkIdentity("u1", "apple", dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it("un token de Apple inválido no vincula nada", async () => {
    const { service, prisma, verifier } = setup({});
    verifier.verify.mockRejectedValue(new Error("token inválido"));
    await expect(service.linkIdentity("u1", "apple", dto)).rejects.toThrow("token inválido");
    expect(prisma.userIdentity.create).not.toHaveBeenCalled();
  });
});
