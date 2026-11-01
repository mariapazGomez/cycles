import { ForbiddenException } from "@nestjs/common";
import { AccountService, weeksBetween } from "./account.service";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

function setup(user: { id: string; role: string }, cycles: unknown[] = []) {
  const fn = () => jest.fn().mockResolvedValue({ count: 0 });
  const tx = {
    trainingCycle: { findMany: jest.fn().mockResolvedValue(cycles), create: jest.fn(), deleteMany: fn(), updateMany: fn() },
    trainingSession: { findMany: jest.fn().mockResolvedValue([{ id: "s1" }]), deleteMany: fn() },
    sessionExercise: { findMany: jest.fn().mockResolvedValue([{ id: "se1" }]), deleteMany: fn() },
    exerciseLog: { deleteMany: fn() },
    sessionFeedback: { deleteMany: fn() },
    loadAdjustment: { deleteMany: fn() },
    refreshToken: { deleteMany: fn() },
    passwordResetToken: { deleteMany: fn() },
    oAuthExchangeCode: { deleteMany: fn() },
    userIdentity: { deleteMany: fn() },
    emailVerificationToken: { deleteMany: fn() },
    notification: { deleteMany: fn() },
    policyAcceptance: { deleteMany: fn() },
    athleteInvitationToken: { deleteMany: fn() },
    coachAthlete: { deleteMany: fn(), updateMany: fn() },
    routine: { findMany: jest.fn().mockResolvedValue([{ id: "r1" }]), deleteMany: fn() },
    routineExercise: { deleteMany: fn() },
    exercise: { updateMany: fn() },
    user: { delete: jest.fn(), update: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn() },
    $transaction: jest.fn((cb: (t: typeof tx) => Promise<void>) => cb(tx)),
  };
  return { tx, prisma, service: new AccountService(prisma as never) };
}

describe("weeksBetween", () => {
  it("cuenta semanas completas y redondea hacia arriba", () => {
    expect(weeksBetween(d("2026-01-05"), d("2026-02-01"))).toBe(4);
    expect(weeksBetween(d("2026-01-05"), d("2026-01-12"))).toBe(2);
  });
  it("respeta el mínimo y el máximo de una plantilla", () => {
    expect(weeksBetween(d("2026-01-05"), d("2026-01-05"))).toBe(1);
    expect(weeksBetween(d("2020-01-01"), d("2026-01-01"))).toBe(52);
  });
});

describe("AccountService.deleteAccount (atleta)", () => {
  const plan = {
    id: "c1",
    coachId: "coach1",
    name: "Hipertrofia",
    objective: "Ganar fuerza",
    cycleType: "mesocycle",
    sessionsPerWeek: 3,
    templateId: null,
    startDate: d("2026-01-05"),
    endDate: d("2026-02-01"),
  };

  it("borra sus datos y la cuenta, y deja el plan como plantilla del coach", async () => {
    const { tx, service } = setup({ id: "a1", role: "athlete" }, [plan]);
    await service.deleteAccount("a1");

    expect(tx.trainingCycle.create.mock.calls[0][0].data).toMatchObject({
      coachId: "coach1",
      name: "Hipertrofia",
      isTemplate: true,
      templateWeeks: 4,
    });
    expect(tx.trainingCycle.create.mock.calls[0][0].data).not.toHaveProperty("athleteId");
    expect(tx.exerciseLog.deleteMany).toHaveBeenCalled();
    expect(tx.sessionFeedback.deleteMany).toHaveBeenCalled();
    expect(tx.trainingCycle.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["c1"] } } });
    expect(tx.refreshToken.deleteMany).toHaveBeenCalled();
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });

  it("no duplica la plantilla de un plan que ya salió de una", async () => {
    const { tx, service } = setup({ id: "a1", role: "athlete" }, [{ ...plan, templateId: "t1" }]);
    await service.deleteAccount("a1");
    expect(tx.trainingCycle.create).not.toHaveBeenCalled();
  });

  it("un macrociclo (solo contenedor) no se convierte en plantilla", async () => {
    const { tx, service } = setup({ id: "a1", role: "athlete" }, [{ ...plan, cycleType: "macrocycle", sessionsPerWeek: null }]);
    await service.deleteAccount("a1");
    expect(tx.trainingCycle.create).not.toHaveBeenCalled();
    expect(tx.user.delete).toHaveBeenCalled();
  });
});

describe("AccountService.deleteAccount (coach)", () => {
  it("anonimiza la cuenta y conserva el historial de los atletas", async () => {
    const { tx, service } = setup({ id: "co1", role: "coach" });
    await service.deleteAccount("co1");

    expect(tx.coachAthlete.updateMany).toHaveBeenCalledWith({ where: { coachId: "co1" }, data: { status: "inactive" } });
    expect(tx.exercise.updateMany).toHaveBeenCalledWith({ where: { createdBy: "co1" }, data: { isActive: false } });
    expect(tx.user.delete).not.toHaveBeenCalled();
    const data = tx.user.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: "Coach eliminado", passwordHash: null });
    expect(data.email).toMatch(/@cycles\.invalid$/);
    // No toca series, cierres ni planes de los atletas.
    expect(tx.exerciseLog.deleteMany).not.toHaveBeenCalled();
    expect(tx.sessionFeedback.deleteMany).not.toHaveBeenCalled();
  });
});

describe("AccountService.deleteAccount (otros roles)", () => {
  it("no elimina una cuenta admin", async () => {
    const { prisma, service } = setup({ id: "ad1", role: "admin" });
    await expect(service.deleteAccount("ad1")).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("AccountService.setDataConsent", () => {
  it("retirar el consentimiento borra la fecha y la versión", async () => {
    const { prisma, service } = setup({ id: "a1", role: "athlete" });
    await service.setDataConsent("a1", false);
    expect(prisma.user.update.mock.calls[0][0].data).toEqual({ dataConsentAt: null, dataConsentVersion: null });
  });
});
