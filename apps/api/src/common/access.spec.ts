import { BadRequestException } from "@nestjs/common";
import { athleteIdOf } from "./access";

describe("athleteIdOf", () => {
  it("devuelve el atleta de un ciclo", () => {
    expect(athleteIdOf({ athleteId: "a1" })).toBe("a1");
  });

  it("rechaza una plantilla, que no tiene atleta", () => {
    expect(() => athleteIdOf({ athleteId: null })).toThrow(BadRequestException);
  });
});
