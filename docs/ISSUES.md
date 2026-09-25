# Issues — Cycles

Cosas puntuales que la usuaria encontró probando la app y quiere corregir, una por una. A diferencia de [`DEUDA-TECNICA.md`](./DEUDA-TECNICA.md) (atajos técnicos de fondo), esto son comportamientos/UX concretos que no le gustan tal como están hoy.

Cada issue se trabaja como una solución separada cuando se pida, no todas juntas.

## Abiertos

### 1. El flujo de armar un plan no tiene cierre ni confirmación de asignación
**Reportado:** 2026-09-25, por la usuaria (coach) probando el flujo completo.

**Qué pasa hoy:** coach crea un plan (`/cycles`) → crea una sesión dentro del plan → agrega ejercicios a la sesión (`/sessions/:id`). Al terminar de agregar ejercicios no hay ningún cierre: no hay confirmación de que la sesión quedó armada, ni de que el plan quedó "asignado" al atleta. Se siente como si todo quedara en estado de borrador, aunque técnicamente ya está guardado (cada guardado es una request que persiste al toque).

**Qué se espera:** que el flujo refleje con claridad que el plan quedó cerrado/asignado — no un simple guardado silencioso más. A definir en la solución: podría ser un paso explícito de "confirmar asignación" al final, un cambio de estado visible del plan (ej. de `draft` a `active` con indicación clara en la UI), un mensaje de confirmación al terminar de armar la última sesión, o alguna combinación.

**Lo que ya existe (y por qué no alcanza):** un plan nuevo se crea con `status: "draft"` por default (`schema.prisma`). El mecanismo para pasarlo a `active` sí existe, pero está escondido: hay que abrir "Editar plan" en `/cycles/:id`, que despliega un formulario genérico (nombre, objetivo, fechas, y ahí sí un `<select>` de estado) — nada en el flujo de armar sesiones/ejercicios te lleva ahí ni te avisa que hace falta. Un plan en `draft` probablemente ni siquiera le aparece al atleta (`GET /me/today` filtra `status: "active"`), así que hoy es fácil terminar de armar un plan entero y que nunca le llegue a nadie, sin ningún error ni aviso.

**Dónde:** `apps/web/src/pages/CyclesPage.tsx`, `CycleDetailPage.tsx` (el `<select>` de estado ya está ahí, dentro de "Editar plan"), `SessionDetailPage.tsx` (el flujo de agregar ejercicios termina sin nada). Modelo: `TrainingCycle.status` (`draft | active | completed | archived`).

**Estado:** abierto, sin resolver.
