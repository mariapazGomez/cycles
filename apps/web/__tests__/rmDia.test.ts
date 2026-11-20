import { formatDay } from "../src/lib/format";

describe("fecha de la evaluación del RM", () => {
  it("es un día: no se corre por la zona horaria", () => {
    expect(formatDay("2026-11-20T00:00:00.000Z")).toBe("20 nov 2026");
    expect(formatDay("2026-11-20")).toBe("20 nov 2026");
  });
});
