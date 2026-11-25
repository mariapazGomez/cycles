import { rangesOverlap, removalFate, skipReason, type CopyState } from "./rules";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const today = d("2026-11-25");
const copy = (over: Partial<CopyState> = {}): CopyState => ({
  status: "pending", scheduledDate: d("2026-11-30"), startedAt: null, detachedAt: null, deletedAt: null, logs: 0, feedback: 0, ...over,
});

describe("qué copias reciben un cambio del equipo", () => {
  it("una enlazada, pendiente y de hoy en adelante lo recibe", () => {
    expect(skipReason(copy(), today)).toBeNull();
    expect(skipReason(copy({ scheduledDate: today }), today)).toBeNull();
  });
  it("lo registrado nunca cambia, aunque además esté ajustado", () => {
    for (const over of [{ logs: 1 }, { feedback: 1 }, { startedAt: today }, { status: "completed" as const }, { status: "skipped" as const }]) {
      expect(skipReason(copy({ ...over, detachedAt: today }), today)).toBe("recorded");
    }
  });
  it("ajustadas, pasadas y borradas no lo reciben", () => {
    expect(skipReason(copy({ detachedAt: today }), today)).toBe("adjusted");
    expect(skipReason(copy({ scheduledDate: d("2026-11-24") }), today)).toBe("past");
    expect(skipReason(copy({ deletedAt: today }), today)).toBe("removed");
  });
});

describe("al sacar a un atleta", () => {
  it("se quitan solo las futuras sin registrar ni ajustar", () => {
    expect(removalFate(copy(), today)).toBe("remove");
    expect(removalFate(copy({ logs: 2 }), today)).toBe("keep_recorded");
    expect(removalFate(copy({ detachedAt: today }), today)).toBe("keep_adjusted");
    expect(removalFate(copy({ scheduledDate: d("2026-11-20") }), today)).toBe("keep_past");
  });
});

describe("fechas que se cruzan", () => {
  const r = (a: string, b: string) => ({ startDate: d(a), endDate: d(b) });
  it("compartir un día ya es cruzarse", () => {
    expect(rangesOverlap(r("2026-11-30", "2026-12-27"), r("2026-12-27", "2027-01-10"))).toBe(true);
    expect(rangesOverlap(r("2026-11-30", "2026-12-27"), r("2026-12-28", "2027-01-10"))).toBe(false);
  });
});
