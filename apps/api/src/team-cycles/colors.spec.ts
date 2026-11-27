import { TEAM_CYCLE_COLORS as web } from "../../../web/src/lib/teamColors";
import { nextColor, TEAM_CYCLE_COLORS } from "./colors";

describe("color del ciclo del equipo", () => {
  it("el primero es azul y cada nuevo toma el primero libre", () => {
    expect(nextColor([])).toBe("blue");
    // Sin color guardado cuenta como azul.
    expect(nextColor([null])).toBe("violet");
    expect(nextColor(["blue", "teal"])).toBe("violet");
    expect(nextColor(["violet"])).toBe("blue");
    expect(nextColor([...TEAM_CYCLE_COLORS])).toBe("blue");
  });

  it("la web ofrece las mismas claves", () => {
    expect(web.map((c) => c.key)).toEqual([...TEAM_CYCLE_COLORS]);
  });
});
