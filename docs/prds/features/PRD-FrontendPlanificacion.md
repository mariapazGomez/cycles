---
type: prd
level: feature
parent: "[[PRD-General]]"
status: draft
phase: "Fase 2 — Planificación"
created: 2026-09-22
updated: 2026-09-22
tags: [prd, feature/frontend-planificacion]
related: ["[[PRD-CRUDCiclos]]", "[[PRD-CRUDSesiones]]", "[[PRD-CatalogoEjercicios]]"]
---

# PRD — Frontend de planificación (ciclos, sesiones, ejercicios)

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.

## 1. Resumen

Plan de construcción del frontend para las tres piezas de Fase 2 que hoy solo existen como API: ciclos ([[PRD-CRUDCiclos]]), sesiones/ejercicios de sesión ([[PRD-CRUDSesiones]]) y catálogo de ejercicios ([[PRD-CatalogoEjercicios]]). Es un **plan**, no una decisión de identidad visual — ver [[investigacion-competitiva]] para el research que lo informó y [[brand]] para la estrategia de marca (ambos deliberadamente sin aplicar todavía a decisiones de color/tipografía concretas, a pedido explícito del usuario el 2026-09-22).

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
| `/cycles` | Lista de ciclos propios, filtro por atleta/estado, botón "Crear ciclo" | `GET /cycles` |
| `/cycles/new` (o modal) | Formulario: atleta (de sus relaciones `active`), nombre, objetivo, fechas | `POST /cycles`, `GET /athletes` |
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

1. **Layout + navegación** — envolver las rutas protegidas en un `AppLayout` con header/nav; mover `AthletesPanel` a `/athletes`; dejar `/` como landing simple según rol (coach ve accesos a Atletas/Ciclos, atleta ve directo su ciclo activo).
2. **Ciclos (coach)** — `cyclesApi.ts`, lista (`/cycles`), formulario de creación, detalle editable.
3. **Sesiones + ejercicios de sesión (coach)** — dentro del detalle de ciclo: crear/listar sesiones; dentro del detalle de sesión: selector de ejercicios del catálogo + editar/quitar.
4. **Vista de atleta** — reusar los componentes de detalle de ciclo/sesión con `require="any"` en las rutas y ocultar controles de edición.
5. **(Opcional, después)** pantalla de gestión del catálogo de ejercicios propios — no bloquea nada, el selector de ejercicios del paso 3 puede funcionar solo con el catálogo ya sembrado.

## 7. Fuera de alcance de este plan

- Cualquier decisión de color, tipografía o tono de marca — ver sección 3.
- Drag-and-drop para reordenar sesiones/ejercicios (ya fuera de alcance en el backend, ver [[PRD-CRUDSesiones]]).
- Vista de progreso/adherencia — depende de Fase 3 (`ExerciseLog`), no existe todavía.

## 8. Estado y decisiones abiertas

- Confirmar si `/cycles/new` es una página propia o un modal sobre `/cycles` — decisión de implementación menor, se resuelve al construir.
- El research de [[investigacion-competitiva]] queda documentado para cuando se trabaje la identidad visual; este plan no lo aplica todavía.
