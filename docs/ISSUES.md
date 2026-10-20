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

**Calendario del atleta (agregado 2026-10-18):** el atleta debe poder ver un calendario con los entrenamientos que hizo y los que va a hacer, y debe verse alentador cuando hay actividad, como marcar en un hábito los días que se cumplió, para generar adherencia. Diseño aprobado en `docs/diseno/plan-del-atleta` (estado Calendario) y construido en la web como pestaña **Calendario** del atleta (`/calendar`). Queda pendiente el resto del diseño del plan del atleta (una semana a la vez, «Te toca…», elegir día).

**Dónde:** `apps/web/src/pages/CycleDetailPage.tsx` (`CycleGrid` es un solo componente compartido con un flag `isCoach`, no dos vistas). Relevante: la app móvil (`apps/mobile/src/screens/TodayScreen.tsx`) ya resolvió esto para el caso "atleta ejecutando" con una vista simple centrada en la sesión de hoy — podría ser el punto de partida para cómo se ve una vista de atleta más simple en la web.

**Estado:** abierto, sin resolver.

### 3. Cerrar el registro durante la fase de early adopters
**Reportado:** 2026-10-18, por la usuaria.

**Qué pasa hoy:** cualquiera puede crear una cuenta de coach desde la landing ("Inicia sesión" → "Regístrate") o con Google. En la fase de early adopters solo deben entrar personas que ya tienen cuenta.

**Qué se espera:**
- La landing dice **«Ya tengo una cuenta»** en lugar de «Inicia sesión» (cabecera y pie), y lleva al login.
- El login no muestra «¿No tienes cuenta? Regístrate», y `/register` redirige al login.
- Que no se pueda crear una cuenta por ninguna vía: ni con email (`POST /auth/register` responde 403) ni con Google (un email que no existe no crea cuenta; se vuelve a la web con un mensaje claro). Esconder el botón no alcanza.
- Siguen funcionando las cuentas existentes, la recuperación de contraseña y la invitación de un coach a un atleta.
- Reversible sin tocar código: interruptor `REGISTRATION_OPEN` (API) y `VITE_REGISTRATION_OPEN` (web), cerrados por defecto.

**Dónde:** `apps/api/src/auth/auth.service.ts` (`register`, `loginWithGoogle`), `auth.controller.ts` (callback de Google), `apps/web/src/lib/features.ts`, `App.tsx`, `LoginPage.tsx`, `LandingPage.tsx`, `OAuthCallbackPage.tsx`.

**Estado:** resuelto en la rama `feat/registro-cerrado` (2026-10-18). Para abrir el registro de nuevo: `REGISTRATION_OPEN=true` en Render y `VITE_REGISTRATION_OPEN=true` en Vercel.

**Cómo entran los coaches del piloto (T-177, 2026-10-19):** con un **enlace privado con código de acceso** (`/register?codigo=…`, variable `PILOT_ACCESS_CODE` en Render) que mantiene el registro cerrado al público. Procedimiento en [`docs/deploy/ACCESO-PILOTO.md`](./deploy/ACCESO-PILOTO.md).
