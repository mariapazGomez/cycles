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

### Orden por defecto

Lo que el coach ve la primera vez, y a lo que vuelve **Restablecer disposición**:

| # | Gráfico | Tamaño | Por qué |
|---|---|---|---|
| 1 | **Peso planificado contra el cargado** | Completo (tarjeta oscura) | Es la pregunta que motivó este rediseño y el gráfico más rico: el coach decide con él cuánto subir o bajar. Va primero y a todo el ancho para que la tarjeta oscura abra la página, justo bajo las cifras. |
| 2 | Progreso del ciclo | Mitad | Cómo avanza la carga semana a semana. |
| 3 | Constancia | Mitad | Hechas, omitidas y pendientes, junto al progreso. |
| 4 | Esfuerzo de cada sesión | Mitad | |
| 5 | Cuánto costó cada ejercicio (RIR) | Mitad | Complementa el esfuerzo y el peso: queda junto al gráfico 4. |

Los cuatro de tamaño mitad forman una cuadrícula de 2 × 2 bajo el gráfico estrella. *(Decisión de diseño del 2026-11-05 a propuesta de Desarrollo general; antes el gráfico de peso iba al final.)*

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

## Validación visual y lenguaje de los gráficos

### Qué se validó y qué se corrigió

Revisión de los gráficos de la primera versión a 1280, 820 y 390 px:

| Hallazgo | Gravedad | Corrección |
|---|---|---|
| **En móvil el texto de los ejes y las cifras se dibujaba a ~6,6 px** (el gráfico se hacía en un lienzo de 520 px y se achicaba al ancho de la pantalla) | Alta | Cada gráfico se **dibuja al ancho real** del contenedor (330, 700 o 520 px según la pantalla) y **mantiene ≥ 11 px** de texto. Se midió: 10,9 px en móvil. |
| El texto «Pendientes» de la leyenda tenía el color del tramo gris (`#dfe2e7`), casi invisible | Media | **Texto siempre en tinta**; el color solo en la muestra (regla de la guía). |
| Etiquetas encimadas en el gráfico de RIR y de «Cargado» frente a «Plan» | Media | Etiqueta del valor real **debajo** de su perla cuando queda por debajo del plan; en pantallas angostas, el nombre del ejercicio va **sobre** su barra. |
| Gráficos correctos pero **planos y genéricos**, sin la identidad de la marca | Pedido de la usuaria | Lenguaje visual de abajo. |

### Lenguaje visual con personalidad de marca

La maqueta tiene el botón **Estilo de los gráficos** para comparar «Con personalidad» y «Actual (plano)». Todo sale de lo que ya es de Cycles (la cadena de proteína, el anillo del ciclo, Bricolage Grotesque), sin degradados ni brillos (reglas de la marca):

| Elemento | Antes | Ahora |
|---|---|---|
| **Marcador** | Punto plano | **Perla**: círculo con borde blanco de 2,5 px y un halo del mismo color al 16 %; la última, más grande (7 px). |
| **Rejilla** | Línea continua | **Puntos redondos** (`stroke-dasharray="0 7"` con extremos redondos): la cadena, en gris `#cfd5de`. |
| **Cifras** | Inter pequeña | **Bricolage Grotesque 700** (en la web; en la app, ver «Tipografía de las cifras en la app»), de 15 a 19 px, para el valor que importa (la última sesión, el total de la semana, el desvío de RIR). |
| **Constancia** | Columnas apiladas | **Una perla por sesión** (azul = hecha, naranja = omitida, aro gris = pendiente) y la fracción «3/3» sobre cada semana. Se cuenta con la vista, sin eje. |
| **Desvío de RIR** | Barras | **Paletas**: línea de 3 px con una perla al extremo y la cifra con signo. |
| **Columnas** | Barra plana | Barra con **perla hueca en la punta**; la semana en curso en azul claro con «en curso». |
| **Plan contra real** | Dos líneas | **Banda azul suave** entre ambas (la variación hecha visible), plan en **puntos** con perlas huecas y real continuo con perlas llenas; valor final grande. |
| **Gráfico estrella** | Tarjeta blanca | **Tarjeta oscura `#1f2228`** (como la tarjeta oscura de Inicio): lo real en `#3080fc`, lo planificado en gris claro. |
| **Lectura** | Solo el gráfico | Una **frase** bajo el gráfico estrella: «Cargó 2,5 kg menos que el plan en la última sesión.» |
| **Ciclo** | Número | **Anillo del ciclo** de seis tramos (hechas, en curso, pendientes) junto a «4 de 6». |

**Validación de color** (guía `dataviz`): `#3080fc` sobre la tarjeta oscura `#1f2228` cumple contraste de 3:1; azul y naranja `#e08a2e` pasan la separación para daltonismo (ΔE 31). El gris es contexto, no una serie. Se mantiene: un solo eje, marcas finas, etiquetas selectivas, nunca solo por color (perla llena, hueca, discontinuo y signo), y tabla de cada gráfico.

### Librerías de gráficos: qué se revisó y qué se recomienda

**Stack actual:** web con React 18 y Vite 5 (gráficos en SVG a mano en `components/charts.tsx`); app con React 19.2, React Native 0.87 y **solo `react-native-svg`** (sin Skia ni Reanimated). Datos de versiones y compatibilidad consultados en npm el 2026-11-04; la comparación general sale de guías públicas y se trata como orientativa.

| Opción | Sirve para | Compatibilidad con Cycles | Personalidad de marca | Veredicto |
|---|---|---|---|---|
| **d3-scale + d3-shape** (ISC, ~270 KB sin comprimir entre ambos, una fracción tras el empaquetado) | Escalas y trazados (líneas, áreas, arcos) sin dibujar nada | Funciona igual en web y en React Native; sin dependencias nativas | **Total**: tú dibujas cada marca (perlas, anillo, paletas) | **Recomendada como base** |
| **visx** 4.0 (Airbnb, MIT, React 18 y 19) | Primitivas React sobre D3: ejes, formas, tooltips, anotaciones | Web: sí (`@visx/shape` ≈ 227 KB, modular). Móvil: no (es solo web) | **Muy alta**: no impone estilo | **Recomendada para la web** si se quiere acelerar tooltips y ejes |
| **Recharts** 3.10 (MIT) | Gráficos listos con API declarativa | Web: sí (React 16 a 19) | Baja a media: tema tipo «Recharts»; las marcas propias (perlas, paletas) exigen componentes a medida | No: es lo que da el aspecto genérico |
| **Apache ECharts** 6.1 (Apache-2.0) | Muchos tipos y datos masivos | Web: sí, con carga por módulos (~200 KB según guías, sin verificar); paquete de 60 MB sin comprimir | Media: temas y series a medida, pero es otro motor visual (Canvas o SVG) | Excesivo para el volumen de Cycles |
| **Nivo** 0.99 (MIT) | Gráficos bonitos con temas | Web: sí, pero `@nivo/line` no se publica desde mayo de 2025 | Media | No (poco mantenimiento) |
| **Observable Plot** 0.6 (ISC) | Exploración rápida con marcas declarativas | Web | Alta con marcas propias; 1,7 MB sin comprimir | Opcional, no necesaria |
| **Victory Native** 43 (MIT, sobre Skia) | Gráficos nativos con gestos y animación | Móvil: requiere React ≥ 19 (OK) y RN ≥ 0.79 (OK), **más `@shopify/react-native-skia` 2.14 (10 MB), `react-native-reanimated` 4.7 (RN 0,86 a 0,88) y gesture-handler**: tres dependencias nativas nuevas | Alta | **No por ahora**: agrega módulos nativos y riesgo de compilación (Xcode Cloud) para gráficos pequeños |
| **react-native-gifted-charts** 1.4 (MIT, SVG) | Gráficos simples en móvil | Móvil: sí, sin módulos nuevos | Baja a media | No: vuelve a lo genérico |

**Recomendación**

1. **Web:** **`d3-scale` y `d3-shape` como motor de cálculo** y marcas SVG propias; **`@visx/*` solo** para tooltips, ejes y anotaciones si ahorra tiempo. Los gráficos de la maqueta ya están escritos así (SVG a mano), de modo que pasar a código es directo y **no hay una librería de gráficos «de fábrica» que desmontar**.
2. **App:** **la misma matemática (`d3-shape`, `d3-scale`) sobre `react-native-svg`**, que ya está instalado. Animar con el `Animated` de React Native o, más adelante, con Reanimated.
3. **No incorporar Skia ni Victory Native** salvo que se pidan gestos y animaciones pesadas; sería el momento de reevaluar.
4. **Para el constructor de gráficos propios:** el modelo de «definición de gráfico» se traduce a las mismas funciones (`columnas`, `línea`, `perlas`, `paletas`, `anillo`), así el coach nunca elige «colores» ni formas que rompan la marca.
5. **Antes de comprometer:** hacer un **spike de un día** que dibuje el gráfico estrella con `d3-shape` en la web y en la app, y medir el peso final y la fluidez en un iPhone.

La causa de que los gráficos anteriores se vieran planos **no era la falta de una librería**: era el diseño (marcas mínimas, sin identidad). Cambiar a Recharts o Nivo habría dado un aspecto distinto pero igual de genérico.

## Tipografía de las cifras en la app (decidido en CYC-246: fuente del sistema)

La maqueta y la web usan **Bricolage Grotesque** para las cifras. **La app móvil no la empaqueta**: usa la fuente del sistema en todas sus pantallas (hallazgo del spike CYC-244). Había dos caminos. **Decisión de la usuaria (2026-11-05): se mantiene la fuente del sistema en la app** (opción B); Bricolage queda solo en la web.

| | **A. Empaquetar Bricolage en la app** | **B. Mantener la fuente del sistema (decidida)** |
|---|---|---|
| Qué cambia | Se suma una fuente (basta un peso, el 700) y su configuración nativa; la hace App móvil. | Nada se instala. Lo ajusta el diseño (abajo). |
| Coherencia | Solo las cifras del Resumen quedarían en Bricolage, mientras el resto de la app (títulos, botones, tarjetas) sigue en la del sistema: **sería la única pantalla distinta**, salvo que se adopte la fuente en toda la app. | Todas las pantallas de la app se ven igual. |
| Personalidad | Máxima en las cifras. | Viene de **las perlas, el anillo y las tarjetas oscuras**, no de la tipografía. |
| Peso y riesgo | Algo más de build y una pasada nativa. | Ninguno. |

**La app usa (opción B, vigente):**

- **Cifras grandes** («4 de 6», «11 de 18», «60 → 70 kg»): **peso 800**, `letterSpacing −0,4`, **dígitos de ancho fijo** (`fontVariant: ['tabular-nums']`) para que las columnas no bailen entre sesiones. Mismos tamaños de hoy (24 px las cifras de las tarjetas; 22 px el título de cada ejercicio).
- **Títulos** de pestaña y de tarjeta: peso 800, igual que el resto de la app.
- **Etiquetas pequeñas** (11 a 12 px): peso 600, sin cambios.
- **Cifras sobre las líneas pequeñas** (el último valor): peso 800, 14 px.
- El resto del lenguaje (**perlas, anillo del ciclo, rejilla de puntos, tarjeta oscura**) no cambia: es geometría, no tipografía.

La maqueta de la app (pestaña **App del atleta**) ya está dibujada con la fuente del sistema para reflejar lo que hay hoy. La **web del coach** mantiene Bricolage, porque la web sí la tiene.

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

## Implementación fase 1 en la web (CYC-240)

**PR A, la pizarra en lectura** (la fase de «Organizar» es el PR B):

- `components/summary/SummaryBoard.tsx` reemplaza los dos gráficos de la ficha: cinco cifras, filtro de periodo (Ciclo actual por defecto, Últimas 4 semanas, Todo el historial) y los cinco gráficos del sistema en el orden guardado con `GET /coach/summary-layout` (si falla, el orden por defecto). Se carga con `lazy` al abrir el Resumen.
- Gráficos: peso planificado contra el cargado (el `StarChart` del spike, con fila de ejercicios y la línea de repeticiones al lado), Progreso del ciclo y Constancia (los de siempre, ahora dibujados al ancho real), Esfuerzo (línea con huecos) y Cuánto costó cada ejercicio (barras desde el cero, en HTML). Cada uno con «Ver como tabla».
- `lib/summaryBoard.ts`: la lógica pura (ciclos y sesiones por periodo, series, cifras, orden). «Todo el historial» junta como máximo los **últimos 5 ciclos**.
- Datos: `AthleteSummary` (26 semanas, filtradas en el cliente) y `/cycles/:id/progress` de los ciclos elegidos. Las fechas de las sesiones son aproximadas (inicio del ciclo + semanas); el progreso no trae la fecha real de cada sesión.
- Estados: cargando (esqueletos), error por gráfico con Reintentar, sin datos, poco historial, peso corporal y sin plan de peso.
- Texto de los gráficos de al menos 12 px a 390, 800 y 1280 px de ancho (medido en el navegador).
- El filtro de periodo no se guarda en el servidor.
- **Contrato API ↔ web:** los tipos de `GET /athletes/:id/summary`, `GET /cycles/:id/progress` y `GET/PUT /coach/summary-layout` viven en `packages/shared/src/types/summary.ts`; la API tipa lo que devuelve con ellos y la web los usa tal cual. `packages/shared/src/fixtures/resumen.ts` trae un ejemplo de cada respuesta, y la prueba e2e `contrato-resumen` comprueba que la respuesta real de la API tiene su misma forma (claves, listas y tipos). Las pruebas de la web usan esos ejemplos.

## Fuera de alcance

- Fuerza estimada (1RM) por ejercicio: se conserva la de la tabla actual; no entra en estos gráficos.
- Comparar entre atletas.
- Un resumen detallado en la app del atleta (por decisión, es solo del coach).

## Preguntas para la usuaria

0. **Pizarra:** ¿la disposición es del coach para todos sus atletas (recomendado) o se guarda por atleta? ¿La primera entrega incluye solo mover, redimensionar y ocultar, y el constructor queda para después?
- **Estilo de los gráficos:** ¿apruebas la dirección «con personalidad» (perlas, anillo, tarjeta oscura para el gráfico estrella) o prefieres una versión intermedia?
- **Librerías:** ¿vamos con D3 + SVG propio (y visx opcional en la web), y damos un día de prueba antes de construir?
1. ¿El **peso real de una sesión** es el **promedio de sus series** (el detalle por serie queda en el tooltip)? La alternativa es la serie más pesada.
2. ¿El gráfico de peso arranca con el ejercicio **que más se desvió** del plan, o con el primero de la lista?
3. En la app: ¿el mapa muscular y el apilado quedan **plegados** bajo «Qué músculos trabajas», o prefieres quitarlos?
4. ¿El filtro de periodo de la web ofrece Ciclo actual, Últimas 4 semanas y Todo el historial?
