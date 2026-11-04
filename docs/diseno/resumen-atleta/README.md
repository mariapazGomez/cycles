---
type: design
parent: "[[PRD-EjecucionYSeguimiento]]"
status: proposed
tags: [diseno, resumen, graficos, web, mobile]
created: 2026-11-04
updated: 2026-11-04
---

# Resumen del atleta: progreso, constancia, esfuerzo y peso planificado contra el real (CYC-236)

> **Actualización 2026-11-04:** la ficha del coach funciona como una **pizarra de gráficos** (el coach los mueve, los redimensiona y los oculta) y queda preparada para que en el futuro **cree sus propios gráficos** con los datos disponibles. Dos lecturas del mismo dato. **La ficha del coach en la web** lleva el detalle, más cercano a las ciencias del deporte. **La app del atleta** se simplifica a una sola pregunta: cómo han cambiado el peso y las repeticiones de los ejercicios que repite. Absorbe a CYC-119 («Resumen móvil final»). **Contrastado con `origin/main` a61e89f.** Estado: propuesto, pendiente de aprobación de la usuaria. Maqueta interactiva en [`propuestas.html`](propuestas.html).

## Decisiones de la usuaria (2026-11-04)

1. **Alcance:** el detalle va **solo en la ficha del coach (web)**. En la **app del atleta** se resume cómo han variado los **pesos y las repeticiones** de los ejercicios que **se repiten más de una vez**.
2. **Gráficos del detalle:** progreso del ciclo, constancia, esfuerzo y RIR, y peso planificado contra el real.
3. **Peso planificado contra el real:** un **gráfico de líneas con las sesiones**: lo planificado contra lo que cargó el atleta.

## Verificado contra origin/main a61e89f

| Archivo | Qué hay hoy y cómo lo usa el diseño |
|---|---|
| `apps/api/prisma/schema.prisma` | `SessionExercise`: `targetReps`, **`targetWeight`**, `targetRir`. `ExerciseLog`: `actualReps`, **`actualWeight`** (null = peso corporal), `rir` y `loggedAt`, una fila por serie. `SessionFeedback`: **`srpe`** (esfuerzo 0 a 10), `durationMinutes`, `pain`, `outcome`. **Todo lo necesario ya existe.** |
| `apps/web/src/services/trackingApi.ts` | `AthleteSummary` (`weeks`: asignadas, hechas, omitidas y carga; `exercises`: fuerza estimada, desvío de RIR). **`CycleProgress` (`/cycles/:id/progress`)** ya entrega, por sesión y ejercicio, el objetivo (`sets`, `reps`, `weight`, `rir`) contra las series reales y el cierre con `srpe`. |
| `apps/web/src/pages/AthleteSummaryView.tsx`, `components/charts.tsx` | Hoy: carga semanal, adherencia (hechas, omitidas, pendientes) y tabla de ejercicios con la insignia «Más duro / Más fácil / En objetivo». SVG a mano, marcas finas. |
| `apps/mobile/src/screens/SummaryScreen.tsx` | Hoy: «En qué grupos entrenas» (`MuscleStackChart`, **el gráfico sobredimensionado**), «Mapa muscular» y «Foco del ciclo». Solo habla de series y kilos por grupo muscular. |
| Datos que faltan | Para la **app**: no hay un servicio del atleta con el historial por ejercicio (peso y repeticiones sesión a sesión). Ver «Para desarrollo». |

## Ficha del coach (web)

Vista **Resumen** de la ficha, con el mismo selector Ciclo / Resumen de hoy.

**Filtro de periodo** (una sola fila sobre los gráficos): **Ciclo actual** (por defecto) · Últimas 4 semanas · Todo el historial.

**Cifras arriba** (5 tarjetas, sin gráfico): Semana del ciclo («4 de 6»), Sesiones hechas («11 de 18»), Constancia («100 %, 11 de 11 pasadas»), Esfuerzo promedio («7,4 de 10») y **Peso real contra el plan** («+2 kg» en promedio de la última sesión de cada ejercicio).

**Cuatro gráficos** (cada uno con su botón **Ver como tabla**):

| Gráfico | Pregunta que responde | Forma | Detalles |
|---|---|---|---|
| **Progreso del ciclo** | ¿Cuánto entrena semana a semana? | Columnas por semana (carga en kg) | Un solo tono `#3080fc`; la semana en curso en `#9fc3fd` con «en curso»; las futuras, solo una raya gris. Cifra sobre cada columna. |
| **Constancia** | ¿Cumple lo planificado? | Columnas apiladas por semana | **Hechas** `#3080fc`, **Omitidas** `#e08a2e`, **Pendientes** gris; separación de 2 px; el número dentro de cada tramo; leyenda de texto. |
| **Esfuerzo de cada sesión** | ¿Cómo le pesan las sesiones? | Línea de una serie, 0 a 10 | Un punto por sesión; **las omitidas y las pendientes dejan un hueco** (la línea no se une). |
| **Cuánto costó cada ejercicio** | ¿Qué ejercicios le salen más duros o más fáciles de lo previsto? | Barras divergentes centradas en 0 | **Desvío de RIR** = RIR planificado − RIR reportado (positivo = más duro, como la insignia de hoy). Naranja si es ≥ +1, azul si es ≤ −1, gris en el medio; cifra con signo y «Más fácil ← → Más duro». |

**Peso planificado contra el cargado** (gráfico ancho, el que pidió la usuaria):

- Una **fila de botones de ejercicio** (una opción a la vez). Por defecto, el que más se desvió.
- **Línea de pesos (kg)**: **Planificado** gris discontinuo con marcadores huecos y **Cargado por el atleta** azul continuo con marcadores llenos. Cada punto es **una sesión** en que se hizo ese ejercicio (eje X: sesiones en orden, «Sem 1, Sem 2…» y la fecha en el tooltip).
- Al lado, una **segunda línea de repeticiones** planificadas contra reales, **con su propio eje** (nunca dos ejes en un gráfico).
- Una etiqueta «**Última sesión: −2,5 kg**» (naranja suave si quedó por debajo del plan, azul suave si por encima, gris si igual).
- **Tooltip por sesión**: peso y repeticiones planificados, y **cada serie** real («Serie 1: 70 kg × 6 · RIR —»).

**Lectura de «real»:** el peso de una sesión es el **promedio de sus series** de ese ejercicio (el detalle por serie sale en el tooltip). La diferencia es **real − plan**.

### Estados (coach)

| Estado | Qué se ve |
|---|---|
| Normal | Todo lo anterior. |
| Poco historial (1 sesión de un ejercicio) | Ese ejercicio se muestra con un solo punto y el texto «Con una segunda sesión verás la tendencia». |
| Ejercicio de peso corporal | No hay peso planificado: el gráfico de pesos dice «Sin peso planificado. Mira las repeticiones.» y queda la línea de repeticiones. |
| Ejercicio sin peso planificado | Solo la línea **Cargado** y la etiqueta «Sin plan de peso». |
| Sesión omitida | Hueco en la línea y en el esfuerzo; cuenta como «Omitida» en Constancia. |
| Cargando | Esqueletos de las cinco tarjetas y de los cuatro gráficos. |
| Sin datos | «Aún no hay registros que resumir» con una frase de qué verá cuando el atleta complete su primera sesión. |
| Error | El aviso rojo de siempre con **Reintentar**; cada gráfico falla por separado. |

### Anchos

- **Escritorio (≥ 1100 px):** cifras en una fila de 5; los cuatro gráficos en **cuadrícula de 2 × 2** y el de peso, **ancho completo**, con pesos y repeticiones lado a lado.
- **Tablet y móvil web:** una columna; cifras en dos por fila; pesos y repeticiones apilados.

## La ficha del coach como pizarra de gráficos

La disposición de los gráficos es del coach. Funciona con el mismo lenguaje de la **pizarra de ciclos** (autoguardado, «Guardado» y «Deshacer»).

### Modo «Organizar»

- Un botón **Organizar** junto al filtro de periodo abre el modo de edición; **Listo** lo cierra. Fuera de ese modo, los gráficos se leen normalmente y no se arrastran por accidente.
- En el modo de edición cada gráfico muestra una **miniatura** (con borde discontinuo, sin interacciones) y una barra con:
  - **Asa de arrastre (⠿)**: se arrastra la tarjeta a otra posición; el destino se marca con un borde azul.
  - **↑ Antes / ↓ Después**: la misma acción **con botones**, para teclado, lector de pantalla y celular.
  - **Mitad / Completo**: ocupa media fila o la fila entera.
  - **Quitar**: lo oculta (no lo borra); pasa a la bandeja «Gráficos ocultos».
- **Bandeja «Gráficos ocultos»:** los gráficos quitados vuelven con un toque. Junto a ella, **+ Agregar gráfico**.
- **Restablecer disposición:** vuelve al orden original.
- **Cada cambio se guarda solo** («✓ Guardado») y muestra un aviso con **Deshacer** durante 7 segundos (por ejemplo «Moviste «Constancia» una posición antes.»).
- Las cinco cifras de arriba y el filtro de periodo **no se mueven** (son el encabezado de la pizarra).
- **Alcance de la disposición:** es **del coach** y vale para **todos sus atletas** (no se reorganiza atleta por atleta). Se guarda en el servidor para que la vea igual desde cualquier equipo.
- **Teclado y lector de pantalla:** el asa y los botones tienen nombre («Mover «Constancia»»); cada cambio se anuncia en una región `aria-live` («Moviste «Constancia» a la posición 1 de 5»). Esc cierra el modo.
- **Tablet y móvil web:** una columna, sin arrastre: **↑ Antes / ↓ Después** y **Quitar**. El tamaño «Mitad / Completo» no aplica.

### Cada gráfico es una definición

Para que la pizarra acepte gráficos propios sin rediseñarse, cada tarjeta es una **definición**, no un componente fijo:

| Campo | Qué guarda |
|---|---|
| `id`, `titulo` | Identificador y nombre que ve el coach. |
| `medida` | Qué se mide: carga (kg), series, esfuerzo (0 a 10), duración (min), sesiones por estado, peso planificado y cargado… |
| `agrupar` | Por semana o por sesión (más adelante, por ejercicio o por grupo muscular). |
| `forma` | Columnas, línea, columnas apiladas o dos líneas (plan y real). |
| `filtros` | Ejercicio, periodo, estado de sesión. |
| `tamano`, `posicion` | Mitad o completo, y el orden en la pizarra. |
| `origen` | `sistema` (los cinco de siempre, que se pueden ocultar pero no editar) o `coach`. |

Los cinco gráficos de hoy son definiciones del sistema. La disposición guardada es la lista ordenada de esas definiciones.

### Agregar gráfico: galería y constructor

**Agregar gráfico** abre un cajón a la derecha con dos pestañas:

1. **Galería:** los gráficos del sistema y los ya creados. Muestra «En la pizarra» o **Agregar**.
2. **Crear gráfico** (en la maqueta ya funciona; es el diseño de la **fase siguiente**): un constructor guiado de tres pasos con **vista previa en vivo**:
   - **¿Qué quieres medir?** (una medida, con su unidad).
   - **¿Cómo lo agrupas?** Solo se habilitan las agrupaciones que esa medida admite («Duración de la sesión solo se puede agrupar por sesión»).
   - **Forma:** se sugiere la mejor y solo se habilitan las que los datos permiten; las demás quedan deshabilitadas.
   - Nombre (con uno sugerido) y **Agregar a la pizarra**.

**Reglas para que «si los datos lo permiten» sea real:**

- **Una medida por gráfico.** Kilos, repeticiones y esfuerzo tienen unidades distintas y **no comparten eje** (nunca dos ejes en un gráfico). Para cruzarlas se agrega otro gráfico al lado.
- La **forma depende de la medida y de la agrupación**: tendencia por sesión o semana = línea; magnitud por semana = columnas; partes de un total = columnas apiladas; plan contra real = dos líneas.
- **Sin datos suficientes** (una sola sesión, ejercicio sin peso planificado): el gráfico se agrega igual y muestra su estado vacío explicativo, no desaparece.
- **Colores por función**, no a elección: lo real es el azul de marca, lo planificado es gris discontinuo, el naranja solo para omitidas. El coach no elige colores, así que no se rompe la validación de color.
- **Catálogo de datos** (lo que la API ya permite hoy): carga (kg), series, repeticiones planificadas y reales, peso planificado y cargado, RIR planificado y reportado, esfuerzo de la sesión (0 a 10), duración (min), estado de la sesión y dolor reportado; agrupables por semana, sesión, ejercicio y grupo muscular. Ampliar el catálogo es agregar un campo, no rediseñar.

## App del atleta

Pantalla **Resumen** (pestaña de la isla), sin etiquetas grises bajo los títulos.

1. **Dos cifras:** «Semana 4 de 6» y «Sesiones 11 de 18».
2. **«Cómo van tus ejercicios»**: una tarjeta por **ejercicio que se repitió** (al menos 2 sesiones registradas), con:
   - **Peso:** «60 → 70 kg» y una **línea pequeña** con un punto por sesión (el último, lleno), más «▲ +10 kg».
   - **Repeticiones:** «6 → 5» con su línea y «▼ −1».
   - Sin juicio de valor: **no hay verde ni rojo**. La flecha y el signo dicen la dirección; el color es azul para el peso y tinta oscura para las repeticiones.
   - Orden: **primero los que más cambiaron**. Tocar una tarjeta abre el detalle (la línea grande con cada sesión y su fecha).
3. **«Qué músculos trabajas»** (plegado): aquí van el **mapa muscular** y el apilado por grupo, en tamaño compacto (el apilado baja de alto y ya no domina la pantalla). Se abre con un toque.

| Estado | Qué se ve |
|---|---|
| Sin ejercicios repetidos aún | «Cuando repitas un ejercicio, lo verás aquí» / «Verás cómo cambian tu peso y tus repeticiones de una sesión a otra.» |
| Sin registros | «Aquí verás tu avance» / «Se llena con tus primeras sesiones.» (el texto actual) |
| Peso corporal | Solo la parte de repeticiones, con «Peso corporal» en lugar del peso. |
| Cargando | Tres tarjetas de esqueleto. |

## Criterios de gráficos (guía `dataviz`)

- **Formas:** magnitud por semana = columnas de un solo tono; tendencia por sesión = líneas; comparar dos cosas medidas en lo mismo (plan y real, en kg) = **dos líneas en un eje**; polaridad (más duro o más fácil) = **barras divergentes**; una cifra con su cambio = **tarjeta con línea mínima**.
- **Un solo eje.** Peso y repeticiones se miden en cosas distintas: **dos gráficos pequeños**, no dos ejes.
- **Color por función:** lo **real** es el azul de marca; lo **planificado** es gris (énfasis y contexto); el **naranja** se reserva a «omitida» y «más duro». No se usan 8 colores para series.
- **Validado** con el script de la guía: azul `#3080fc` y naranja `#e08a2e` pasan separación para daltonismo (ΔE 31 con protanopia, 27,6 con tritanopia) y piso de visión normal (35,4); el naranja queda bajo 3:1 de contraste con blanco, por eso **siempre lleva número y texto** y existe la **tabla** de cada gráfico.
- **Nunca solo por color:** plan = línea **discontinua con marcador hueco**; real = línea **continua con marcador lleno**; omitida = hueco; más duro = naranja **y** signo «+» **y** el texto del eje.
- **Marcas finas:** líneas de 2 px, marcadores de 8 px, rejilla casi invisible, columnas de 26 px con la punta redondeada de 4 px y separación de 2 px en las apiladas.
- **Etiquetas selectivas:** cifra sobre cada columna (solo hay 6), valor final al final de cada línea y **no** un número en cada punto; el resto sale en el tooltip.
- **Texto en tinta**, nunca del color de la serie.
- **Cada gráfico tiene tabla** («Ver como tabla») y `aria-label` con lo que dice.

## Accesibilidad

- Gráficos con `role="img"` y descripción; el detalle completo está en la **tabla equivalente** (botón siempre visible).
- Selector de ejercicio como grupo de botones con `aria-pressed`, usable con teclado.
- Tooltip al pasar el cursor **y** al enfocar un punto con teclado (las zonas de contacto son más grandes que el marcador).
- Contraste: tinta `#1f2228` sobre blanco; las etiquetas de las series van en tinta.
- En la app, destinos táctiles ≥ 44 px (tarjetas completas) y sin gestos obligatorios.
- Sin animación: las líneas aparecen completas.

## Qué se conserva, qué cambia

- **Se conserva:** carga semanal y adherencia de la web (ahora «Progreso del ciclo» y «Constancia»), la tabla de ejercicios con su insignia de esfuerzo, y el mapa muscular de la app (CYC-183).
- **Cambia en la web:** estructura en 4 gráficos más el de plan contra real, filtro de periodo y las 5 cifras.
- **Cambia en la app:** el protagonista pasa de «grupos musculares» a «cómo van tus ejercicios»; el apilado y el mapa se compactan y se pliegan.

## Para desarrollo

- **Web (coach):** se puede construir con lo que existe: `AthleteSummary` + `CycleProgress` (objetivo contra series reales, y `srpe`). Falta agrupar **por ejercicio a través de las sesiones** y calcular el promedio de las series; se puede hacer en el cliente o con un campo nuevo en el resumen. Reutilizar `components/charts.tsx` (columnas) y sumar una `LineChart` en SVG.
- **API (para la app):** un servicio del atleta con el historial por ejercicio, por ejemplo `GET /me/exercise-progress`: para cada ejercicio con ≥ 2 sesiones, una lista de sesiones con fecha, peso planificado, peso real promedio, repeticiones planificadas y reales. **Confirmar con Desarrollo general.**
- **App:** nueva sección «Cómo van tus ejercicios» (tarjetas con línea mínima, `react-native-svg` ya instalado), detalle por ejercicio y `SummaryScreen` con el apilado compacto y plegable.
- **Pizarra del coach (web):** guardar la disposición del coach, por ejemplo `GET/PUT /coach/summary-layout` con la lista ordenada de definiciones (`id`, `tamano`, `visible` y, para los propios, `medida`, `agrupar`, `forma`, `filtros`). La primera versión puede traer solo los cinco del sistema y la reordenación; el constructor entra después sin cambiar el modelo. Arrastrar con la API de arrastre del navegador y botones **↑ Antes / ↓ Después** para teclado; autoguardado y **Deshacer** como en la pizarra de ciclos (`SaveIndicator`, `UndoToast`).
- Definiciones para pruebas: peso real = promedio de las series de la sesión; diferencia = real − plan; desvío de RIR = RIR planificado − RIR reportado; constancia = hechas ÷ (hechas + omitidas) de las sesiones ya pasadas.

## Fuera de alcance

- Fuerza estimada (1RM) por ejercicio: se conserva la de la tabla actual; no entra en estos gráficos.
- Comparar entre atletas.
- Un resumen detallado en la app del atleta (por decisión, es solo del coach).

## Preguntas para la usuaria

0. **Pizarra:** ¿la disposición es del coach para todos sus atletas (recomendado) o se guarda por atleta? ¿La primera entrega incluye solo mover, redimensionar y ocultar, y el constructor queda para después?
1. ¿El **peso real de una sesión** es el **promedio de sus series** (el detalle por serie queda en el tooltip)? La alternativa es la serie más pesada.
2. ¿El gráfico de peso arranca con el ejercicio **que más se desvió** del plan, o con el primero de la lista?
3. En la app: ¿el mapa muscular y el apilado quedan **plegados** bajo «Qué músculos trabajas», o prefieres quitarlos?
4. ¿El filtro de periodo de la web ofrece Ciclo actual, Últimas 4 semanas y Todo el historial?
