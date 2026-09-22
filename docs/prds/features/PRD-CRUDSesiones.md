---
type: prd
level: feature
parent: "[[PRD-General]]"
status: in-progress
phase: "Fase 2 — Planificación"
created: 2026-09-22
updated: 2026-09-22
tags: [prd, feature/crud-sesiones]
related: ["[[PRD-CRUDCiclos]]", "[[PRD-CatalogoEjercicios]]"]
---

# PRD — CRUD de sesiones y ejercicios de sesión

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.

## 1. Resumen

Permite a un coach agregar sesiones dentro de un ciclo (`TrainingSession`) y asignarles ejercicios del catálogo con metas concretas (`SessionExercise`: series, repeticiones, peso, descanso). Cubre las historias 4 y 5 del [[PRD-General]] — última pieza de Fase 2 antes de Fase 3 (registro de ejecución real).

## 2. Problema / motivación

Un ciclo ([[PRD-CRUDCiclos]]) es solo un contenedor con fechas hasta que tiene sesiones con contenido real. Sin esto, el catálogo de ejercicios ([[PRD-CatalogoEjercicios]]) tampoco tiene dónde usarse.

## 3. Alcance

### Dentro de alcance

- `POST /cycles/:cycleId/sessions` (coach, dueño del ciclo): crea una sesión vacía (nombre + fecha opcional). `orderIndex` se asigna automáticamente (correlativo dentro del ciclo, no lo elige el cliente).
- `GET /cycles/:cycleId/sessions`: coach dueño o atleta asignado, listado ordenado por `orderIndex`.
- `GET /sessions/:id`: detalle de una sesión **con sus ejercicios ya incluidos** (join con `Exercise` para traer nombre/grupo muscular) — evita un endpoint aparte para listar ejercicios de una sesión.
- `PATCH /sessions/:id` (coach dueño): actualiza `name`, `scheduledDate`, `status`.
- `DELETE /sessions/:id` (coach dueño): borrado real, pero **rechaza con 409 si la sesión todavía tiene ejercicios** — hay que quitarlos primero.
- `POST /sessions/:sessionId/exercises` (coach dueño): agrega un ejercicio del catálogo (global o propio, debe estar `isActive`) con sus metas. `orderIndex` automático dentro de la sesión.
- `PATCH /session-exercises/:id` (coach dueño): edita las metas (`targetSets`, `targetReps`, `targetWeight`, `targetRestSeconds`).
- `DELETE /session-exercises/:id` (coach dueño): borrado real, pero **rechaza con 409 si ya existe un `ExerciseLog`** para ese ejercicio de sesión (el atleta ya registró ejecución real — proteger ese historial).

### Fuera de alcance

- Reordenar sesiones/ejercicios (cambiar `orderIndex` manualmente vía drag-and-drop) — el orden hoy es solo "orden de creación".
- Que el atleta marque una sesión como completada/saltada — se decidió posponerlo a cuando se construya Fase 3 (`ExerciseLog`), porque ahí es donde realmente se decide si una sesión se hizo o no; hacerlo ahora sería adivinar una regla de negocio no pedida.
- UI en `apps/web` — no incluida en esta pieza.

## 4. Historias de usuario

1. Como **coach**, quiero agregar sesiones a un ciclo, para estructurar el plan en días de entrenamiento. (Parte de historia 3/4 del PRD general)
2. Como **coach**, quiero agregar ejercicios a cada sesión con series/repeticiones/peso objetivo, para dejar instrucciones claras. (Historia 4)
3. Como **atleta**, quiero ver mis sesiones con el detalle de ejercicios, para saber qué entrenar. (Parte de historia 5)
4. Como **coach**, quiero poder corregir o quitar un ejercicio que agregué por error, siempre que el atleta no lo haya ejecutado ya.

## 5. Modelo de datos (delta)

Ninguno — usa `TrainingSession` y `SessionExercise` tal como están definidos desde el scaffold inicial, sin cambios de schema.

## 6. Diseño de API — implementado en `apps/api/src/sessions`

- `POST /cycles/:cycleId/sessions` — body `{ name, scheduledDate? }`.
- `GET /cycles/:cycleId/sessions` — sin body.
- `GET /sessions/:id` — incluye `sessionExercises` con su `exercise` embebido.
- `PATCH /sessions/:id` — body parcial `{ name?, scheduledDate?, status? }`.
- `DELETE /sessions/:id` — 409 si tiene ejercicios.
- `POST /sessions/:sessionId/exercises` — body `{ exerciseId, targetSets, targetReps, targetWeight?, targetRestSeconds? }`.
- `PATCH /session-exercises/:id` — body parcial `{ targetSets?, targetReps?, targetWeight?, targetRestSeconds? }`.
- `DELETE /session-exercises/:id` — 409 si ya tiene `ExerciseLog`.

> Nota de implementación: las rutas de sesión están anidadas bajo `/cycles/:cycleId` solo para crear/listar; el resto usa el id propio de la sesión (`/sessions/:id`), todo en un único `SessionsController` con rutas explícitas por método (no dos controllers separados).

## 7. UI/UX

No aplica en esta iteración (ver "Fuera de alcance").

## 8. Requisitos no funcionales específicos

Ninguno adicional a los del PRD general.

## 9. Dependencias

- Depende de: [[PRD-CRUDCiclos]] (una sesión cuelga de un ciclo existente) y [[PRD-CatalogoEjercicios]] (un `SessionExercise` referencia un `Exercise` del catálogo).
- Relacionado con: Fase 3 (`ExerciseLog`), que es quien realmente consume `SessionExercise` para registrar ejecución.

## 10. Métricas de éxito

Ninguna adicional a las del PRD general — se medirán junto con el CRUD de ciclos.

## 11. Estado y decisiones abiertas

- **Sin reordenamiento**: si hace falta cambiar el orden de sesiones/ejercicios, se agrega cuando exista una UI real que lo necesite (drag-and-drop).
- **Sesión completada/saltada por el atleta**: pospuesto a Fase 3, ver sección 3.
