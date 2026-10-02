-- Un cierre de sesión anulado al reabrir la sesión no se borra: queda con
-- active = 0 (1 = vigente) para poder analizar después el comportamiento del
-- atleta. Los cierres existentes quedan vigentes.
ALTER TABLE "SessionFeedback" ADD COLUMN "active" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "SessionFeedback" ADD CONSTRAINT "SessionFeedback_active_check" CHECK ("active" IN (0, 1));
