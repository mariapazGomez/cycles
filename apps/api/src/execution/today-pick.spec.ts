import { pickNearest } from "./today-pick";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const c = (id: string, day: string | null) => ({ id, scheduledDate: day ? d(day) : null });
const today = d("2026-11-25");

describe("qué sesión muestra Hoy con dos ciclos", () => {
  it("la de hoy gana", () => {
    expect(pickNearest([c("vieja", "2026-11-10"), c("hoy", "2026-11-25")], today)?.id).toBe("hoy");
  });
  it("si no hay, la más cercana en fecha; empate, la que viene", () => {
    expect(pickNearest([c("lejos", "2026-12-10"), c("cerca", "2026-11-27")], today)?.id).toBe("cerca");
    expect(pickNearest([c("ayer", "2026-11-24"), c("mañana", "2026-11-26")], today)?.id).toBe("mañana");
  });
  it("sin fechas, conserva el orden de siempre", () => {
    expect(pickNearest([c("a", null), c("b", null)], today)?.id).toBe("a");
    expect(pickNearest([], today)).toBeNull();
  });
});
