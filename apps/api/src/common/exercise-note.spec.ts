import { cleanNote, NOTE_MAX_LENGTH } from "./exercise-note";

describe("cleanNote", () => {
  it("sin valor no toca la nota", () => {
    expect(cleanNote(undefined)).toBeUndefined();
  });
  it("vacía o solo espacios borra la nota", () => {
    expect(cleanNote("")).toBeNull();
    expect(cleanNote("   \n ")).toBeNull();
    expect(cleanNote(null)).toBeNull();
  });
  it("quita los espacios de los bordes y respeta el resto", () => {
    expect(cleanNote("  Cuida el hombro.\nBaja lento.  ")).toBe("Cuida el hombro.\nBaja lento.");
  });
  it("el largo máximo es de 500 caracteres", () => {
    expect(NOTE_MAX_LENGTH).toBe(500);
  });
});
