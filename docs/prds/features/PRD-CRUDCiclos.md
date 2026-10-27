---
type: prd
level: feature
parent: "[[PRD-General]]"
status: superseded-parcial
phase: "Fase 2 — Planificación"
created: 2026-09-22
updated: 2026-10-27
tags: [prd, feature/crud-ciclos]
related: ["[[PRD-InvitacionAtletas]]", "[[PRD-RutinasYProgramacion]]"]
---

# PRD — CRUD de ciclos de entrenamiento

> Hijo de [[PRD-General]]. Fase: Fase 2 — Planificación.
>
> ⚠️ **Parcialmente superado por [[PRD-RutinasYProgramacion]]** (2026-09-23): la creación de un ciclo ahora requiere `cycleType`, `sessionsPerWeek` y opcionalmente `parentCycleId`. El resto de este documento (autorización, listado scoped por rol, decisión de no-borrado) sigue vigente.

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
- Validación de transiciones de estado (ej. impedir volver de `completed` a `active` sin querer): no implementada en esta iteración: `PATCH` acepta cualquier `status` válido del enum.
- UI en `apps/web`: no incluida en esta pieza — se construye junto con el CRUD de sesiones, que es donde un coach realmente arma el contenido de un ciclo.

## 4. Historias de usuario

1. Como **coach**, quiero crear un ciclo de entrenamiento con nombre, objetivo, fechas de inicio/fin, para planificar el trabajo de un atleta. (Historia 3 del PRD general)
2. Como **coach**, quiero ver la lista de ciclos que armé, filtrando por atleta o estado, para ubicar rápido el que necesito.
3. Como **atleta**, quiero ver los ciclos que mi coach me asignó, para saber qué tengo planificado.
4. Como **coach**, quiero editar un ciclo (fechas, objetivo, estado) después de creado, para ajustarlo si algo cambia.

## 5. Modelo de datos (delta)

Hasta 2026-10-26 ninguno. **Desde 2026-10-27 (ciclos plantilla, CYC-166):** migración `20261027140000_ciclo_plantilla`.

- `TrainingCycle.athleteId` pasa a ser **opcional**: una plantilla (`isTemplate = true`) no tiene atleta. La clave foránea conserva `ON DELETE RESTRICT`.
- Columna nueva `templateWeeks` (semanas de la plantilla).
- Una plantilla guarda **fechas de referencia fijas** (lunes 2001-01-01 y el fin según sus semanas, `apps/api/src/cycles/template-dates.ts`), porque toda la app lee `startDate` y `endDate`. Las fechas reales se ponen al asignarla.
- La plantilla **no lleva rutinas dentro**: las rutinas se ponen en el calendario del atleta, con el ciclo ya asignado.
- Asignar una plantilla crea una **copia** (`templateId` apunta a la plantilla). Editar la plantilla después no cambia las copias.

## 6. Diseño de API — implementado en `apps/api/src/cycles`

- `POST /cycles` (rol `coach`) — body `{ athleteId, name, objective?, startDate, endDate }`.
- `GET /cycles` (coach o atleta) — query opcional `{ athleteId?, status? }` (`athleteId` solo aplica si el que consulta es coach).
- `GET /cycles/:id` (coach o atleta, dueño/asignado).
- `PATCH /cycles/:id` (rol `coach`, dueño) — body parcial `{ name?, objective?, startDate?, endDate?, status? }`. No edita plantillas (400).
- **Plantillas (2026-10-27):**
  - `POST /cycles/templates` (rol `coach`) — body `{ name, objective?, cycleType: "microcycle" | "mesocycle", weeks (1-52), sessionsPerWeek (1-14) }`.
  - `PATCH /cycles/templates/:id` (rol `coach`, dueño) — body parcial con los mismos campos; cambiar `weeks` recalcula el fin de referencia.
  - `POST /cycles/:id/assign` (rol `coach`, dueño de la plantilla) — body `{ athleteId, startDate }`; el atleta debe tener relación activa. Devuelve el ciclo copiado.
  - `GET /cycles?templates=include|only` (solo coach): por defecto la lista **no** trae plantillas; `include` las suma a los ciclos de sus atletas y `only` trae solo las plantillas. Con `athleteId` se ignora. Un atleta nunca las recibe.
  - `GET /cycles/:id` de una plantilla: solo su coach dueño (sin exigir relación, porque no hay atleta); el atleta y otro coach reciben 403.

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

- **Plantillas: implementadas el 2026-10-27** (ver secciones 5 y 6; la interfaz llega con CYC-171). **El borrado sigue fuera.**
- **Sin validación de máquina de estados**: hoy `PATCH` deja pasar cualquier transición de `status` (incluso "rarezas" como volver de `completed` a `active` sin querer). Se decidió no restringirlo todavía para no adivinar reglas de negocio que el usuario no pidió explícitamente; se ajusta cuando haya un caso real que lo justifique.
