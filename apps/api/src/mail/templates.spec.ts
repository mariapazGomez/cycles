import { athleteInvitationEmail, verificationEmail } from "./templates";

const URL = "https://app.example.test/verify-email?token=a%26b";

describe("plantillas de correo", () => {
  describe("verificationEmail", () => {
    it("pide confirmar el correo, con el enlace y el plazo", () => {
      const mail = verificationEmail(URL);
      expect(mail.subject).toBe("Confirma tu email para entrar a Cycles");
      expect(mail.html).toContain("Confirma tu correo");
      expect(mail.html).toContain("Confirmar correo");
      expect(mail.html).toContain("vence en 24 horas");
      expect(mail.text).toContain(URL);
      expect(mail.text).toContain("vence en 24 horas");
    });

    it("escapa el enlace en el HTML", () => {
      const mail = verificationEmail('https://app.example.test/x?a=1&b="2"');
      expect(mail.html).toContain("a=1&amp;b=&quot;2&quot;");
      expect(mail.html).not.toContain('b="2"');
    });

    it("lleva texto de vista previa oculto", () => {
      expect(verificationEmail(URL).html).toContain("Un toque y ya puedes entrar.");
    });
  });

  describe("athleteInvitationEmail", () => {
    it("invita a entrenar y conserva el asunto con el nombre del coach", () => {
      const mail = athleteInvitationEmail(URL, "Laura Gómez");
      expect(mail.subject).toBe("Laura Gómez te invitó a entrenar en Cycles");
      expect(mail.html).toContain("Laura Gómez te invitó a entrenar");
      expect(mail.html).toContain("va a planificar tus entrenamientos");
      expect(mail.html).toContain("vence en 7 días");
      expect(mail.text).toContain("vence en 7 días");
    });

    it("escapa el nombre del coach en el HTML pero no en el asunto", () => {
      const mail = athleteInvitationEmail(URL, "<b>Ana</b> & Co");
      expect(mail.html).not.toContain("<b>Ana</b>");
      expect(mail.html).toContain("&lt;b&gt;Ana&lt;/b&gt; &amp; Co");
      expect(mail.subject).toContain("<b>Ana</b> & Co");
    });
  });

  it("solo dice que se puede responder cuando hay Reply-To", () => {
    for (const make of [(r: boolean) => verificationEmail(URL, r), (r: boolean) => athleteInvitationEmail(URL, "Ana", r)]) {
      expect(make(false).html).not.toContain("Responde a este correo");
      expect(make(false).text).not.toContain("Responde a este correo");
      expect(make(true).html).toContain("Responde a este correo");
      expect(make(true).text).toContain("Responde a este correo");
    }
  });
});
