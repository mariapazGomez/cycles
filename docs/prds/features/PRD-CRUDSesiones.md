---
type: prd
level: feature
parent: "[[PRD-General]]"
status: superseded-parcial
phase: "Fase 2 — Planificación"
created: 2026-09-22
updated: 2026-10-27
tags: [prd, feature/crud-sesiones]
related: ["[[PRD-CRUDCiclos]]", "[[PRD-CatalogoEjercicios]]", "[[PRD-RutinasYProgramacion]]"]
---

# PRD — CRUD de sesiones y ejercicios de sesión

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.
>
> ⚠️ **Parcialmente superado por [[PRD-RutinasYProgramacion]]** (2026-09-23): una sesión ya no se crea con `{ name, scheduledDate? }` suelto — se instancia asignando una rutina de la biblioteca a una celda `(weekNumber, slotNumber)` del grid del plan. El CRUD de `session-exercises` (agregar/editar/quitar un ejercicio puntual de una sesión ya asignada) **sigue vigente sin cambios** — es lo que permite ajustar una celda más allá de lo que trajo la rutina.

## 1. Resumen

Permite a un coach agregar sesiones dentro de un ciclo (`TrainingSession`) y asignarles ejercicios del catálogo con metas concretas (`SessionExercise`: series, repeticiones, peso, descanso). Cubre las historias 4 y 5 del [[PRD-General]] — última pieza de Fase 2 antes de Fase 3 (registro de ejecución real).

## 2. Problema / motivación

Un ciclo ([[PRD-CRUDCiclos]]) es solo un contenedor con fechas hasta que tiene sesiones con contenido real. Sin esto, el catálogo de ejercicios ([[PRD-CatalogoEjercicios]]) tampoco tiene dónde usarse.

## 3. Alcance

### Dentro de alcance

- `POST /cycles/:cycleId/sessions` (coach, dueño del ciclo): crea una sesión vacía (nombre + fecha opcional). `orderIndex` se asigna automáticamente (correlativo dentro del ciclo, no lo elige el cliente).
- `GET /cycles/:cycleId/sessions`: coach dueño o atleta asignado, listado ordenado por `orderIndex`.
- `GET /sessions/:id`: detalle de una sesión **con sus ejercicios ya incluidos** (join con `Exercise` para traer nombre/grupo muscular) — evita un endpoint aparte para listar ejercicios de una sesión.
- `PATCH /sessions/:id` (coach dueño): actualiza `name`, `scheduledDate`, `status`. Cambiar el día **mueve** la sesión (ver «Pizarra del ciclo» abajo).
- `DELETE /sessions/:id` (coach dueño): **borrado lógico** (`deletedAt`), restaurable con `POST /sessions/:id/restore`. Rechaza con 409 una sesión completada o con series registradas.
- `POST /sessions/:id/restore` y `POST /sessions/:id/duplicate` (coach dueño): ver «Pizarra del ciclo».
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

- `POST /cycles/:cycleId/sessions` — body `{ routineId, scheduledDate?, weekNumber?, slotNumber? }` (la creación real instancia una rutina; ver `PRD-RutinasYProgramacion`). Dos formas de ubicar la sesión (**2026-10-27, CYC-166**):
  - **Por día:** solo `scheduledDate`. El servidor calcula la semana (bloques de 7 días desde el inicio del ciclo), rechaza días fuera del ciclo, permite **varias sesiones el mismo día** y **no aplica el tope de «sesiones por semana»**, que pasa a ser una guía. Toma el siguiente espacio libre de la semana y luego reparte otra vez los espacios de las sesiones con fecha siguiendo el orden de las fechas (`apps/api/src/sessions/slots.ts`), porque la app móvil ordena por `(weekNumber, slotNumber)`. Las sesiones sin fecha no se tocan.
  - **Por celda:** `weekNumber` y `slotNumber`, como antes (con tope de sesiones por semana y una sola sesión por celda).
  - Una plantilla no tiene sesiones (400).
- `GET /cycles/:cycleId/sessions` — sin body.
- `GET /sessions/:id` — incluye `sessionExercises` con su `exercise` embebido.
- `PATCH /sessions/:id` — body parcial `{ name?, scheduledDate?, status?, today? }`. Si `scheduledDate` cambia de día, la sesión se mueve (semana y espacios recalculados; reglas abajo). Mandar el mismo día no valida nada, así la ficha de sesión puede seguir editando el nombre.
- `DELETE /sessions/:id` — borrado lógico; 204. 409 si está completada o tiene series.
- `POST /sessions/:id/restore` — deshace el borrado lógico; devuelve la sesión con sus ejercicios.
- `POST /sessions/:id/duplicate` — body `{ scheduledDate, today? }`; copia la sesión con sus ejercicios (tal como quedaron) como pendiente, sin series ni cierre.
- `POST /sessions/:sessionId/exercises` — body `{ exerciseId, targetSets, targetReps, targetWeight?, targetRestSeconds? }`.
- `PATCH /session-exercises/:id` — body parcial `{ targetSets?, targetReps?, targetWeight?, targetRestSeconds? }`.
- `DELETE /session-exercises/:id` — 409 si ya tiene `ExerciseLog`.

### Pizarra del ciclo (CYC-178, 2026-10-28)

Reglas del servidor para la pizarra de la web (`docs/diseno/ciclos-pizarra`), solo en el modo **por día**; el modo por celda no cambia.

- **Ciclo activo (CYC-179, 2026-10-29).** Agregar, mover, duplicar, quitar y restaurar sesiones responde 409 si el ciclo está completado o archivado («reábrelo para cambiar sus sesiones»). Renombrar una sesión y editar sus ejercicios no se bloquea. Además, `PATCH /cycles/:id` rechaza (409) acortar el fin del ciclo si quedan sesiones (no quitadas) después de la nueva fecha o en semanas que dejarían de existir.
- **Solo desde hoy.** Crear, mover y duplicar rechazan (400) un día anterior a hoy o fuera del ciclo. El servidor no conoce la zona horaria del coach: la web manda su fecha local en `today` (AAAA-MM-DD), que se acepta si está a un día o menos del día UTC del servidor (400 si no). Sin `today` se tolera un día hacia atrás.
- **Mover** (`PATCH` con otro día): solo sesiones **pendientes** y **sin series ni cierre** (409 si no; una omitida lleva cierre, así que se duplica o se quita, no se mueve). Recalcula la semana; si cambia de semana toma el último espacio de la nueva y reparte los espacios de las dos semanas por fecha.
- **Quitar:** pone `deletedAt`; la sesión sigue ocupando su espacio `(ciclo, semana, espacio)`. Una sesión quitada desaparece del calendario del coach, de «Hoy» y el historial del atleta, del seguimiento y de los avisos, y responde 404 al detalle y a editarla. Se rechaza (409) si está completada o tiene series; una omitida sí se puede quitar y queda oculta para siempre (su cierre es historia del atleta, regla R7).
- **Purga sin tarea programada:** al quitar otra sesión del mismo ciclo se destruyen las quitadas hace más de 24 horas que no tengan series ni cierre.
- **Restaurar:** limpia `deletedAt` y reparte los espacios de la semana.
- **Duplicar:** copia nombre, rutina de origen y ejercicios con sus metas actuales como sesión pendiente en el día pedido (último espacio de esa semana, luego reordena).

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
