import { gmtLabel } from "../src/lib/teamCalendar";

describe("calendario del equipo", () => {
  it("dice la zona horaria del navegador", () => {
    expect(gmtLabel(180)).toBe("GMT-3");
    expect(gmtLabel(0)).toBe("GMT");
    expect(gmtLabel(-330)).toBe("GMT+5:30");
  });
});
