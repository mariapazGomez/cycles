---
type: prd
level: feature
parent: "[[PRD-General]]"
status: in-progress
phase: "Fase 2 — Planificación"
created: 2026-09-22
updated: 2026-09-22
tags: [prd, feature/crud-ciclos]
related: ["[[PRD-InvitacionAtletas]]"]
---

# PRD — CRUD de ciclos de entrenamiento

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.

## 1. Resumen

Permite a un coach crear, listar, ver el detalle y actualizar ciclos de entrenamiento (`TrainingCycle`) asignados a sus atletas. Cubre la historia 3 del [[PRD-General]].

## 2. Problema / motivación

Sin un ciclo no hay dónde colgar las sesiones (historia 4) ni qué mostrarle a un atleta (historia 5). Es la pieza central de Fase 2.

## 3. Alcance

### Dentro de alcance

- `POST /cycles` (coach): crea un ciclo para un atleta con el que tiene una relación `CoachAthlete` en `status: active`. Rechaza (403) si no hay relación activa con ese atleta — no importa si nunca existió o si ya terminó.
- `GET /cycles`: un coach ve los ciclos que creó (filtrable por `athleteId` y `status`); un atleta ve los ciclos que le asignaron (filtrable por `status`).
- `GET /cycles/:id`: detalle, solo visible para el coach dueño o el atleta asignado (403 para cualquier otro).
- `PATCH /cycles/:id` (coach, dueño): actualiza `name`, `objective`, `startDate`, `endDate`, `status` — cualquier combinación parcial. Sin máquina de estados: se acepta cualquier valor válido del enum `CycleStatus`, sin restringir qué transición es válida desde cuál (ver sección 11).
- Validación: `endDate` debe ser posterior a `startDate`, tanto al crear como al editar.

### Fuera de alcance

- **Plantillas** (`isTemplate`/`templateId`): el modelo ya los soporta, pero duplicar un ciclo como plantilla hacia otro atleta es una funcionalidad separada, no incluida acá. Decisión tomada el 2026-09-22.
- **Borrado (`DELETE`)**: no existe. Un ciclo que se descontinúa pasa a `status: archived` vía `PATCH`, nunca se borra de la base. Decisión tomada el 2026-09-22 — evita perder sesiones ya planificadas por error.
- Validación de transiciones de estado (ej. impedir volver de `completed` a `draft`): no implementada en esta iteración: `PATCH` acepta cualquier `status` válido del enum.
- UI en `apps/web`: no incluida en esta pieza — se construye junto con el CRUD de sesiones, que es donde un coach realmente arma el contenido de un ciclo.

## 4. Historias de usuario

1. Como **coach**, quiero crear un ciclo de entrenamiento con nombre, objetivo, fechas de inicio/fin, para planificar el trabajo de un atleta. (Historia 3 del PRD general)
2. Como **coach**, quiero ver la lista de ciclos que armé, filtrando por atleta o estado, para ubicar rápido el que necesito.
3. Como **atleta**, quiero ver los ciclos que mi coach me asignó, para saber qué tengo planificado.
4. Como **coach**, quiero editar un ciclo (fechas, objetivo, estado) después de creado, para ajustarlo si algo cambia.

## 5. Modelo de datos (delta)

Ninguno — usa `TrainingCycle` tal como está definido desde el scaffold inicial (`apps/api/prisma/schema.prisma`), sin cambios de schema.

## 6. Diseño de API — implementado en `apps/api/src/cycles`

- `POST /cycles` (rol `coach`) — body `{ athleteId, name, objective?, startDate, endDate }`.
- `GET /cycles` (coach o atleta) — query opcional `{ athleteId?, status? }` (`athleteId` solo aplica si el que consulta es coach).
- `GET /cycles/:id` (coach o atleta, dueño/asignado).
- `PATCH /cycles/:id` (rol `coach`, dueño) — body parcial `{ name?, objective?, startDate?, endDate?, status? }`.

## 7. UI/UX

No aplica en esta iteración (ver "Fuera de alcance").

## 8. Requisitos no funcionales específicos

Ninguno adicional a los del PRD general.

## 9. Dependencias

- Depende de: [[PRD-InvitacionAtletas]] — un ciclo requiere una relación `CoachAthlete` activa.
- Relacionado con: el futuro CRUD de sesiones, que cuelga de un `TrainingCycle` existente.

## 10. Métricas de éxito

- Nº de ciclos creados por coach activo (ya listada en el PRD general, sección 9).

## 11. Estado y decisiones abiertas

- **Plantillas y borrado quedaron fuera deliberadamente** (ver sección 3) — se retoman si hay demanda real.
- **Sin validación de máquina de estados**: hoy `PATCH` deja pasar cualquier transición de `status` (incluso "rarezas" como volver de `completed` a `draft`). Se decidió no restringirlo todavía para no adivinar reglas de negocio que el usuario no pidió explícitamente; se ajusta cuando haya un caso real que lo justifique.
