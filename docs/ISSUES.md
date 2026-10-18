# Issues — Cycles

Cosas puntuales que la usuaria encontró probando la app y quiere corregir, una por una. A diferencia de [`DEUDA-TECNICA.md`](./DEUDA-TECNICA.md) (atajos técnicos de fondo), esto son comportamientos/UX concretos que no le gustan tal como están hoy.

Cada issue se trabaja como una solución separada cuando se pida, no todas juntas.

## Abiertos

### 1. El flujo de armar un plan no tiene cierre ni confirmación de asignación
**Reportado:** 2026-09-25, por la usuaria (coach) probando el flujo completo.

**Qué pasa hoy:** coach crea un plan (`/cycles`) → crea una sesión dentro del plan → agrega ejercicios a la sesión (`/sessions/:id`). Al terminar de agregar ejercicios no hay ningún cierre: no hay confirmación de que la sesión quedó armada ni de que el atleta ya puede entrenar.

**Parte resuelta (2026-10-16):** el estado `draft` se eliminó. Un plan nace `active` y el atleta lo ve desde que se crea (migración `quita_estado_borrador`; los borradores existentes pasaron a activos). Ya no hay un paso escondido en "Editar plan" que dejara el plan invisible.

**Avisos al atleta (resuelto 2026-10-17):** salen directo y solos a los 10 minutos sin cambios, sin ninguna acción ni pregunta al coach (sin botón «Avisar ahora» ni «¿avisar al atleta?»).

**Cierre del flujo (resuelto 2026-10-17, T-044):** al asignar la primera sesión de un plan, un mensaje informativo dice que el atleta ya puede entrenar y que le llegará un aviso. Solo informa: no pregunta ni pide nada al coach.

**Dónde:** `apps/web/src/pages/CycleDetailPage.tsx`, `SessionDetailPage.tsx` (el flujo de agregar ejercicios termina sin nada).

**Estado:** resuelto.

### 2. La vista del plan es la misma para coach y atleta — debería diferenciarse
**Reportado:** 2026-09-25, por la usuaria probando el flujo completo.

**Qué pasa hoy:** `/cycles/:id` usa exactamente el mismo componente (`CycleGrid`, dentro de `CycleDetailPage.tsx`) para coach y atleta. La diferencia entre roles es solo `isCoach` ocultando algunos controles (botones de editar/asignar) — el formato, la densidad de información y el lenguaje visual son idénticos para los dos.

**Qué se espera:** dos experiencias distintas para la misma información:
- **Coach:** vista más técnica — la grid de semanas × sesiones tal como está hoy (o más densa), pensada para armar y ajustar la programación.
- **Atleta:** vista más simple y llamativa — pensada para mirar rápido qué le toca hoy/esta semana, no para editar. Menos tabla, más foco en la próxima sesión.

**Dónde:** `apps/web/src/pages/CycleDetailPage.tsx` (`CycleGrid` es un solo componente compartido con un flag `isCoach`, no dos vistas). Relevante: la app móvil (`apps/mobile/src/screens/TodayScreen.tsx`) ya resolvió esto para el caso "atleta ejecutando" con una vista simple centrada en la sesión de hoy — podría ser el punto de partida para cómo se ve una vista de atleta más simple en la web.

**Estado:** abierto, sin resolver.
