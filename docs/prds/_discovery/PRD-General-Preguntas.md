---
type: discovery
parent: "[[PRD-General]]"
status: mostly-resolved
created: 2026-09-16
updated: 2026-09-16
tags: [prd, discovery]
---

# Preguntas fundacionales — PRD General

> Cuestionario para solidificar [[PRD-General]]. Respuestas ya incorporadas al PRD, a [[PRD-Autenticacion]], al schema (`apps/api/prisma/schema.prisma`) y a [[VISION]].

## A. Visión y negocio

- [x] Marco de negocio: startup propia. Cycles es el primer producto/herramienta de captura de datos de una compañía enfocada en correlacionar datos deportivos y de salud para impulsar el rendimiento atlético. Ver [[VISION]].
- [ ] 🟡 Mercado geográfico inicial — sin definir.
- [ ] 🟡 Fecha objetivo de lanzamiento — sin definir.
- [x] Escala esperada / criterio de infraestructura: empezar minimalista (una instancia de Postgres administrada), escalar infraestructura cuando haya tracción real; el modelo de datos ya queda normalizado, así que escalar no implica rediseñarlo.

## B. Relación coach–atleta

- [x] Un atleta tiene como máximo un coach **activo** a la vez (`CoachAthlete.status='active'` único por atleta a nivel de regla de negocio).
- [x] Al terminar la relación: pasa a `inactive`; el coach pierde acceso a los datos de ese atleta; el atleta conserva acceso total a su historial. A nivel de compañía el dato no se borra (sujeto a consentimiento).
- [x] Roles excluyentes: un usuario es coach o atleta, nunca ambos con la misma cuenta.
- [x] Alta de atletas solo por invitación del coach (no hay auto-registro eligiendo rol atleta sin invitación).

## C. Alcance funcional del MVP

- [x] Plantillas de ciclo: sí, desde el MVP (`TrainingCycle.isTemplate` / `templateId`).
- [x] Catálogo de ejercicios: global (seed, `createdBy=null`) + ejercicios propios por coach (`createdBy=coachId`).
- [x] Gráficas/métricas de progreso: fuera del MVP, se agregan en Fase 3 una vez haya datos reales acumulados.
- [x] Comentarios de coach sobre una sesión/registro: fuera del MVP (documentado como no-objetivo junto con el chat en tiempo real; se reevalúa en Fase 3).

## D. Autenticación y cuentas

- [x] Registro manual + login posterior con Google del mismo email: se vinculan automáticamente a la misma cuenta.
- [x] Verificación de email obligatoria antes de poder iniciar sesión (login manual).
- [x] Sign in with Apple: postergado deliberadamente, fuera del MVP.

## E. Integraciones externas

- [x] APIs de interés a futuro: email transaccional (MVP), wearables/fitness — Google Fit, Apple Health, Strava, **Garmin y Polar** —, pasarela de pagos. Ninguna de wearables/pagos entra al MVP; se documentan en el roadmap de [[VISION]] (Fase 2 de productos) y no se modela un "gancho genérico" hasta la primera integración real.
- [x] Storage de video/imagen: no priorizado por ahora (no se seleccionó); videos de ejercicios quedan como campo `videoUrl` simple (URL externa), sin subida propia de archivos en el MVP.

## F. No funcionales y cumplimiento

- [ ] 🟡 Requisitos de privacidad específicos por jurisdicción (GDPR u otra ley local) — pendiente, depende del mercado geográfico. Base mínima ya adoptada: consentimiento explícito (`dataConsentAt`).
- [x] Unidades de medida: configurables por usuario (`User.weightUnit`: kg/lb), almacenamiento interno siempre en kg.
- [x] Idioma: solo español en el MVP, sin capa de i18n todavía.
- [x] Postura de datos para analítica futura: diseñar ya pensando en ello (datos append-only, timestamps UTC, unidades normalizadas) sin construir todavía ninguna capa de analítica. Ver [[VISION]].
- [x] Consentimiento de datos: explícito, capturado en el registro del atleta (`dataConsentAt`, `dataConsentVersion`).

## G. Diseño e infraestructura

- [ ] 🟡 Identidad visual (nombre definitivo, logo, colores) — sin definir.
- [ ] 🟡 Presupuesto/restricción de costo mensual de infraestructura — sin definir.

---

Quedan abiertos solo los puntos 🟡 sin marcar (mercado, fecha de lanzamiento, cumplimiento normativo específico, identidad visual, presupuesto). Ninguno bloquea empezar a construir el MVP.
