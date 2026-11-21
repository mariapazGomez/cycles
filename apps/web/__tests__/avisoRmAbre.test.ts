import { notificationCopy, type AppNotification } from "@cycles/shared";

describe("aviso «Falta el RM»", () => {
  it("apunta a la ficha del atleta, donde la campana abre la pestaña RM", () => {
    const n: AppNotification = {
      id: "1", type: "rm_missing", planId: null, sessionId: null, count: 1, read: false, createdAt: "2026-11-20T10:00:00Z", at: "2026-11-20T10:00:00Z",
      payload: { athleteId: "a1", athleteName: "Camila Rojas", exerciseNames: ["Peso muerto", "Hip thrust"], missingCount: 2 },
    };
    const copy = notificationCopy(n);
    expect(copy.title).toBe("Falta el RM");
    expect(copy.target).toEqual({ kind: "athlete", athleteId: "a1" });
  });
});
