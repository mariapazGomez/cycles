---
type: prd
level: feature
parent: "[[PRD-General]]"
status: in-progress
phase: "Fase 2 — Planificación"
created: 2026-09-22
updated: 2026-09-22
tags: [prd, feature/catalogo-ejercicios]
related: []
---

# PRD — Catálogo de ejercicios

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.

## 1. Resumen

Catálogo de ejercicios reutilizables para armar sesiones de entrenamiento: un catálogo global (curado, disponible para todos los coaches) más los ejercicios propios que cada coach cree para sí mismo.

## 2. Problema / motivación

Antes de poder agregar ejercicios a una sesión (historia 4 del [[PRD-General]]) hace falta de dónde elegirlos. Sin un catálogo, cada coach tendría que escribir el nombre del ejercicio a mano cada vez, sin consistencia ni reutilización.

## 3. Alcance

### Dentro de alcance

- `GET /exercises`: catálogo global (`createdBy: null`) + los ejercicios propios del coach autenticado (si es coach). Un atleta solo ve el catálogo global.
- `POST /exercises` (coach): crea un ejercicio propio (`createdBy` = ese coach), no visible para otros coaches.
- `PATCH /exercises/:id/deactivate` (coach): desactiva (`isActive: false`) un ejercicio propio sin borrarlo — protege el historial de sesiones que ya lo usaron. Un coach no puede desactivar el catálogo global ni ejercicios de otro coach (403).
- Categorización por `muscleGroup` (enum fijo, ver sección 5), para poder filtrar/agrupar en la UI más adelante.
- Seed inicial del catálogo global: 54 ejercicios comunes de gimnasio, con nombres en **español revisados a mano**, cubriendo los 9 valores de `muscleGroup`.

### Fuera de alcance

- `PATCH /exercises/:id` para editar nombre/descripción/video de un ejercicio propio — se agrega si hay demanda.
- Editar o eliminar ejercicios del catálogo global — es contenido curado por la plataforma, no por los coaches.
- UI en `apps/web` — esta iteración es solo modelo + API; la pantalla para elegir ejercicios se construye junto con el CRUD de sesiones (donde realmente se usa).
- Videos/imágenes de demostración — el campo `videoUrl` existe en el modelo pero el seed no lo completa (ver sección 11).

## 4. Historias de usuario

1. Como **coach**, quiero ver un catálogo de ejercicios (global + los míos) al armar una sesión, para no escribir cada ejercicio desde cero.
2. Como **coach**, quiero agregar mis propios ejercicios (que no ve el resto de los coaches), para cubrir movimientos específicos de mi metodología.
3. Como **coach**, quiero poder dejar de usar un ejercicio propio sin borrar el historial de las sesiones donde ya se usó.

## 5. Modelo de datos (delta)

`Exercise.muscleGroup` pasó de `String?` a un enum fijo, y se agregó `isActive`:

```prisma
enum MuscleGroup {
  chest
  back
  legs
  glutes
  shoulders
  arms
  core
  cardio
  other
}

model Exercise {
  // ...campos existentes...
  muscleGroup MuscleGroup?
  isActive    Boolean      @default(true)
}
```

**Por qué un enum y no texto libre:** con texto libre, cada coach escribiría el grupo muscular distinto ("Pecho", "pecho", "Chest"), rompiendo cualquier filtro. Se prefirió una lista cerrada aunque agregar un valor nuevo requiera deploy — decisión tomada el 2026-09-22.

**Por qué `isActive` ahora:** agregarlo antes de que existan ejercicios en uso real es gratis; retrofitear un flag de este tipo después, con `SessionExercise`/`ExerciseLog` ya referenciando ejercicios, es más delicado (¿qué pasa con las sesiones ya armadas?). Se decidió resolverlo ahora que no hay costo.

## 6. Diseño de API — implementado en `apps/api/src/exercises`

- `GET /exercises` (autenticado) — catálogo global + propios (coach) o solo global (atleta).
- `POST /exercises` (rol `coach`) — body `{ name, muscleGroup?, description?, videoUrl? }`.
- `PATCH /exercises/:id/deactivate` (rol `coach`, dueño) — 403 si el ejercicio no es suyo.

## 7. UI/UX

No aplica en esta iteración (ver "Fuera de alcance").

## 8. Requisitos no funcionales específicos

Ninguno adicional a los del PRD general.

## 9. Dependencias

- Depende de: nada (usa el modelo `Exercise` ya definido desde el scaffold inicial, solo le agrega `MuscleGroup`/`isActive`).
- Relacionado con: el futuro CRUD de sesiones, que va a consumir este catálogo para armar `SessionExercise`.

## 10. Métricas de éxito

- % de ejercicios usados en sesiones que vienen del catálogo global vs. creados por el coach.

## 11. Estado y decisiones abiertas

- **Fuente del seed:** se evaluó importar un dataset público en inglés (`yuhonas/free-exercise-db`, dominio público, 876 ejercicios) y traducirlo automáticamente, pero la traducción palabra-por-palabra daba nombres con orden gramatical incorrecto (ej. "Un brazo por encima de la cabeza pesa rusa sentadilla"). Se descartó ese enfoque a favor de una lista curada a mano de 54 ejercicios comunes, con nombres en español correctos desde el día uno. Se puede ampliar el catálogo global más adelante agregando filas a mano o retomando una fuente externa con una traducción de mejor calidad.
- `videoUrl`: el seed no completa este campo (el dataset evaluado tenía fotos, no videos, y no había una fuente de videos ya lista). Queda vacío hasta que se decida una fuente.
- Edición de ejercicios propios: pendiente, no bloquea nada hoy.
