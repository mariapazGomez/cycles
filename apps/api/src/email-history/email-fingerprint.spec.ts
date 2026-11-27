import { canonicalEmail, emailFingerprint } from "./email-fingerprint";

const KEY = "k".repeat(64);

describe("huella del correo (CYC-295)", () => {
  it("junta mayúsculas y espacios", () => {
    expect(canonicalEmail("  Ana@Empresa.cl ")).toBe("ana@empresa.cl");
  });

  it("en Gmail ignora puntos, lo que va desde + y googlemail.com", () => {
    for (const alias of ["ana.perez@gmail.com", "anaperez+cycles@gmail.com", "A.n.a.Perez@googlemail.com"]) {
      expect(canonicalEmail(alias)).toBe("anaperez@gmail.com");
    }
  });

  it("en los dominios conocidos ignora lo que va desde +, pero no los puntos", () => {
    expect(canonicalEmail("ana.perez+2@outlook.com")).toBe("ana.perez@outlook.com");
    expect(canonicalEmail("ana+2@icloud.com")).toBe("ana@icloud.com");
  });

  it("en otros dominios no junta nada: podría ser otra persona", () => {
    expect(canonicalEmail("ana+2@empresa.cl")).toBe("ana+2@empresa.cl");
    expect(canonicalEmail("ana.perez@empresa.cl")).not.toBe(canonicalEmail("anaperez@empresa.cl"));
  });

  it("no deja vacía la parte antes de la arroba", () => {
    expect(canonicalEmail("+x@gmail.com")).toBe("+x@gmail.com");
  });

  it("la huella no contiene el correo y depende de la clave", () => {
    const print = emailFingerprint("ana@empresa.cl", KEY);
    expect(print).toMatch(/^[0-9a-f]{64}$/);
    expect(emailFingerprint(" ANA@empresa.cl", KEY)).toBe(print);
    expect(emailFingerprint("ana@empresa.cl", "z".repeat(64))).not.toBe(print);
  });
});
