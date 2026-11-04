import { pickMark, type MarkContext } from "../src/lib/tourMarks";
import { newCyclePath } from "../src/lib/library";

// CYC-234: tras invitar al atleta, «Crear ciclo» lo mandaba a la Biblioteca
// (formulario sin atleta) y la guía volvía a pedir «Entra a Atletas».
function ctx(path: string, anchors: string[] = []): MarkContext {
  return {
    path,
    has: (a) => anchors.includes(a),
    count: (a) => anchors.filter((x) => x === a).length,
    value: () => "",
    athleteId: "a1",
    athleteName: "Test",
    pendingName: null,
    summarySeen: false,
  };
}

describe("«Crear ciclo» desde la lista de atletas (CYC-234)", () => {
  it("lleva a la ficha del atleta con el diálogo «Nuevo ciclo», no a la Biblioteca", () => {
    const path = newCyclePath("a1");
    expect(path).toBe("/athletes/a1?nuevo=ciclo");
    expect(path).not.toContain("biblioteca");
  });

  it("reproduce el bucle: en la Biblioteca la guía pide volver a Atletas", () => {
    expect(pickMark(2, ctx("/biblioteca"))?.id).toBe("2a0");
  });

  it("en la ficha, con el diálogo abierto, la guía apunta a «Crear ciclo» y no a Atletas", () => {
    const [pathname] = newCyclePath("a1").split("?");
    expect(pickMark(2, ctx(pathname, ["cycle-create"]))?.id).toBe("2c");
  });

  it("en la ficha sin diálogo, la guía apunta a «Nuevo ciclo»", () => {
    expect(pickMark(2, ctx("/athletes/a1", ["new-cycle"]))?.id).toBe("2b");
  });
});
