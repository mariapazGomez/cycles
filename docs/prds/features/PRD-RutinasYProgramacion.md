---
type: prd
level: feature
parent: "[[PRD-General]]"
status: in-progress
phase: "Fase 2 — Planificación"
created: 2026-09-23
updated: 2026-09-23
tags: [prd, feature/rutinas-programacion]
related: ["[[PRD-CRUDCiclos]]", "[[PRD-CRUDSesiones]]", "[[PRD-CatalogoEjercicios]]"]
---

# PRD — Rutinas y programación en grid

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación. **Reemplaza parcialmente** [[PRD-CRUDCiclos]] y [[PRD-CRUDSesiones]] — ver la nota de estado en cada uno.

## 1. Resumen

Separa el **contenido** de un entrenamiento (la rutina: qué ejercicios, en qué orden, con qué metas) de su **programación** (cuándo y cuántas veces se ejecuta dentro de un plan). Un coach arma rutinas reutilizables en una biblioteca propia, y las asigna a las celdas de un grid (semana × sesión) al armar un plan. Nace de una conversación de diseño el 2026-09-23, no de una historia de usuario preexistente del PRD general — motiva actualizar ese documento también.

## 2. Problema / motivación

El primer diseño de Fase 2 ([[PRD-CRUDCiclos]] + [[PRD-CRUDSesiones]]) modelaba una sesión como una lista plana (`orderIndex`) armada desde cero cada vez, con ejercicios agregados uno por uno directo en esa sesión. Eso no refleja cómo programa un coach real: la misma rutina ("Push A", "Pull B") se repite semana a semana dentro de un mismo mesociclo, con ajustes de peso/reps (progresión), no se re-arma de cero cada vez. Además, un plan puede ser de distinta naturaleza (microciclo de una semana, mesociclo de varias semanas con un objetivo, o un macrociclo que agrupa varios mesociclos) — el modelo anterior no distinguía esto.

## 3. Alcance

### Dentro de alcance

- **Biblioteca de rutinas** por coach (no hay catálogo global de rutinas, a diferencia del catálogo de ejercicios): el coach arma una rutina (nombre + lista de ejercicios con series/reps/peso/descanso *por defecto*) una vez, y la reutiliza en cualquier plan futuro.
- **Tipo de plan** (`cycleType`): `microcycle` | `mesocycle` | `macrocycle`.
  - `microcycle`/`mesocycle`: el coach define `sessionsPerWeek` (frecuencia semanal) y el plan genera un **grid** (filas = sesión 1..N por semana, columnas = semana 1..M, derivado de `startDate`/`endDate`).
  - `macrocycle`: **no tiene grid propio** — es un contenedor. Agrupa otros planes (`microcycle`/`mesocycle`) como hijos vía `parentCycleId`.
- **Asignar una rutina a una celda del grid**: crea la sesión (`TrainingSession`) en esa `(weekNumber, slotNumber)`, copiando los ejercicios de la rutina como `SessionExercise` editables — el ajuste de peso/reps en esa celda puntual **no modifica la rutina original** (así se arma la progresión semana a semana).
- Se guarda de qué rutina salió cada sesión (`TrainingSession.routineId`), pero **no se muestra en la UI** — es solo trazabilidad interna.
- Toda celda del grid se llena **a partir de una rutina de la biblioteca** — no hay armado de ejercicios sueltos directo en una celda en esta iteración (ver "Fuera de alcance").
- Agregar/editar/quitar un ejercicio puntual dentro de una sesión ya asignada sigue funcionando igual que hoy (`POST/PATCH/DELETE` sobre `session-exercises`, ya implementado en [[PRD-CRUDSesiones]]) — permite ajustar una celda más allá de lo que trajo la rutina.

### Fuera de alcance

- **Armar una rutina directo sobre una celda del grid** (sin partir de la biblioteca): pedido explícitamente como funcionalidad futura, no se construye ahora.
- Editar la rutina original desde una celda y que el cambio se propague a otras celdas que la usan — cada celda es independiente una vez asignada.
- Reordenar o mover una rutina ya asignada de una celda a otra (drag-and-drop) — ya estaba fuera de alcance en [[PRD-CRUDSesiones]] y se mantiene.
- Cambiar `sessionsPerWeek` después de creado el plan y que el grid se redimensione automáticamente (agregar/quitar filas moviendo sesiones existentes) — por ahora, cambiarlo solo afecta cómo se renderiza el grid hacia adelante, no reordena lo ya asignado.
- Validar que las fechas de un plan hijo (`parentCycleId`) caigan dentro del rango de fechas del macrociclo padre — no se fuerza en esta iteración.

## 4. Historias de usuario

1. Como **coach**, quiero armar una rutina una sola vez (ej. "Push A") y reutilizarla en distintas semanas/planes, para no reconstruir lo mismo cada vez.
2. Como **coach**, quiero elegir si un plan es un microciclo, mesociclo o macrociclo, para que la herramienta se adapte a cómo pienso ese nivel de planificación.
3. Como **coach**, quiero definir cuántas sesiones por semana tiene un plan y ver un grid con esos espacios, para visualizar de un vistazo toda la estructura antes de llenarla.
4. Como **coach**, quiero asignar una rutina a una celda del grid y después ajustar el peso de esa semana puntual, para programar progresión sin duplicar rutinas.
5. Como **coach**, quiero agrupar varios mesociclos dentro de un macrociclo, para planificar una temporada completa.

## 5. Modelo de datos (delta)

```prisma
enum CycleType {
  microcycle
  mesocycle
  macrocycle
}

model TrainingCycle {
  // ...campos existentes (name, objective, startDate, endDate, status, isTemplate, templateId)...
  cycleType       CycleType @default(mesocycle)
  sessionsPerWeek Int?      // null cuando cycleType = macrocycle
  parentCycleId   String?   // este plan vive dentro de un macrociclo

  parentCycle TrainingCycle?  @relation("CycleContainer", fields: [parentCycleId], references: [id])
  childCycles TrainingCycle[] @relation("CycleContainer")
  // (el self-relation existente "CycleTemplate" para duplicar como plantilla no cambia)
}

model Routine {
  id        String   @id @default(uuid())
  coachId   String
  name      String
  createdAt DateTime @default(now())

  coach            User              @relation(fields: [coachId], references: [id])
  routineExercises RoutineExercise[]
  sessions         TrainingSession[] // trazabilidad, no se expone en la UI
}

model RoutineExercise {
  id                 String  @id @default(uuid())
  routineId          String
  exerciseId         String
  orderIndex         Int
  defaultSets        Int
  defaultReps        Int
  defaultWeight      Float?
  defaultRestSeconds Int?

  routine  Routine  @relation(fields: [routineId], references: [id])
  exercise Exercise @relation(fields: [exerciseId], references: [id])
}

model TrainingSession {
  // name, scheduledDate, status se mantienen
  weekNumber Int
  slotNumber Int
  routineId  String?  // de qué rutina salió; guardado, no se muestra en la UI

  routine Routine? @relation(fields: [routineId], references: [id])
  // se elimina orderIndex, reemplazado por (weekNumber, slotNumber)

  @@unique([cycleId, weekNumber, slotNumber])
}
```

`SessionExercise` no cambia de forma — sigue siendo la fuente de verdad de los targets de esa celda puntual; al asignar una rutina se bulk-crean sus filas copiando los `RoutineExercise` de la rutina elegida.

`TrainingSession.routineId` usa `onDelete: SetNull`: borrar una rutina de la biblioteca no rompe sesiones ya asignadas, solo pierde el dato de trazabilidad.

## 6. Diseño de API (delta)

- `POST /routines` — `{ name, exercises: [{ exerciseId, defaultSets, defaultReps, defaultWeight?, defaultRestSeconds? }] }`.
- `GET /routines` — biblioteca del coach autenticado.
- `GET /routines/:id` — detalle con ejercicios.
- `PATCH /routines/:id` — editar nombre/ejercicios (reemplaza la lista completa, más simple que diffing parcial).
- `DELETE /routines/:id` — borrado real (las sesiones ya asignadas no se rompen, ver `onDelete: SetNull`).
- `POST /cycles`: agrega `cycleType`, `sessionsPerWeek` (requerido si no es `macrocycle`), `parentCycleId` (opcional).
- `GET /cycles`: por defecto excluye los planes que tienen `parentCycleId` (aparecen anidados bajo su macrociclo, no en el listado principal).
- `GET /cycles/:id/children` — lista los planes hijos de un macrociclo.
- `POST /cycles/:cycleId/sessions` **cambia de forma**: pasa de `{ name, scheduledDate? }` a `{ weekNumber, slotNumber, routineId, scheduledDate? }` — crea la sesión y copia los ejercicios de la rutina. `name` se toma del nombre de la rutina (editable después vía `PATCH /sessions/:id`, que no cambia).
- El resto de `PATCH/DELETE /sessions/:id` y `POST/PATCH/DELETE` sobre `session-exercises` **no cambia** — ya soportan ajustar una celda puntual.

## 7. UI/UX

- Al crear un plan: primero `cycleType`, y si no es `macrocycle`, `sessionsPerWeek`.
- Vista de un plan `micro`/`meso`: grid (filas = sesión 1..N, columnas = semana 1..M). Celda vacía → botón para asignar una rutina de la biblioteca. Celda llena → nombre de la rutina + resumen, click entra al detalle de esa sesión (misma pantalla `/sessions/:id` que ya existe) para ajustar targets.
- Vista de un plan `macrocycle`: lista de sus planes hijos (no un grid), con botón para crear un mesociclo/microciclo dentro.
- Biblioteca de rutinas: pantalla nueva para crear/editar/listar rutinas propias — necesaria antes de poder asignar nada al grid.

## 8. Requisitos no funcionales específicos

Ninguno adicional a los del PRD general.

## 9. Dependencias

- Depende de: [[PRD-CatalogoEjercicios]] (`RoutineExercise` referencia el mismo catálogo de `Exercise`).
- Reemplaza el modelo de creación de sesiones de [[PRD-CRUDSesiones]] (el CRUD de `session-exercises` individual se mantiene igual).
- Reemplaza la creación simple de [[PRD-CRUDCiclos]] (ahora requiere `cycleType`/`sessionsPerWeek`/`parentCycleId`).

## 10. Métricas de éxito

- Nº de rutinas reutilizadas en más de un plan (valida que la biblioteca realmente ahorra trabajo).
- % de celdas del grid llenadas vs. vacías al momento de que un plan pasa a `active`.

## 11. Estado y decisiones abiertas

**Backend completo y probado (2026-09-24)**: migración aplicada, `RoutinesModule` nuevo, `cycles`/`sessions` reescritos. Probado end-to-end: crear/editar/borrar rutina (borrar no rompe sesiones ya asignadas, `routineId` queda en null), crear meso/microciclo con `sessionsPerWeek`, asignar rutina a una celda, ajustar peso de esa instancia sin afectar la rutina original, reusar la misma rutina en otra semana con progresión, celda duplicada (409), slot fuera de rango (400), macrociclo sin `sessionsPerWeek`, crear hijo bajo un macrociclo, rechazar hijo bajo un no-macrociclo (400), macrociclo no acepta sesiones propias (400), listado principal excluye hijos, atleta con acceso de lectura a macrociclo + hijos.

**Pendiente: todo el frontend.** El de Fase 2 anterior (`/cycles`, `/cycles/:id`, `/sessions/:id`) quedó desactualizado (asumía el modelo viejo de sesiones sueltas) y necesita reescritura: selector de `cycleType`/`sessionsPerWeek` al crear un plan, biblioteca de rutinas (nueva pantalla), vista de grid, vista de macrociclo como lista de hijos.

- **Armar rutina directo en una celda del grid**: pedido explícitamente para el futuro, no ahora.
- **Redimensionar el grid** (cambiar `sessionsPerWeek` con sesiones ya asignadas): sin resolver, se deja para cuando haya un caso real.
- **Validación de fechas hijo-dentro-de-padre en macrociclos**: no implementada todavía.
