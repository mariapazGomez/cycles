---
type: design
parent: "[[PRD-Onboarding]]"
status: proposed
tags: [diseno, onboarding, web, mobile]
created: 2026-11-03
updated: 2026-11-03
---

# Guía de primer uso, v3: encima de la interfaz real (CYC-213)

> **Versión 3.** La v2 (CYC-190, ya construida en la web por CYC-191) mostraba la guía como diálogo, tarjeta y barra propios: la usuaria la probó y le pareció una presentación. La v3 la reemplaza por **marcas sobre la interfaz real** (coach marks): la app se ve tal cual, la guía resalta el elemento real y un globo corto pide la acción. Contrastado con `origin/main` de25ad6 (incluye el nuevo Inicio, #162). Estado: propuesto, pendiente de aprobación de la usuaria. Bloquea CYC-214. Se ve en [`propuestas.html`](propuestas.html); la v2 queda en [`propuestas-v2.html`](propuestas-v2.html).

## Qué pidió la usuaria

> Quiero ver la interfaz tal cual está en su última versión y que se vaya guiando al usuario a cómo navegar por la web app para cumplir lo que necesita. No un tutorial que se vea como una presentación.

## Verificado contra origin/main de25ad6

| Tema | Archivo(s) | Qué hay hoy y cómo lo toma la v3 |
|---|---|---|
| Guía v2 en la web | `components/tour/` (`CoachTour`, `TourDialog`, `TourCard`, `TourStepBar`, `GuidePanel`), `lib/tour.ts`, `hooks/useTour.ts`, `services/tourApi.ts`, `styles/tour.css` | Diálogo de bienvenida, tarjeta en Inicio, barra de paso y panel propio. **Se reemplaza** la parte visual; `tourApi` y `tourStatus` **se conservan**. |
| Navegación del coach | `AppLayout.tsx` | Inicio, Atletas, Biblioteca, Ejercicios; avatar con menú. |
| Ejercicios | `ExercisesPage.tsx` | Botón **Nuevo ejercicio**, pestañas **Míos / Catálogo**, formulario en tarjeta. |
| Rutinas | `BibliotecaPage.tsx`, `RoutineEditorPage.tsx` | Botón **Crear** con menú (**Rutina**, Ciclo para un atleta, Ciclo para la Biblioteca); editor con nombre, buscador de ejercicios y **Crear rutina**. |
| Invitar | `AthletesPanel.tsx` | Con la lista vacía el formulario ya está abierto; con atletas, botón **Invitar atleta**. |
| Ciclo | `AthletePage.tsx`, `components/board/` | La ficha del atleta tiene el selector **Ciclo / Resumen**, el botón **Nuevo ciclo** (abre `NewCycleDialog`) y la pizarra con **«+»** en cada día (`DayCell`). |
| Inicio del coach | `AttentionPage.tsx`, `CoachHero.tsx`, `CoachWeekBoard.tsx` | Nuevo Inicio (#162): ancho de 1680 px, filas que crecen, chip **Necesitan atención** y radios 6/8/10. |
| Tour móvil | `apps/mobile/src/` | **Aún no hay código** del tour (CYC-192 sin rama). El veredicto de abajo llega a tiempo. |

## Qué se conserva y qué cambia respecto a la v2

| Tema | v2 | v3 |
|---|---|---|
| Forma | Diálogo de bienvenida + tarjeta «Empieza con Cycles» + barra de paso + panel | **Halo sobre el elemento real + globo corto**. Sin diálogos que tapen la pantalla ni tarjeta en Inicio. |
| Qué pide | Explica qué hacer | **Pide hacer** en la pantalla real y se completa cuando lo haces (o con «Siguiente»). |
| Pasos | 4 (rutina, invitar, esperar, ciclo) | **6 paradas**: ejercicio, rutina, invitar, espera, ciclo en la pizarra y seguimiento. Cada una con 1 a 4 marcas. |
| Pausa | Tarjeta «Esperando a…» en Inicio | **Chip flotante** discreto abajo a la izquierda; no ocupa Inicio. |
| Cierre | Diálogo «Tu atleta ya puede entrenar» | Globo anclado al avatar: «Listo. Reabre la guía en Cómo usar Cycles.» |
| «Cómo usar Cycles» | Panel propio con pasos | **Se conserva en el menú**; abre una lista corta con **Ir a este paso** (sin panel grande). |
| Progreso | Derivado de los datos | **Se conserva** y suma «ejercicios propios». |
| `tourStatus` | `pending / skipped / completed` | **Se conserva**, sin cambios de API. |
| Saltar y reabrir | Sí | **Se conserva** (Saltar paso, Salir de la guía, Cómo usar Cycles). |
| Estados vacíos con guía | Sí | **Se conserva** tal como en la v2 (abajo). |
| Franja de Inicio «Empieza invitando…» | La reemplazaba la tarjeta | **Vuelve a mostrarse siempre**: la guía ya no ocupa Inicio. |

## Anatomía de una marca

- **Halo:** anillo de 2 px en `#3080fc` con 4 px de separación y el mismo radio del elemento (6, 8 o 10), más un fondo suave `#3080fc` al 10 %. No bloquea clics: **el elemento sigue siendo clicable**.
- **Atenuar el resto:** por defecto **no se atenúa** (la app se ve y funciona tal cual). Solo cuando la marca está sobre un diálogo o menú abierto se atenúa el fondo al 12 % para separarlo.
- **Globo** (`#1f2228`, texto blanco, radio 10, máx. 280 px, flecha hacia el elemento):
  1. «Paso 2 de 6» (una línea pequeña).
  2. **Una instrucción de hasta 12 palabras.** Sin párrafos.
  3. Acciones: **Siguiente** (o **Saltar paso**) y enlace **Salir de la guía**.
- **Posición:** abajo del elemento si cabe; si no, arriba, a la derecha o a la izquierda. Nunca tapa el elemento ni el campo donde se escribe.
- **Completar:** el paso avanza solo cuando se detecta la acción (cambia la ruta, se abre el menú o el formulario, o aparece el dato). **Siguiente** y **Saltar paso** siempre están disponibles.
- **Sin movimiento:** sin pulsos ni animaciones; el halo y el globo aparecen de golpe. Si se añade una transición corta, se desactiva con «reducir movimiento».

## Recorrido de la coach (web)

Aparece a coaches con `tourStatus = pending` que llegan sin rutinas, atletas ni ciclos, o que ya la empezaron. El primer globo no es un diálogo: aparece anclado al menú.

**Bienvenida (globo anclado a Ejercicios)**
- «Te guío por Cycles en cinco pasos, sobre la app real.» · **Empezar** · **Ahora no**

| Parada | Marca | Elemento resaltado | Globo | Se completa cuando |
|---|---|---|---|---|
| **1 · Ejercicios** (opcional) | 1a | Ítem **Ejercicios** del menú | «Entra a Ejercicios.» | La ruta es `/ejercicios` |
| | 1b | Botón **Nuevo ejercicio** | «Toca Nuevo ejercicio. Si el catálogo te basta, salta este paso.» | Se abre el formulario |
| | 1c | Botón **Guardar** del formulario | «Escribe el nombre, elige el grupo y guarda.» | Existe ≥1 ejercicio propio |
| **2 · Rutina** | 2a | Ítem **Biblioteca** | «Ahora tu primera rutina. Entra a Biblioteca.» | La ruta es `/biblioteca` |
| | 2b | Botón **Crear**, luego ítem **Rutina** | «Toca Crear y elige Rutina.» | La ruta es `/routines/new` |
| | 2c | Campo **Nombre** y buscador de ejercicios | «Ponle nombre y agrega 2 o 3 ejercicios.» | Hay nombre y ≥1 ejercicio |
| | 2d | Botón **Crear rutina** | «Cuando termines, toca Crear rutina.» | Existe ≥1 rutina |
| **3 · Invitar** | 3a | Ítem **Atletas** | «Invita a tu atleta. Entra a Atletas.» | La ruta es `/athletes` |
| | 3b | Formulario de invitación | «Escribe su nombre y el email con el que se registrará.» | Campos completos |
| | 3c | Botón **Enviar invitación** | «Toca Enviar invitación.» | Existe ≥1 invitación |
| **4 · Espera** | — | Sin marca: solo el **chip** | «Esperando a {Nombre}. Te avisamos aquí.» | Un atleta acepta |
| **5 · Ciclo** | 5a | Fila del atleta en **Atletas** | «Abre a {Nombre} para crearle un ciclo.» | La ruta es `/athletes/:id` |
| | 5b | Botón **Nuevo ciclo** | «Toca Nuevo ciclo.» | Se abre el diálogo |
| | 5c | Botón **Crear** del diálogo | «Elige nombre, inicio y semanas, y crea el ciclo.» | Existe el ciclo |
| | 5d | **«+»** del primer día libre de la semana en curso | «Toca «+» en un día y elige una rutina.» | El ciclo tiene ≥1 sesión (queda activo) |
| **6 · Seguimiento** | 6a | Ítem **Inicio** y chip **Necesitan atención** | «En Inicio ves quién necesita tu atención.» | La ruta es `/` |
| | 6b | Selector **Resumen** de la ficha del atleta | «En Resumen ves su carga y adherencia.» | Cambia a Resumen o **Siguiente** |
| **Cierre** | — | Avatar | «Listo. Reabre la guía en Cómo usar Cycles.» | **Entendido** → `tourStatus = completed` |

Reglas de orden: se ofrece primero la parada pendiente según los datos; la 1 solo si la coach no tiene rutinas ni ejercicios propios. Las paradas 5 y 6 esperan a que haya una atleta activa (parada 4).

### La espera (parada 4) y el chip

El **chip** es una pastilla pequeña fija abajo a la izquierda (radio 8): «Guía · Paso 4 de 6 · Esperando a Camila» y el botón **Seguir**. No tapa contenido (se mueve si hay un diálogo). Aparece:
- en la espera (parada 4);
- cuando la coach sale de la guía con **Esc** o navega por su cuenta (pasa a «Volver al paso 3»);
- cuando una atleta acepta: «Camila ya aceptó. Crea su ciclo.» (una sola vez).

### Cuando algo se sale del guion

| Situación | Qué hace la guía |
|---|---|
| El elemento no está a la vista | Desplaza la pantalla hasta mostrarlo (instantáneo con «reducir movimiento»). |
| Aún no existe (cargando) | Espera hasta 2 s; después muestra el globo **anclado abajo al centro** con la instrucción y el botón **Llévame**. |
| Cambia el tamaño de la ventana | Recalcula la posición del halo y del globo (observa tamaño y scroll). |
| Tablet (641–1279 px) | Mismo diseño; el globo mide hasta 260 px. |
| Móvil web (≤ 640 px) | El globo se ancla **abajo, a todo el ancho menos 16 px de margen**; el elemento se desplaza hacia el tercio superior para no quedar tapado. |
| La coach navega por su cuenta | La marca se oculta y aparece el chip «Volver al paso N». Si llega a la pantalla de otro paso, la guía salta a ese paso. |
| La coach hace la acción antes | El paso se marca como hecho y la guía avanza sin mostrarlo. |
| Hay un diálogo o menú abierto | La marca se acomoda dentro del diálogo; el fondo se atenúa al 12 %. |

## Recorrido del atleta

### Traspaso web → app (sin cambios respecto a la v2)

Pantalla «Tu cuenta está lista» tras aceptar la invitación: «Entrenas desde la app. Entra con {email}.», selector **iPhone / Android** (iPhone: TestFlight; Android: agregar a la pantalla de inicio) y **Seguir en el navegador**. Si la API expone `phonePlatform`, se muestra directo el bloque que corresponde.

### Atleta en la web

Usa el **mismo mecanismo**: tres marcas sobre el menú, en vez de la tarjeta de la v2.

| # | Elemento | Globo |
|---|---|---|
| 1 | Ítem **Hoy** | «Aquí está tu sesión de hoy.» |
| 2 | Ítem **Calendario** | «Aquí ves tu semana y tu ciclo.» |
| 3 | Ítem **Mis ciclos** | «Aquí están los ciclos que te asigna tu coach.» |

### Tour móvil (CYC-192): veredicto

**Hay ajustes**; ninguno es de fondo y CYC-192 no tiene código aún, así que conviene aplicarlos al construirlo. La v2 ya iba sobre la pantalla real (bien), pero **explicaba** en vez de **guiar para hacer** y atenuaba demasiado.

| # | Ajuste | Por qué |
|---|---|---|
| M1 | **La marca 1 resalta el botón real «Empezar sesión»** (halo sobre el botón de Inicio), con «Toca Empezar sesión cuando vayas a entrenar.» Sin coach o sin ciclo, el globo dice «Aquí aparecerá tu sesión de hoy.» y resalta la tarjeta vacía. | Es la acción que importa; la v2 solo la mencionaba desde la isla. |
| M2 | **Las marcas 2 y 3 piden tocar la pestaña**: «Toca Calendario.» y «Toca Resumen.» con halo sobre el ícono de la isla; avanzan cuando la pestaña cambia (o con **Siguiente**). | Guiar para hacer; la v2 avanzaba solo con «Siguiente». |
| M3 | **Atenuar al 12 %, no al 35 %, y sin cubrir la isla ni el botón resaltado.** | El criterio es oscurecer poco y que la app siga usable. |
| M4 | **Globo de la misma anatomía** que la web (paso, ≤ 12 palabras, Siguiente y Saltar, `#1f2228`, radio 10) y sin animaciones salvo respetar `useReduceMotion`. | Un solo lenguaje web y móvil. |
| M5 | Se conservan: tres paradas (Inicio, Calendario, Resumen), el Asistente **fuera**, la **pista de la primera serie**, el **cierre de la primera sesión**, **Cómo usar Cycles** en el avatar y `tourStatus` compartido. | Ya cumplían el criterio. |

Textos móviles finales: «Toca Empezar sesión cuando vayas a entrenar.» · «Toca Calendario.» · «Toca Resumen.» (con «Paso 1 de 3»).

## Estados vacíos (CYC-75 y CYC-76)

Sin cambios respecto a la v2: se conserva todo lo que ya existe y solo se diseña lo que falta (**Crear ciclo, sin atletas activos**; en el atleta: **Hoy con coach y sin ciclo**, **Hoy sin sesión pendiente** y **Mis ciclos** vacío). La v3 ya no reemplaza la franja «Empieza invitando a un atleta» de Inicio.

## Qué se guarda por cuenta

| Campo | Valores | Se escribe cuando |
|---|---|---|
| `tourStatus` | `pending` (por defecto) · `skipped` · `completed` | Salir de la guía, **Ahora no**, o terminar |

- Todo lo demás se deriva de los datos (ejercicios propios, rutinas, invitaciones, atletas activos, ciclos activos).
- La marca de «ya empezó» sigue en el navegador, como en la v2; no hay campo nuevo.
- Ningún dato de salud ni de rendimiento (R1–R12 de `docs/SEGURIDAD.md`).

## Accesibilidad

- **Teclado:** el halo no quita el foco del elemento: la coach actúa con su propio Tab. **Esc** pausa la guía (aparece el chip); **Alt + G** lleva el foco al globo; con el foco en el globo, **← / →** cambian de marca y **Enter** activa el botón enfocado.
- **Lector de pantalla:** el globo es una región `role="complementary"` con `aria-label="Guía de inicio"`; cada cambio de marca se anuncia en una región `aria-live="polite"` («Paso 2 de 6. Toca Crear y elige Rutina.»). El elemento resaltado recibe `aria-describedby` hacia el globo.
- **Orden de lectura:** el globo se inserta en el DOM justo **después** del elemento resaltado (o de su contenedor) para que el lector lo encuentre al lado; no se usa `aria-modal`.
- **Contraste:** globo `#1f2228` con texto blanco (15,9:1); botones **Siguiente** blancos sobre fondo oscuro; halo `#3080fc` solo como señal de estado, siempre acompañado de la instrucción en texto.
- **Estado no solo por color:** el avance se dice con «Paso N de 6» y el chip con texto; «Hecho» lleva ✓ y la palabra.
- **Movimiento reducido:** sin animaciones; el desplazamiento al elemento es instantáneo si el usuario lo pide.
- **Destinos táctiles:** botones del globo ≥ 40 px (≥ 44 px en móvil).
- **Foco al cerrar:** al salir, el foco vuelve al elemento que lo tenía.
- **A verificar con código:** orden de tabulación con el globo insertado, anuncio del cambio de marca y que el globo no quede detrás del teclado en móvil.

## Fuera de alcance

- Tutoriales en video, correos de bienvenida o recordatorio, y la pestaña Asistente en el tour móvil (es demo).
- Vista de seguimiento del equipo por coach (PRD §5.3).

## Preguntas para la usuaria

1. ¿Apruebas la guía como **marcas sobre la app real** (halo y globo corto), sin diálogos ni tarjeta en Inicio?
2. ¿La parada 1 (crear un ejercicio propio) queda **opcional** con «salta este paso»? Si prefieres que la guía empiece directo en la rutina, la quito.
3. ¿Atenuar el resto **no** por defecto (solo bajo diálogos), como se propone?
4. ¿Aplicamos los ajustes M1 a M4 al tour móvil antes de construirlo (CYC-192)?

## Cómo se conecta con otras tarjetas

- **CYC-214 (web):** reemplaza `TourDialog`, `TourCard`, `TourStepBar` y `GuidePanel` por una capa de marcas (resaltado + globo + chip), reutilizando `useTour`, `tourApi` y `lib/tour.ts` (añadir ejercicios propios a `TourCounts`). Necesita anclas estables en los elementos resaltados (por ejemplo `data-tour="nav-ejercicios"`).
- **CYC-192 (móvil):** aplicar M1 a M5.
- **CYC-170:** aporta el contenido del manual enlazado en «Cómo usar Cycles».
