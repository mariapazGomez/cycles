import { BadRequestException, ConflictException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { AthletesService } from "./athletes.service";

type Rel = { coachId: string; status: string };
const dto = { email: "ana@x.cl", name: "Ana" };

function setup(existing: { id?: string; role?: string; athleteRelations?: Rel[] } | null = null, mailFails = false) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(existing ? { id: "a1", email: dto.email, ...existing } : null),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ name: "Coach" }),
      create: jest.fn().mockResolvedValue({ id: "nuevo", email: dto.email }),
      delete: jest.fn(),
    },
    coachAthlete: { create: jest.fn().mockResolvedValue({ id: "rel1" }), delete: jest.fn() },
    athleteInvitationToken: { create: jest.fn(), deleteMany: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const mail = {
    sendAthleteInvitationEmail: mailFails ? jest.fn().mockRejectedValue(new Error("x")) : jest.fn().mockResolvedValue(undefined),
  };
  const activity = { invitationSent: jest.fn(), athleteJoined: jest.fn() };
  const service = new AthletesService(prisma as never, mail as never, {} as never, activity as never);
  return { service, prisma, mail };
}

describe("AthletesService.invite", () => {
  it("un correo sin cuenta crea al atleta incompleto", async () => {
    const { service, prisma, mail } = setup();
    await service.invite("c1", dto);
    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.coachAthlete.create).toHaveBeenCalledWith({ data: { coachId: "c1", athleteId: "nuevo", status: "pending" } });
    expect(mail.sendAthleteInvitationEmail).toHaveBeenCalled();
  });

  it("un atleta que se registró solo y no tiene coach se vincula sin crear otra cuenta", async () => {
    const { service, prisma } = setup({ role: "athlete", athleteRelations: [] });
    await service.invite("c1", dto);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(prisma.coachAthlete.create).toHaveBeenCalledWith({ data: { coachId: "c1", athleteId: "a1", status: "pending" } });
  });

  it.each([
    ["un coach", { role: "coach", athleteRelations: [] }],
    ["un atleta con coach activo", { role: "athlete", athleteRelations: [{ coachId: "otro", status: "active" }] }],
  ])("rechaza %s", async (_n, existing) => {
    const { service, prisma } = setup(existing);
    await expect(service.invite("c1", dto)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.coachAthlete.create).not.toHaveBeenCalled();
  });

  it("rechaza al atleta que ya está en la lista de ese coach", async () => {
    const { service } = setup({ role: "athlete", athleteRelations: [{ coachId: "c1", status: "pending" }] });
    await expect(service.invite("c1", dto)).rejects.toThrow("ya está en tu lista");
  });

  it("si el correo no sale, deshace la relación pero no borra la cuenta que ya existía", async () => {
    const { service, prisma } = setup({ role: "athlete", athleteRelations: [] }, true);
    await expect(service.invite("c1", dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.coachAthlete.delete).toHaveBeenCalled();
  });

  it("si el correo no sale con una cuenta nueva, la borra", async () => {
    const { service, prisma } = setup(null, true);
    await expect(service.invite("c1", dto)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.user.delete).toHaveBeenCalled();
  });
});

describe("AthletesService.acceptInvitation", () => {
  function accept(athlete: object, password?: string, record: object = {}) {
    const prisma = {
      athleteInvitationToken: {
        findUnique: jest.fn().mockResolvedValue({
          id: "t1",
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          coachAthleteId: "rel1",
          coachAthlete: { athleteId: "a1", coachId: "c1", athlete },
          ...record,
        }),
        update: jest.fn(),
      },
      coachAthlete: { update: jest.fn() },
      user: { update: jest.fn().mockImplementation(({ data }) => ({ id: "a1", ...data })) },
      policyAcceptance: { upsert: jest.fn() },
      $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
    };
    const auth = { issueTokenPair: jest.fn().mockResolvedValue({ accessToken: "A", refreshToken: "R" }) };
    const service = new AthletesService(prisma as never, {} as never, auth as never, { athleteJoined: jest.fn() } as never);
    return { prisma, auth, run: () => service.acceptInvitation("raw", password) };
  }

  it("cuenta nueva: guarda la contraseña y abre sesión", async () => {
    const { run, auth, prisma } = accept({ passwordHash: null, authProvider: "local", emailVerifiedAt: null }, "12345678");
    await expect(run()).resolves.toEqual({ linked: false, tokens: { accessToken: "A", refreshToken: "R" } });
    expect(auth.issueTokenPair).toHaveBeenCalled();
    expect(prisma.user.update.mock.calls[0][0].data.passwordHash).toBeTruthy();
  });

  it("cuenta nueva sin contraseña: pide una", async () => {
    const { run } = accept({ passwordHash: null, authProvider: "local", emailVerifiedAt: null });
    await expect(run()).rejects.toBeInstanceOf(BadRequestException);
  });

  it("atleta que ya tenía cuenta: se vincula, no cambia su contraseña y no abre sesión", async () => {
    const { run, auth, prisma } = accept({ passwordHash: "hash", authProvider: "local", emailVerifiedAt: new Date() });
    await expect(run()).resolves.toEqual({ linked: true });
    expect(auth.issueTokenPair).not.toHaveBeenCalled();
    expect(prisma.user.update.mock.calls[0][0].data.passwordHash).toBeUndefined();
    expect(prisma.coachAthlete.update).toHaveBeenCalledWith({ where: { id: "rel1" }, data: { status: "active" } });
  });

  it("cuenta de Google o Apple sin contraseña también se vincula directo", async () => {
    const { run } = accept({ passwordHash: null, authProvider: "google", emailVerifiedAt: new Date() });
    await expect(run()).resolves.toEqual({ linked: true });
  });

  it("rechaza un enlace vencido o usado", async () => {
    const { run } = accept({ passwordHash: "h", authProvider: "local" }, undefined, { usedAt: new Date() });
    await expect(run()).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe("AthletesService.previewInvitation", () => {
  const preview = (athlete: object, record: object = {}) => {
    const prisma = {
      athleteInvitationToken: {
        findUnique: jest.fn().mockResolvedValue({
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          coachAthlete: { athlete, coach: { name: "Coach Ana" } },
          ...record,
        }),
      },
    };
    return new AthletesService(prisma as never, {} as never, {} as never, {} as never).previewInvitation("raw");
  };

  it("dice quién invita y si la persona ya tiene cuenta", async () => {
    await expect(preview({ passwordHash: "h", authProvider: "local" })).resolves.toEqual({ coachName: "Coach Ana", hasAccount: true });
    await expect(preview({ passwordHash: null, authProvider: "local" })).resolves.toEqual({ coachName: "Coach Ana", hasAccount: false });
  });

  it("rechaza un enlace usado", async () => {
    await expect(preview({ passwordHash: null, authProvider: "local" }, { usedAt: new Date() })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
