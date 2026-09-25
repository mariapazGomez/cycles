# Issues — Cycles

Cosas puntuales que la usuaria encontró probando la app y quiere corregir, una por una. A diferencia de [`DEUDA-TECNICA.md`](./DEUDA-TECNICA.md) (atajos técnicos de fondo), esto son comportamientos/UX concretos que no le gustan tal como están hoy.

Cada issue se trabaja como una solución separada cuando se pida, no todas juntas.

## Abiertos

### 1. El flujo de armar un plan no tiene cierre ni confirmación de asignación
**Reportado:** 2026-09-25, por la usuaria (coach) probando el flujo completo.

**Qué pasa hoy:** coach crea un plan (`/cycles`) → crea una sesión dentro del plan → agrega ejercicios a la sesión (`/sessions/:id`). Al terminar de agregar ejercicios no hay ningún cierre: no hay confirmación de que la sesión quedó armada, ni de que el plan quedó "asignado" al atleta. Se siente como si todo quedara en estado de borrador, aunque técnicamente ya está guardado (cada guardado es una request que persiste al toque).

**Qué se espera:** que el flujo refleje con claridad que el plan quedó cerrado/asignado — no un simple guardado silencioso más. A definir en la solución: podría ser un paso explícito de "confirmar asignación" al final, un cambio de estado visible del plan (ej. de `draft` a `active` con indicación clara en la UI), un mensaje de confirmación al terminar de armar la última sesión, o alguna combinación.

**Lo que ya existe (y por qué no alcanza):** un plan nuevo se crea con `status: "draft"` por default (`schema.prisma`). El mecanismo para pasarlo a `active` sí existe, pero está escondido: hay que abrir "Editar plan" en `/cycles/:id`, que despliega un formulario genérico (nombre, objetivo, fechas, y ahí sí un `<select>` de estado) — nada en el flujo de armar sesiones/ejercicios te lleva ahí ni te avisa que hace falta.

**Agravante confirmado (revisando el backend):** `GET /cycles` (`CyclesService.list()`) no filtra por status para el atleta salvo que se pase el query param explícito — por default le devuelve **todos** sus planes asignados, incluidos los que están en `draft`. Es decir, el atleta ya puede ver (y entrar a) un plan a medio armar, sin terminar, en su lista de planes — el estado `draft` hoy no protege nada del lado del atleta en `/cycles`, aunque sí lo excluye de `GET /me/today` (que si filtra `status: "active"`).

**Dónde:** `apps/web/src/pages/CyclesPage.tsx`, `CycleDetailPage.tsx` (el `<select>` de estado ya está ahí, dentro de "Editar plan"), `SessionDetailPage.tsx` (el flujo de agregar ejercicios termina sin nada). Backend: `apps/api/src/cycles/cycles.service.ts` (`list()`, sin filtro de status por default para atleta). Modelo: `TrainingCycle.status` (`draft | active | completed | archived`).

**Estado:** abierto, sin resolver.

### 2. La vista del plan es la misma para coach y atleta — debería diferenciarse
**Reportado:** 2026-09-25, por la usuaria probando el flujo completo.

**Qué pasa hoy:** `/cycles/:id` usa exactamente el mismo componente (`CycleGrid`, dentro de `CycleDetailPage.tsx`) para coach y atleta. La diferencia entre roles es solo `isCoach` ocultando algunos controles (botones de editar/asignar) — el formato, la densidad de información y el lenguaje visual son idénticos para los dos.

**Qué se espera:** dos experiencias distintas para la misma información:
- **Coach:** vista más técnica — la grid de semanas × sesiones tal como está hoy (o más densa), pensada para armar y ajustar la programación.
- **Atleta:** vista más simple y llamativa — pensada para mirar rápido qué le toca hoy/esta semana, no para editar. Menos tabla, más foco en la próxima sesión.

**Dónde:** `apps/web/src/pages/CycleDetailPage.tsx` (`CycleGrid` es un solo componente compartido con un flag `isCoach`, no dos vistas). Relevante: la app móvil (`apps/mobile/src/screens/TodayScreen.tsx`) ya resolvió esto para el caso "atleta ejecutando" con una vista simple centrada en la sesión de hoy — podría ser el punto de partida para cómo se ve una vista de atleta más simple en la web.

**Estado:** abierto, sin resolver.
