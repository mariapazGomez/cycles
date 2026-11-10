-- Novedades que cada persona ya vio (`clave@version`). Aditiva: lista vacía por defecto, no toca datos.
ALTER TABLE "User" ADD COLUMN "tourNewsSeen" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
