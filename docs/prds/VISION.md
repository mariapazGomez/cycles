---
type: vision
tags: [vision, company]
created: 2026-09-16
updated: 2026-09-16
---

# Visión de Compañía

> Nivel más alto del vault. Todo PRD general de producto (como [[PRD-General]]) enlaza hacia aquí. Si en el futuro existen más productos además de Cycles, cada uno tendrá su propio PRD general enlazado a esta misma visión.

## 1. Tesis

Construir una empresa que entienda el rendimiento deportivo a través de la correlación de datos deportivos y de salud de atletas, para generar insights que ningún dato aislado (ni de un solo atleta, ni de un solo tipo de dato) podría dar por sí solo.

## 2. Por qué Cycles es el punto de partida

Antes de correlacionar nada hace falta un dataset propio de calidad. [[PRD-General|Cycles]] es la primera herramienta: captura, de forma estructurada, tanto lo que un coach *planifica* como lo que un atleta *realmente ejecuta*. Ese es el primer activo de datos de la compañía, construido como subproducto natural de resolver un problema real (la planificación de entrenamiento) — no como un instrumento de recolección de datos disfrazado de app.

## 3. Principios de diseño de datos (aplican desde ya, aunque todavía no exista un "producto de analítica")

- **No destructivo:** los registros crudos de ejecución (`ExerciseLog`) nunca se sobreescriben ni se resumen sin conservar el detalle original.
- **Consistencia:** timestamps siempre en UTC, unidades normalizadas internamente (siempre kg, aunque el usuario configure ver kg o lb).
- **Consentimiento como base legal/ética:** ningún dato de un atleta se usa para analítica agregada o cruzada entre atletas sin su consentimiento explícito y trazable (ver `dataConsentAt` en el modelo de `User`).
- **No sobre-diseñar por anticipado:** integraciones futuras (wearables, motor de correlación) se construyen cuando exista un caso de uso real y datos reales que las validen, no como abstracciones genéricas especulativas hoy.
- **Separación de acceso vs. propiedad del dato:** que un coach pierda acceso a un atleta (fin de la relación) no significa que el dato se borre — la compañía conserva el histórico (sujeto a consentimiento) como activo de datos; lo que cambia es solo la visibilidad a nivel de producto.

## 4. Roadmap de productos (alto nivel, no compromete fechas)

1. **Cycles** (actual) — planificación y ejecución de ciclos de entrenamiento coach–atleta. Genera el primer dataset propio de calidad.
2. **Integraciones de salud/rendimiento** (futuro) — Garmin, Polar, Google Fit, Strava: conectan datos fisiológicos (frecuencia cardíaca, sueño, recuperación) con la ejecución ya registrada en Cycles.
3. **Motor de correlación/analítica** (futuro) — a partir de datos propios + integrados, generar insights de rendimiento por atleta y, eventualmente, patrones agregados entre atletas (siempre sujeto a consentimiento).
4. **Monetización** (futuro) — Cycles como SaaS (coach/atleta) es la vía de entrada; el motor de analítica es la ventaja diferencial de largo plazo.

## 5. Productos de la compañía

| Producto | Rol | PRD |
|---|---|---|
| Cycles | Herramienta de planificación y captura de datos coach–atleta (punto de partida) | [[PRD-General]] |

## 6. Marca

- **Compañía:** InProgress Co. — "Sports Data & Technology". Concepto: *Progress is a process.*
- **Producto:** Cycles — "Athlete Performance Platform". Concepto: *Every cycle builds the next* / *Performance is a cycle.*
- Desarrollo completo de estrategia de marca, arquitectura (Cycles Coach/Athlete/Teams/Analytics/Reports/AI), personalidad, territorio visual, taglines y análisis de YC Requests for Startups 2026 en [[brand]].

> ⚠️ **"Cycles" e "InProgress Co." son nombres candidatos, no confirmados.** [[brand]] señala explícitamente (sección 27) que falta una búsqueda profesional de marca registrada (Chile, EE. UU., UE, App Store, Google Play, dominios) antes de invertir en identidad visual o cerrar el naming. Hasta que se resuelva, el código y la documentación técnica pueden seguir usando "Cycles" como nombre de trabajo sin que eso implique que el naming esté cerrado.
