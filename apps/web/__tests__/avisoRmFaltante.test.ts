import { notificationCopy, type AppNotification } from "@cycles/shared";

const notice = (names: string[], missingCount = names.length): AppNotification => ({
  id: "n1",
  type: "rm_missing",
  planId: null,
  sessionId: null,
  count: 1,
  payload: { athleteId: "a1", athleteName: "Ana", exerciseNames: names, missingCount },
  read: false,
  createdAt: "2026-11-20T10:00:00Z",
  at: "2026-11-20T10:00:00Z",
});

describe("aviso «falta el RM» (CYC-306)", () => {
  it.each([
    [["Peso muerto"], 1, "Ana no tiene RM en Peso muerto. Agrégalo o calcula uno aproximado."],
    [["Peso muerto", "Hip thrust"], 2, "Ana no tiene RM en Peso muerto y Hip thrust. Agrégalo o calcula uno aproximado."],
    [["Peso muerto", "Hip thrust", "Sentadilla"], 3, "Ana no tiene RM en Peso muerto, Hip thrust y Sentadilla. Agrégalo o calcula uno aproximado."],
    [["A", "B", "C", "D", "E"], 7, "Ana no tiene RM en A, B, C y 4 más. Agrégalo o calcula uno aproximado."],
  ])("arma el texto con %j (%i)", (names, total, text) => {
    const copy = notificationCopy(notice(names, total));
    expect(copy).toMatchObject({ title: "Falta el RM", text, icon: "initials", initials: "A" });
  });

  it("abre la ficha del atleta, no la sesión", () => {
    expect(notificationCopy(notice(["Peso muerto"])).target).toEqual({ kind: "athlete", athleteId: "a1" });
  });
});
