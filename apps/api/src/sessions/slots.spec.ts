import { reassignSlots, weekOfDate } from "./slots";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("weekOfDate", () => {
  const start = d("2026-10-26");

  it("el día de inicio es la semana 1", () => {
    expect(weekOfDate(start, d("2026-10-26"))).toBe(1);
  });

  it("el séptimo día sigue en la semana 1 y el octavo empieza la 2", () => {
    expect(weekOfDate(start, d("2026-11-01"))).toBe(1);
    expect(weekOfDate(start, d("2026-11-02"))).toBe(2);
  });

  it("ignora la hora del día", () => {
    expect(weekOfDate(start, new Date("2026-11-01T23:59:00.000Z"))).toBe(1);
  });

  it("antes del inicio devuelve 0", () => {
    expect(weekOfDate(start, d("2026-10-25"))).toBe(0);
  });
});

describe("reassignSlots", () => {
  it("no cambia nada si las sesiones ya van en orden de fecha", () => {
    const changes = reassignSlots([
      { id: "a", slotNumber: 1, scheduledDate: d("2026-10-26") },
      { id: "b", slotNumber: 2, scheduledDate: d("2026-10-28") },
    ]);
    expect(changes.size).toBe(0);
  });

  it("una sesión agregada en un día anterior toma el primer espacio", () => {
    // a (lunes) tenía el 1, b (miércoles) el 2 y la nueva c (martes) el 3.
    const changes = reassignSlots([
      { id: "a", slotNumber: 1, scheduledDate: d("2026-10-26") },
      { id: "b", slotNumber: 2, scheduledDate: d("2026-10-28") },
      { id: "c", slotNumber: 3, scheduledDate: d("2026-10-27") },
    ]);
    expect(changes.get("c")).toBe(2);
    expect(changes.get("b")).toBe(3);
    expect(changes.has("a")).toBe(false);
  });

  it("dos sesiones el mismo día conservan su orden de espacio", () => {
    const changes = reassignSlots([
      { id: "a", slotNumber: 1, scheduledDate: d("2026-10-26") },
      { id: "b", slotNumber: 2, scheduledDate: d("2026-10-26") },
    ]);
    expect(changes.size).toBe(0);
  });

  it("no toca las sesiones sin fecha ni los espacios que ellas usan", () => {
    // Una sesión antigua sin fecha ocupa el 2; las dos con fecha usan 1 y 3.
    const changes = reassignSlots([
      { id: "a", slotNumber: 1, scheduledDate: d("2026-10-28") },
      { id: "old", slotNumber: 2, scheduledDate: null },
      { id: "b", slotNumber: 3, scheduledDate: d("2026-10-26") },
    ]);
    expect(changes.get("b")).toBe(1);
    expect(changes.get("a")).toBe(3);
    expect(changes.has("old")).toBe(false);
  });
});
