// Claves de novedad vigentes (`clave@version`). La API solo importa TIPOS de @cycles/shared,
// así que la lista va copiada aquí; novelties.spec.ts la compara con packages/shared/src/novelties.ts
// para que no se separen. Una cuenta nueva las recibe ya vistas (las aprende con su guía de primer uso).
export const CURRENT_NOVELTY_KEYS: string[] = ["routine-blocks@1", "athlete-blocks@1", "athlete-weekly@1"];

// Tope de claves por cuenta: protege la columna de crecer sin límite.
export const MAX_NEWS_SEEN = 200;
