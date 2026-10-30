import { readFileSync } from "fs";
import { join } from "path";
import { EQUIPMENT } from "@cycles/shared";
import { CATALOG_EQUIPMENT } from "./catalog-equipment";

// Los nombres del seed (prisma/seed.ts), leídos del archivo para no duplicarlos.
const seedNames = [...readFileSync(join(__dirname, "../../prisma/seed.ts"), "utf8").matchAll(/\{ name: "([^"]+)", muscleGroup/g)].map(
  (m) => m[1],
);

describe("implementos del catálogo", () => {
  it("cubre exactamente los ejercicios del seed", () => {
    expect(seedNames.length).toBe(54);
    expect(Object.keys(CATALOG_EQUIPMENT).sort()).toEqual([...seedNames].sort());
  });

  it("solo usa implementos de la lista cerrada, sin repetir", () => {
    for (const [name, list] of Object.entries(CATALOG_EQUIPMENT)) {
      for (const item of list ?? []) expect({ name, ok: EQUIPMENT.includes(item as never) }).toEqual({ name, ok: true });
      expect(new Set(list).size).toBe(list?.length ?? 0);
    }
  });

  it("«Peso corporal» va solo", () => {
    for (const [name, list] of Object.entries(CATALOG_EQUIPMENT)) {
      if (list?.includes("bodyweight")) expect({ name, list }).toEqual({ name, list: ["bodyweight"] });
    }
  });

  it("deja vacíos solo los que la lista cerrada no describe", () => {
    const empty = Object.entries(CATALOG_EQUIPMENT).filter(([, list]) => list === null).map(([name]) => name);
    expect(empty.sort()).toEqual(["Rueda abdominal", "Salto de cuerda"]);
  });
});
