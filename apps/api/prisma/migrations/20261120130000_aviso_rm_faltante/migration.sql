-- Aviso al coach cuando un atleta tiene un plan con % del RM y aún no tiene RM (CYC-306).
-- Aditiva: un valor nuevo del enum; no toca filas.
ALTER TYPE "NotificationType" ADD VALUE 'rm_missing';
