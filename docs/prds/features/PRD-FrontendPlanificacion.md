---
type: prd
level: feature
parent: "[[PRD-General]]"
status: in-progress
phase: "Fase 2 — Planificación"
created: 2026-09-22
updated: 2026-09-23
tags: [prd, feature/frontend-planificacion]
related: ["[[PRD-CRUDCiclos]]", "[[PRD-CRUDSesiones]]", "[[PRD-CatalogoEjercicios]]"]
---

# PRD — Frontend de planificación (ciclos, sesiones, ejercicios)

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.

## 1. Resumen

Plan de construcción del frontend para las tres piezas de Fase 2 que hoy solo existen como API: ciclos ([[PRD-CRUDCiclos]]), sesiones/ejercicios de sesión ([[PRD-CRUDSesiones]]) y catálogo de ejercicios ([[PRD-CatalogoEjercicios]]). Nació como un plan sin decisiones de identidad visual — ver [[investigacion-competitiva]] para el research y [[identidad-visual]] para las decisiones de color/tipografía que se tomaron después (2026-09-23) y ya están aplicadas.

**Estado al 2026-09-23:** pasos 1 a 3 completos y probados (layout+nav, ciclos, sesiones+ejercicios de sesión). Falta el paso 4 (repaso específico de la vista de atleta más allá del control de acceso ya aplicado) y el paso 5 (catálogo de ejercicios propios, opcional).

## 2. Qué cambia respecto a lo que existe hoy

`apps/web` hoy tiene una sola pantalla post-login (`HomePage`) que mezcla bienvenida + panel de invitar atletas. Para meter ciclos/sesiones sin que la Home se vuelva inmanejable, hace falta:

- Un **layout con navegación persistente** (header con links a "Atletas" / "Ciclos", en vez de todo apilado en una sola página).
- Rutas anidadas: lista de ciclos → detalle de un ciclo → detalle de una sesión.

## 3. Principio técnico: separar estructura de identidad visual

Dado que la identidad de marca se decide después, el frontend de esta pieza se construye con el mismo criterio que ya usamos en `apps/web/src/styles/auth.css`: clases funcionales neutras (`.button-primary`, `.field`, `.error-banner`, etc.), sin colores/tipografía de marca hardcodeados por componente. Cuando se defina la identidad, el trabajo debería ser mayormente reemplazar esas pocas hojas de estilo compartidas, no reescribir componentes.

## 4. Pantallas necesarias

### Coach

| Ruta | Contenido | Consume |
|---|---|---|
| `/` (layout con nav) | Reemplaza el `HomePage` actual; header con navegación | — |
| `/athletes` | Lo que hoy vive en `HomePage` (`AthletesPanel`), movido a su propia ruta | `GET/POST /athletes` |
| `/cycles` | Lista de ciclos propios + formulario de creación inline (atleta de sus relaciones `active`, nombre, objetivo, fechas) | `GET/POST /cycles`, `GET /athletes` |
| `/cycles/:id` | Detalle editable del ciclo + lista de sus sesiones + botón "Agregar sesión" | `GET/PATCH /cycles/:id`, `GET /cycles/:id/sessions` |
| `/sessions/:id` | Detalle editable de la sesión + lista de ejercicios con sus metas + selector para agregar ejercicios del catálogo | `GET/PATCH/DELETE /sessions/:id`, `POST/PATCH/DELETE /sessions/.../exercises`, `GET /exercises` |
| `/exercises` (opcional, prioridad baja) | Catálogo completo + formulario para crear un ejercicio propio | `GET/POST /exercises`, `PATCH /exercises/:id/deactivate` |

### Atleta

| Ruta | Contenido | Consume |
|---|---|---|
| `/` (layout con nav) | Lista de sus ciclos (probablemente solo el/los `active`) | `GET /cycles` (scoped por rol en el backend) |
| `/cycles/:id` | Mismo componente que el coach, pero sin controles de edición (renderizado condicional por rol) | `GET /cycles/:id`, `GET /cycles/:id/sessions` |
| `/sessions/:id` | Mismo componente que el coach, solo lectura | `GET /sessions/:id` |

Reusar el mismo componente de detalle para coach/atleta (ocultando controles de edición según `user.role`) evita duplicar pantallas — el backend ya devuelve el mismo shape para ambos roles.

## 5. Estado y datos

Mismo patrón ya establecido en `AthletesPanel`: **React Query** para todo fetch/mutación (`useQuery`/`useMutation` + `queryClient.invalidateQueries`), sin lógica de servidor duplicada en Context. Keys de query propuestas:

- `["cycles"]` — lista del usuario actual.
- `["cycles", cycleId]` — detalle de un ciclo.
- `["cycles", cycleId, "sessions"]` — sesiones de ese ciclo.
- `["sessions", sessionId]` — detalle de una sesión (con sus ejercicios embebidos, tal como los devuelve la API).
- `["exercises"]` — catálogo (global + propios).

## 6. Plan de construcción (orden propuesto)

1. ✅ **Layout + navegación** — `AppLayout` con header/nav (Atletas/Planes para coach, Mis planes para atleta); `AthletesPanel` movido a `/athletes`.
2. ✅ **Ciclos (coach)** — `cyclesApi.ts`, lista (`/cycles`), formulario de creación, detalle editable (`/cycles/:id`).
3. ✅ **Sesiones + ejercicios de sesión (coach)** — `sessionsApi.ts`/`exercisesApi.ts`; crear/listar sesiones dentro del detalle de ciclo; en el detalle de sesión (`/sessions/:id`), selector de ejercicios del catálogo + editar/quitar, con los 409 del backend (sesión con ejercicios, ejercicio con `ExerciseLog`) mostrados como error legible.
4. ✅ **Vista de atleta** — mismos componentes de ciclo/sesión, controles de edición ocultos vía `user.role` (no se armaron pantallas separadas); nav propia ("Mis planes") y `/cycles` gateado por rol para no mostrarle a un atleta el formulario de creación.
5. **(Opcional, pendiente)** pantalla de gestión del catálogo de ejercicios propios — no bloquea nada, el selector de ejercicios del paso 3 ya funciona con el catálogo sembrado.

## 7. Fuera de alcance de este plan

- Cualquier decisión de color, tipografía o tono de marca — ver sección 3.
- Drag-and-drop para reordenar sesiones/ejercicios (ya fuera de alcance en el backend, ver [[PRD-CRUDSesiones]]).
- Vista de progreso/adherencia — depende de Fase 3 (`ExerciseLog`), no existe todavía.

## 8. Estado y decisiones abiertas

- Resuelto: la creación de un ciclo es un formulario inline en `/cycles` (toggle), no una ruta ni modal separado.
- Pendiente (opcional, baja prioridad): pantalla de gestión del catálogo de ejercicios propios (paso 5).
