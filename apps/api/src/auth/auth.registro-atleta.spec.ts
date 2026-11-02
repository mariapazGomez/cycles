import { ForbiddenException } from "@nestjs/common";
import { AuthService } from "./auth.service";

function setup(open: boolean) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "u1", role: null }),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "u1", email: data.email })),
      update: jest.fn(),
    },
    policyAcceptance: { upsert: jest.fn() },
    emailVerificationToken: { deleteMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const activity = { coachJoined: jest.fn() };
  const config = { get: (key: string) => (key === "REGISTRATION_OPEN" && open ? "true" : undefined) };
  const mail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma as never, {} as never, config as never, mail as never, {} as never, activity as never, {} as never, { recordRegistration: jest.fn(), onEmailVerified: jest.fn() } as never);
  jest.spyOn(service as never, "issueEmailVerification" as never).mockResolvedValue(undefined as never);
  return { service, prisma, activity };
}

const base = { email: "a@x.cl", password: "12345678", name: "Ana", acceptPolicy: true };

describe("registro de atletas (CYC-187)", () => {
  it("con el registro abierto, una persona puede registrarse como atleta", async () => {
    const { service, prisma } = setup(true);
    await service.register({ ...base, role: "athlete" } as never);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ role: "athlete", authProvider: "local" }) });
  });

  it("con el registro cerrado, el atleta tampoco puede registrarse", async () => {
    const { service } = setup(false);
    await expect(service.register({ ...base, role: "athlete" } as never)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("completar perfil como atleta asigna el rol sin avisar que se sumó un coach", async () => {
    const { service, prisma, activity } = setup(true);
    await service.completeProfile("u1", { role: "athlete", acceptPolicy: true } as never);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: expect.objectContaining({ role: "athlete" }) });
    expect(activity.coachJoined).not.toHaveBeenCalled();
  });

  it("completar perfil como coach sí lo avisa", async () => {
    const { service, activity } = setup(true);
    await service.completeProfile("u1", { role: "coach", acceptPolicy: true } as never);
    expect(activity.coachJoined).toHaveBeenCalledWith("u1");
  });
});
