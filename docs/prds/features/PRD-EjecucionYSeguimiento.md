---
type: prd
level: feature
parent: "[[PRD-General]]"
status: draft
phase: "Fase 3 — Ejecución y seguimiento"
created: 2026-09-25
updated: 2026-09-25
tags: [prd, feature/ejecucion-seguimiento]
related: ["[[PRD-RutinasYProgramacion]]", "[[PRD-CRUDSesiones]]", "[[PRD-CatalogoEjercicios]]"]
---

# PRD — Ejecución y seguimiento

> Hijo de [[PRD-General]]. Fase: Fase 3 — Ejecución y seguimiento. Cubre las historias 6 y 7 del PRD general.

## 1. Resumen

El atleta registra lo que realmente hizo en cada sesión asignada: series con reps y peso reales, cuánto esfuerzo le costó cada ejercicio y una valoración corta de la sesión completa. El coach ve ese registro contrastado con lo que planificó: adherencia, esfuerzo real vs. esfuerzo objetivo, carga semanal y fuerza estimada, más una lista de atletas que necesitan atención con una sugerencia de ajuste de carga que el coach acepta o descarta.

## 2. Problema / motivación

Hasta la Fase 2, Cycles solo sabe lo que el coach **planificó**. Sin el dato de lo **ejecutado** y de cuánto le costó al atleta, el coach no puede saber si la carga está bien calibrada, y vuelve a depender de mensajes sueltos o planillas para enterarse. Además, el registro de ejecución es el dato más valioso a largo plazo para la compañía (ver [[VISION]]): tiene que capturarse con calidad desde el primer día.

La clave del diseño: **para poder ajustar cargas hay que comparar el esfuerzo real con un esfuerzo planificado.** Por eso esta fase agrega también un esfuerzo objetivo a la planificación, no solo el registro del atleta.

## 3. Alcance

### Dentro de alcance

**Planificación (delta sobre Fase 2)**
- Esfuerzo objetivo por ejercicio, expresado como **RIR objetivo** (repeticiones en reserva, 0–4) en `RoutineExercise` (por defecto) y `SessionExercise` (por celda, se copia al asignar una rutina, igual que series/reps/peso).

**Registro del atleta**
- Iniciar una sesión (marca la hora de inicio para calcular la duración).
- Registrar **por serie**: reps reales y peso real. La UI pre-llena cada serie con los objetivos; confirmar una serie sin cambios es un toque.
- Registrar el esfuerzo de cada ejercicio con la pregunta **"¿Cuántas reps más podías hacer?"** (0, 1, 2, 3, 4 o más) sobre la última serie. Se guarda como RIR en esa serie.
- Cerrar la sesión con un feedback obligatorio y corto:
  - **Esfuerzo de la sesión (sRPE, método Foster)**, escala 0–10 con anclas verbales.
  - **Duración** en minutos (calculada desde el inicio; editable).
  - **¿Sentiste dolor o molestia?** sí/no + nota opcional.
  - Nota libre opcional.
- Marcar una sesión como **omitida** con una nota opcional del motivo.
- Corregir un registro ya enviado (sin borrar el original, ver NFR).

**Seguimiento del coach**
- **Necesitan atención**: lista de alertas sobre todos sus atletas activos, cada una con el motivo concreto (reglas en §7.3).
- **Resumen por atleta**: adherencia por semana, carga semanal (sRPE × minutos), esfuerzo real vs. objetivo por ejercicio, e1RM estimado por ejercicio.
- **Progreso del plan**: por celda del grid, estado de la sesión y, por ejercicio, objetivo vs. real.
- **Sugerencia de ajuste de carga**: cuando el esfuerzo real se desvía del objetivo de forma sostenida, se propone subir o bajar el peso de ese ejercicio en las sesiones pendientes del plan. El coach la **acepta o descarta**; la app nunca cambia cargas sola. Cada ajuste aceptado queda registrado.

### Fuera de alcance

- Chequeo de disposición previo a la sesión (sueño, dolor muscular, energía). Se evalúa cuando el registro de sesión tenga uso sostenido.
- Integración con wearables (frecuencia cardíaca, HRV).
- Alertas automáticas por ratio agudo:crónico o umbrales de carga semanal: la carga se muestra como tendencia, no genera alertas en esta fase.
- Notificaciones push/email al coach o al atleta (Fase 4).
- Comentarios o chat coach↔atleta sobre una sesión (el PRD general lo reevalúa en esta fase; se mantiene fuera: la nota del atleta es de un solo sentido).
- Modo offline completo. Sí se exige tolerancia a reintentos (ver NFR).
- Ejercicios por tiempo o distancia (plancha, cardio): esta fase registra reps + peso. Los ejercicios sin peso se registran con peso nulo.
- Comparar o agregar datos entre atletas distintos.

## 4. Historias de usuario

1. Como **atleta**, quiero ver lo que me toca hoy y registrarlo serie por serie con el mínimo de toques, para no cortar mi entrenamiento.
2. Como **atleta**, quiero indicar cuántas reps más podía hacer en cada ejercicio, para que mi coach sepa si el peso fue el correcto.
3. Como **atleta**, quiero valorar la sesión completa y avisar si sentí dolor, para que mi coach lo tenga en cuenta.
4. Como **atleta**, quiero marcar una sesión como omitida y decir por qué, para que mi plan refleje la realidad.
5. Como **coach**, quiero definir un esfuerzo objetivo por ejercicio al armar una rutina, para tener contra qué comparar lo que reporta el atleta.
6. Como **coach**, quiero ver primero qué atletas necesitan atención y por qué, para no revisar uno por uno.
7. Como **coach**, quiero ver la adherencia, la carga semanal y la evolución de fuerza de un atleta, para decidir si el plan está funcionando.
8. Como **coach**, quiero que la app me sugiera subir o bajar la carga de un ejercicio cuando el esfuerzo se desvía, y aplicarlo a las próximas sesiones con un toque, para ajustar el plan sin editar celda por celda.

## 5. Modelo de datos (delta)

```prisma
model RoutineExercise {
  // ...campos existentes...
  defaultRir Int?   // RIR objetivo por defecto (0–4). Null = sin objetivo de esfuerzo.
}

model SessionExercise {
  // ...campos existentes...
  targetRir Int?    // se copia de RoutineExercise.defaultRir al asignar; editable por celda
}

model TrainingSession {
  // ...campos existentes...
  startedAt DateTime?   // lo marca el atleta al iniciar; base para calcular la duración
}

// CAMBIA DE FORMA: pasa de "un registro por ejercicio" a "un registro por serie".
// Ningún endpoint escribe en esta tabla todavía (y no hay producción desplegada), así que la
// migración puede eliminar las columnas viejas sin migrar datos.
model ExerciseLog {
  id                String   @id @default(uuid())   // lo genera el cliente: permite reintentos idempotentes
  sessionExerciseId String
  athleteId         String
  setNumber         Int                             // 1..N
  actualReps        Int
  actualWeight      Float?                          // siempre en kg; null = peso corporal
  rir               Int?                            // 0–4 (4 = "4 o más"). Se pide en la última serie.
  supersedesId      String?  @unique                // corrección: apunta al registro que reemplaza
  loggedAt          DateTime @default(now())

  sessionExercise SessionExercise @relation(fields: [sessionExerciseId], references: [id])
  athlete         User            @relation(fields: [athleteId], references: [id])
  supersedes      ExerciseLog?    @relation("LogCorrection", fields: [supersedesId], references: [id])
  supersededBy    ExerciseLog?    @relation("LogCorrection")
  // se eliminan: actualSets, rpe, notes (la nota pasa a SessionFeedback)
}

enum SessionOutcome {
  completed
  skipped
}

model SessionFeedback {
  id              String         @id @default(uuid())
  sessionId       String
  athleteId       String
  outcome         SessionOutcome
  srpe            Int?           // 0–10, obligatorio si outcome = completed
  durationMinutes Int?           // obligatorio si outcome = completed
  pain            Boolean        @default(false)
  painNotes       String?
  notes           String?        // nota libre, o motivo si outcome = skipped
  supersedesId    String?        @unique
  submittedAt     DateTime       @default(now())

  session      TrainingSession  @relation(fields: [sessionId], references: [id])
  athlete      User             @relation(fields: [athleteId], references: [id])
  supersedes   SessionFeedback? @relation("FeedbackCorrection", fields: [supersedesId], references: [id])
  supersededBy SessionFeedback? @relation("FeedbackCorrection")
}

model LoadAdjustment {
  id              String   @id @default(uuid())
  coachId         String
  cycleId         String
  exerciseId      String
  fromWeek        Int                 // primera semana afectada
  percentChange   Float               // p. ej. -5 o +2.5
  reason          String              // regla que la originó (ver §7.3), o "manual"
  affectedCount   Int                 // cuántos SessionExercise se modificaron
  createdAt       DateTime @default(now())

  coach    User          @relation(fields: [coachId], references: [id])
  cycle    TrainingCycle @relation(fields: [cycleId], references: [id])
  exercise Exercise      @relation(fields: [exerciseId], references: [id])
}
```

Reglas del modelo:
- **Append-only** (NFR del PRD general): ni `ExerciseLog` ni `SessionFeedback` se actualizan ni se borran. Una corrección es una fila nueva con `supersedesId` apuntando a la anterior. El dato vigente es la fila que no fue reemplazada.
- `TrainingSession.status` se actualiza a `completed` o `skipped` al guardar un `SessionFeedback` (dato derivado para listar rápido; la fuente es el feedback vigente).
- **RIR como única escala guardada.** La UI puede mostrarlo como RPE (`RPE = 10 − RIR`); "4 o más" se muestra como RPE ≤ 6.
- `LoadAdjustment` guarda qué decidió el coach y por qué, para poder medir más adelante si los ajustes funcionaron ([[VISION]]: decisiones y sus resultados).

## 6. Diseño de API (delta)

**Planificación**
- `POST /routines`, `PATCH /routines/:id`: cada ejercicio acepta `defaultRir?` (0–4).
- `POST /cycles/:cycleId/sessions` (asignar rutina): copia `defaultRir` → `targetRir`.
- `PATCH /session-exercises/:id`: acepta `targetRir?`.

**Atleta** (solo el atleta asignado, con relación coach–atleta activa y plan `active`)
- `GET /me/today` — próxima sesión pendiente del plan activo, con sus ejercicios, objetivos y lo ya registrado.
- `POST /sessions/:id/start` — marca `startedAt` (idempotente: si ya tiene valor, no lo cambia).
- `POST /session-exercises/:id/logs` — `{ id, setNumber, actualReps, actualWeight?, rir?, supersedesId? }`. `id` lo genera el cliente; si ya existe, responde 200 con el registro existente (reintento seguro).
- `POST /sessions/:id/feedback` — `{ outcome, srpe?, durationMinutes?, pain, painNotes?, notes?, supersedesId? }`. Valida `srpe` y `durationMinutes` cuando `outcome = completed`. Actualiza `TrainingSession.status`.
- `GET /sessions/:id` — incluye `targetRir`, los registros vigentes por serie y el feedback vigente.

**Coach** (solo sobre atletas con relación activa)
- `GET /coach/attention` — alertas activas de todos sus atletas: `[{ athleteId, kind, exerciseId?, cycleId?, detail, suggestion? }]`.
- `GET /athletes/:athleteId/summary?weeks=6` — por semana: sesiones asignadas/completadas/omitidas y carga; por ejercicio principal: e1RM por semana y desvío de esfuerzo promedio.
- `GET /cycles/:id/progress` — por celda: estado y feedback; por ejercicio: objetivo vs. real (series completadas, reps, peso, RIR).
- `POST /cycles/:id/load-adjustments` — `{ exerciseId, fromWeek, percentChange, reason }`. Modifica `targetWeight` de ese ejercicio en las sesiones `pending` del plan desde `fromWeek` (redondeo a 0,5 kg), crea el `LoadAdjustment` y devuelve cuántas filas cambió.

## 7. UI/UX

Mockups: lienzo de pantallas web de Cycles (Design artifact), a completar en la siguiente iteración con: registro de sesión del atleta (móvil), "Necesitan atención", resumen por atleta y progreso en el grid del plan.

### 7.1 Atleta (mobile-first)
- **Hoy**: la sesión que toca, con botón "Empezar sesión".
- **Registro**: un ejercicio a la vez. Cada serie aparece pre-llenada con los objetivos; ✓ la confirma, tocar el número la corrige. Tras la última serie aparece la pregunta de esfuerzo con cinco botones grandes (0, 1, 2, 3, 4+).
- **Cierre**: sRPE con anclas verbales (0 reposo · 3 moderada · 5 dura · 7 muy dura · 10 máximo), duración pre-calculada, dolor sí/no, nota. Botón "Terminar sesión".
- Todo con controles ≥ 44 px y usable con una mano.

### 7.2 Coach
- **Necesitan atención** (primera pantalla del coach): alertas agrupadas por atleta, cada una en una línea que dice qué pasó y qué se sugiere, con acción directa ("Aplicar −5 % desde semana 4" / "Descartar" / "Ver atleta").
- **Resumen por atleta**: adherencia por semana, carga semanal como tendencia (barras), tabla de ejercicios con RIR objetivo vs. real y e1RM.
- **Grid del plan**: cada celda muestra estado (Completada / Pendiente / Omitida, con texto además de color) y un indicador si hubo dolor.

### 7.3 Reglas de alertas y cálculos (v1)

| Alerta | Condición | Sugerencia |
|---|---|---|
| Carga alta | En las **2 últimas sesiones** con ese ejercicio: RIR real ≤ RIR objetivo − 1 (o no completó las reps objetivo) | Bajar 5 % desde la próxima semana pendiente |
| Carga baja | En las **2 últimas sesiones** con ese ejercicio: RIR real ≥ RIR objetivo + 2 y completó todas las reps | Subir 2,5 % desde la próxima semana pendiente |
| Dolor reportado | `pain = true` en los últimos 7 días | Ver sesión |
| Adherencia baja | Alguna sesión de una semana ya terminada sin feedback, o 2+ omitidas en los últimos 14 días | Ver atleta |

- **Esfuerzo**: desvío = RIR objetivo − RIR real (positivo = más duro de lo planificado). Solo se calcula si hay `targetRir`.
- **Carga de sesión**: `srpe × durationMinutes` (unidades arbitrarias). Carga semanal = suma de la semana.
- **e1RM** (Epley ajustado por RIR): `peso × (1 + (reps + RIR) / 30)`, tomando la mejor serie de cada sesión. Sin RIR, se usa RIR = 0.
- Una alerta de carga deja de mostrarse cuando el coach la aplica o la descarta, o cuando llega un registro nuevo que ya no cumple la condición. El descarte se guarda solo en el cliente en v1 (decisión abierta).
- Los porcentajes y umbrales son valores iniciales razonables, no validados con coaches; quedan como constantes fáciles de cambiar.

## 8. Requisitos no funcionales específicos

- **Reintentos seguros**: el atleta registra en el gimnasio con conexión inestable. Los `POST` de registro usan un `id` generado por el cliente, así que un reintento nunca duplica una serie.
- **Append-only estricto** en `ExerciseLog` y `SessionFeedback` (el PRD general ya lo exige): ningún endpoint de actualización ni de borrado sobre esas tablas.
- **Latencia del registro**: confirmar una serie debe responder en < 300 ms p95; la UI actualiza en forma optimista.
- `GET /coach/attention` debe responder en < 1 s para un coach con 100 atletas activos (NFR de escala del PRD general).
- Pesos siempre en kg en la base; la conversión a lb ocurre en la UI según `User.weightUnit`.

## 9. Dependencias

- Depende de: [[PRD-RutinasYProgramacion]] (grid, `SessionExercise` por celda, copia desde la rutina), [[PRD-InvitacionAtletas]] (relación coach–atleta activa), [[PRD-CatalogoEjercicios]].
- Relacionado con: [[PRD-CRUDSesiones]] (`removeExercise` ya bloquea quitar un ejercicio con registros; se mantiene).

## 10. Métricas de éxito

- % de sesiones asignadas que terminan con `SessionFeedback` (adherencia de registro). Meta inicial: ≥ 70 % a las 4 semanas.
- % de ejercicios registrados con RIR respondido.
- Tiempo mediano para registrar una sesión completa (desde "Empezar" hasta "Terminar", descontando el entrenamiento: toques por serie).
- % de sugerencias de ajuste aceptadas vs. descartadas (si casi todas se descartan, las reglas están mal calibradas).

## 11. Estado y decisiones abiertas

**Borrador (2026-09-25).** Listo para empezar el backend una vez confirmadas las decisiones marcadas con *por confirmar*.

Decisiones tomadas en esta versión (recomendación de diseño, **por confirmar** con el usuario):
- **Escala de esfuerzo del atleta = RIR** ("¿cuántas reps más podías hacer?") en vez de RPE 1–10 directo. El coach puede verlo como RPE.
- **Registro por serie**, no un valor por ejercicio. Es lo que permite estimar fuerza y ajustar cargas con precisión.
- **Esfuerzo objetivo por ejercicio** (`targetRir`) definido por el coach en la rutina. Opcional: sin él no hay alertas de carga para ese ejercicio.

Abiertas:
- **Descartar una alerta**: ¿se guarda en servidor (tabla nueva) o alcanza con el cliente en v1?
- **Umbrales y porcentajes** de §7.3: validar con 2–3 coaches reales antes de fijarlos.
- **Ejercicios por tiempo/distancia**: necesitan otros campos (`actualSeconds`, `actualMeters`); se decide cuando el catálogo los distinga.
- **Ejercicios principales** para e1RM: ¿los marca el coach o se toman todos los que tienen peso?
