---
type: research
parent: "[[investigacion-competitiva]]"
status: informative
tags: [brand, research, competitive-analysis, trainerplan]
created: 2026-10-22
---

> Documento informativo — no contiene decisiones tomadas. Complementa [[investigacion-competitiva]] con un competidor adyacente: TrainerPlan.

# Investigación competitiva — TrainerPlan

## Metodología y límites

- **TrainerPlan:** sitio oficial (`trainerplan.co`), página de precios, centro de ayuda, Capterra y un recorrido de onboarding como entrenador capturado a mano el 2026-10-22 (registro, 8 pasos del tour guiado y el dashboard de inicio). Lo demás es lo que la empresa dice de sí misma; que lo anuncie no prueba que funcione bien. No hay reseñas independientes ni datos de ingresos o usuarios activos.
- **Cycles:** lectura del repo (README, PRDs, manual del coach, onboarding, esquema Prisma y reglas de seguimiento) al 2026-10-20. Los documentos pueden ir atrasados respecto al código.
- No se probó la app de TrainerPlan más allá del onboarding. Quedan pendientes el registro del atleta, la conexión de relojes, el editor de entrenamientos y el asistente IA en uso.
- Los pasos del tour que no se capturaron (2, 7, 8 y 12 de 12) se omitieron a propósito por no alinearse con la línea de Cycles.

## Resumen

- **TrainerPlan** es una plataforma de coaching para **resistencia** (triatlón, ciclismo, running, natación), con fuerza como añadido. Está orientada al **negocio del entrenador** (cobros, clubes, marca propia, marketplace) y a la **conexión con relojes**.
- **Cycles** es una plataforma de **fuerza**: el coach planifica en un grid de ciclos, el atleta registra serie a serie con RIR, y el sistema cruza lo planificado con lo ejecutado para proponer ajustes de carga.
- Se parecen en el modelo coach → atleta, pero hoy no compiten de frente. Por funcionalidad, Cycles se acerca más a TrainHeroic.
- Contexto de mercado: el 22 de julio de 2026 Garmin compró TrainingPeaks y TrainHeroic. TrainerPlan lo usa como gancho de captación ("la alternativa independiente a TrainingPeaks").

## Ficha de TrainerPlan

| | |
|---|---|
| Origen | Madrid, desde 2017 (según Capterra) |
| Tracción declarada | "+2.000 coaches, clubes y federaciones" |
| Idiomas | Español, inglés, portugués y francés |
| Plataformas | Web, iOS y Android |
| Cliente que paga | Entrenador o club; el atleta con entrenador es gratis |

### Precios (según su página de precios, pueden cambiar)

**Entrenador** (15 días de prueba sin tarjeta)

| Plan | Atletas | Precio | Suma |
|---|---|---|---|
| Starter | 5 | $19/mes | Planes dinámicos, dashboards, sincronización con dispositivos |
| Basic | 20 | $36/mes | Optimización con IA |
| Elite | 100 | $49/mes | Cobros a clientes, logo y colores propios |
| Club | 200 (3 entrenadores) | 89 €/mes | Biblioteca compartida, roles, facturación del club |
| Club Pro | 500 (6 entrenadores) | 149 €/mes | Soporte prioritario, reporte mensual |

**Atleta:** gratis con entrenador (calendario, apps, sincronización, chat). Premium a 7 €/mes o 49 €/año, con o sin entrenador (IA, dashboards, récords, fuerza, clima, ciclo menstrual).

Hay inconsistencias menores: su blog cita 39 €/mes por 100 atletas y la página de precios dice $49/mes, y mezclan $ y €.

### Herramientas anunciadas

- **Planificación:** calendario con arrastrar y soltar, planes estáticos y dinámicos (un cambio se propaga a todos los atletas del plan), plan anual, plantillas, biblioteca de sesiones y archivos, eventos.
- **IA:** asistente en panel lateral, resumen semanal por atleta, generación de entrenamientos y de plan anual, detección automática de umbrales.
- **Análisis:** fitness/fatiga/forma, esfuerzo, tiempo en zonas, curvas de potencia, planificado vs. realizado.
- **Fuerza:** más de 7.500 ejercicios en video, series por peso, %1RM o RPE, registro serie a serie en el móvil.
- **Negocio:** cobros online y recurrentes, perfil público, marca propia, equipos con roles, marketplace de planes, directorio de coaches.
- **Otros:** calculadoras gratuitas, API y servidor MCP, TrainerPlan Virtual (entrenamiento en 3D, en beta).

### Compatibilidades

Garmin, Polar, Suunto, COROS, Wahoo, Apple Watch / Apple Health, Strava, Zwift y TrainingPeaks. Sincroniza entrenamientos en ambos sentidos, envía los planificados a relojes Garmin e importa sueño, HRV y frecuencia cardíaca en reposo desde Garmin, COROS, Suunto, Polar y Apple Health. Las listas varían entre el sitio, el blog y la ayuda, así que hay que verificar dentro de la app.

## Onboarding observado (rol entrenador)

1. **Registro:** una sola pregunta, "¿Cómo vas a usar TrainerPlan?", con dos tarjetas: *Soy entrenador* ("15 días gratis") y *Soy deportista* ("Gratis para siempre"). Resuelve rol y expectativa de pago a la vez.
2. **Tour de 12 tarjetas** sobre la barra superior: Deportistas, Grupos, Planes (estáticos y dinámicos), Eventos, Librería, Perfil, Soporte y Asistente IA. Cada tarjeta resalta su pestaña.
3. **Primer paso del tour:** invitar deportistas con un enlace único de registro, o crear la cuenta por ellos.
4. **Dashboard "Hoy" con datos de ejemplo:** una "Deportista demostración", un descanso y una competición marcados "[ejemplo]", y tarjetas laterales (se quedan sin plan, sin actividad, próximos eventos). Un banner fijo recuerda los 15 días de prueba.
5. **Asistente IA** como icono de primer nivel en la barra. Sus ejemplos de preguntas son de gestión ("¿Qué deportistas no tienen entrenamientos la próxima semana?"), y propone un entrenamiento que se previsualiza y se añade con un clic.

Observaciones: el tour es largo para lo que enseña, las capturas internas son estáticas (una muestra un enlace de `staging.trainerplan.co`), la interfaz del tour mezcla español con capturas en inglés, y no se vio una primera acción guiada tipo "crea tu primer entrenamiento".

## Comparación con Cycles

| | TrainerPlan | Cycles |
|---|---|---|
| Deporte | Resistencia + fuerza | Fuerza (series, reps, peso, RIR) |
| Cliente que paga | Entrenador o club | Sin monetización aún (piloto) |
| Planificación | Calendario, planes estáticos y dinámicos, plan anual | Grid de semanas × sesiones, micro/meso/macrociclos, rutinas reutilizables |
| Ejercicios | Más de 7.500 en video | Catálogo propio (el seed tiene unas 56 entradas), video opcional |
| Registro del atleta | Fuerza serie a serie; resistencia desde el reloj | Serie a serie con RIR, descanso con cronómetro, cierre con sRPE, dolor y nota |
| Seguimiento del coach | Fitness/fatiga/forma, zonas, curvas | Carga semanal, adherencia, fuerza estimada, "Necesitan atención" |
| Ajuste de carga | Resumen semanal con IA | Reglas de alerta y propuesta de % de ajuste que el coach acepta o descarta, guardada para medir después |
| IA | Asistente, generación de entrenamientos y plan anual | No tiene |
| Dispositivos | Garmin, Polar, Suunto, COROS, Wahoo, Apple, Strava, Zwift | Ninguno (descartado por ahora) |
| Comunicación | Chat y comentarios por sesión | Fuera del MVP; solo la nota del atleta al cerrar la sesión |
| Cobros y negocio | Cobros, marca propia, marketplace | Fuera del MVP |
| Equipos y clubes | Roles, asistentes, grupos | Un coach por atleta; multi-tenant a futuro |
| Eventos | Sí | No |
| Apps | Web, iOS, Android | Coach en web; atleta en iOS; Android planificado |
| Idiomas | ES, EN, PT, FR | Solo español |
| Registro | Abierto, con elección de rol | Cerrado en el piloto (código de acceso); el atleta solo entra por invitación |
| Guía inicial | Tour de 12 tarjetas y cuenta demo | Manual del coach aparte; no se documenta un tour |

Los documentos de Cycles no coinciden en un punto: `docs/ONBOARDING.md` describe registro abierto y `docs/MANUAL-COACH.md` lo describe cerrado. Por el commit del código de acceso del piloto, parece que el manual es el vigente.

## Lectura

**Dónde Cycles está por delante**
- El ciclo planificar → ejecutar → ajustar para fuerza: RIR objetivo, registro por serie y propuestas de ajuste de carga.
- Seguimiento del dolor con ubicación y alertas para el coach.
- Integridad de datos pensada para analítica: registros solo de agregar, UTC y consentimiento versionado.

**Dónde está por detrás**
- Sin dispositivos ni datos fisiológicos, de los que depende la visión de empresa de datos.
- Sin herramientas de negocio para el coach (cobros, marca, equipos, marketplace).
- Sin IA, sin Android y un solo idioma.
- Sin tests automáticos, CI ni ESLint en web y api (ver `docs/DEUDA-TECNICA.md`).

**Implicaciones**
1. No es la misma pelea: TrainerPlan ataca a TrainingPeaks en resistencia; por funcionalidad, Cycles se acerca más a TrainHeroic.
2. La fuerza en TrainerPlan es un módulo añadido. Hay espacio para profundidad en fuerza (RIR, ajuste de carga, dolor).
3. Para un asistente IA futuro, las reglas de "Necesitan atención" y los ajustes de carga guardados son una buena base: la IA podría explicar y priorizar esas alertas antes de generar entrenamientos.
4. Del onboarding de TrainerPlan vale la pena revisar el estado inicial con datos de ejemplo marcados y la primera acción que lleva al valor (invitar al primer atleta).

## Pendiente

- Registro y vista del atleta.
- Conexión de relojes y sincronización.
- Editor de entrenamientos y constructor de planes.
- Asistente IA en uso: calidad real de lo que genera.
- Cuando existan, agregar las capturas a esta carpeta.

## Fuentes

- [Sitio de TrainerPlan](https://trainerplan.co/en/), [precios](https://trainerplan.co/en/pricing/), [alternativa a TrainingPeaks](https://trainerplan.co/blog/en/alternative-to-trainingpeaks/), [centro de ayuda](https://help.trainerplan.co/en/athletes), [integraciones](https://trainerplan.co/blog/en/integration-with-strava-gamin-polar-suunto-and-measures/)
- [Capterra](https://www.capterra.com/p/172723/TrainerPlan/pricing)
- [Comunicado de Garmin sobre TrainingPeaks y TrainHeroic](https://www.garmin.com/en-US/newsroom/press-release/corporate/garmin-acquires-trainingpeaks-and-trainheroic-leading-endurance-and-strength-training-platforms-for-athletes-and-coaches/)
