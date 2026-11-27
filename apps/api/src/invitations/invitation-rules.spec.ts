import { chileHour, expiryFrom, invitationState, purgeBefore, queueDay, queueWindowOpen } from "./invitation-rules";
import { pilotInvitationEmail } from "../mail/templates";

// Chile en noviembre está en UTC-3.
const at = (iso: string) => new Date(iso).getTime();

describe("reglas de las invitaciones (CYC-295)", () => {
  it("la cola sale desde las 10:00 y no desde las 20:00 de Chile", () => {
    expect(chileHour(at("2026-11-27T13:00:00Z"))).toBe(10);
    expect(queueWindowOpen(at("2026-11-27T12:59:00Z"))).toBe(false);
    expect(queueWindowOpen(at("2026-11-27T13:00:00Z"))).toBe(true);
    expect(queueWindowOpen(at("2026-11-27T22:59:00Z"))).toBe(true);
    expect(queueWindowOpen(at("2026-11-27T23:00:00Z"))).toBe(false);
  });

  it("con el horario de invierno la hora sigue siendo la de Chile", () => {
    expect(chileHour(at("2026-07-15T14:00:00Z"))).toBe(10);
  });

  it("calcula desde qué día sale cada una de la cola", () => {
    const noon = at("2026-11-27T15:00:00Z");
    expect(queueDay(0, 15, noon)).toBe("2026-11-28");
    expect(queueDay(14, 15, noon)).toBe("2026-11-28");
    expect(queueDay(15, 15, noon)).toBe("2026-11-29");
    // Antes de las 20:00 con cupo libre, hoy; después, desde mañana.
    expect(queueDay(0, 13, noon)).toBe("2026-11-27");
    expect(queueDay(2, 13, noon)).toBe("2026-11-28");
    expect(queueDay(0, 0, at("2026-11-27T23:30:00Z"))).toBe("2026-11-28");
  });

  it("vence a los 7 días y se borra a los 12 meses", () => {
    expect(expiryFrom(new Date("2026-11-27T15:00:00Z")).toISOString()).toBe("2026-12-04T15:00:00.000Z");
    expect(purgeBefore(new Date("2027-11-27T15:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-27");
  });

  it("calcula el estado que muestra admin", () => {
    const now = new Date("2026-11-27T15:00:00Z");
    const later = new Date("2026-11-30T00:00:00Z");
    const before = new Date("2026-11-20T00:00:00Z");
    expect(invitationState(null, false, now)).toBe("not_invited");
    expect(invitationState(null, true, now)).toBe("has_account");
    expect(invitationState({ status: "sent", expiresAt: later }, false, now)).toBe("sent");
    expect(invitationState({ status: "sent", expiresAt: before }, false, now)).toBe("expired");
    expect(invitationState({ status: "used", expiresAt: before }, true, now)).toBe("registered");
    expect(invitationState({ status: "failed", expiresAt: null }, false, now)).toBe("failed");
  });
});

describe("correo de invitación del piloto", () => {
  const url = "https://app.example.test/register?invitacion=abc&x=%26";
  const mail = pilotInvitationEmail(url);

  it("lleva el asunto, la vista previa, la carta, el botón y el aviso aprobados", () => {
    expect(mail.subject).toBe("Tu invitación a Cycles");
    for (const text of ["Crea tu cuenta. El enlace es personal y dura 7 días.", "Crear mi cuenta", "responde este correo: lo leemos.", "sirve una sola vez y vence en 7 días", "Responde a este correo"]) {
      expect(mail.html).toContain(text);
    }
    expect(mail.text).toContain(url);
    expect(mail.text).toContain("antes de que abramos el registro a todo el público.");
  });

  it("escapa el enlace y usa esquinas de 6 px con botón rectangular", () => {
    expect(mail.html).toContain("invitacion=abc&amp;x=%26");
    expect(mail.html).not.toContain("border-radius:999px");
    expect(mail.html).not.toContain("border-radius:16px");
  });
});
