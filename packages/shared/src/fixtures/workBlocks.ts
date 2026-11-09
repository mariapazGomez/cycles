import type { SessionWorkBlock } from "../types/work-block";

// Bloque de ejemplo de GET /sessions/:id, fijado por la prueba e2e de la API
// (bloques.e2e-spec.ts) y usable por la web y la app. Si cambia la forma, falla.
// No se exporta desde el índice del paquete: solo lo importan las pruebas.
export const sessionWorkBlockFixture: SessionWorkBlock = {
  id: "blk-1",
  sessionId: "ses-1",
  name: "Calentamiento",
  type: "warmup",
  color: null,
  orderIndex: 1,
  note: "Sin prisa",
};
