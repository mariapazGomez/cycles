---
type: design
parent: "[[PRD-Onboarding]]"
status: implemented
tags: [diseno, onboarding, web, mobile]
created: 2026-11-03
updated: 2026-11-03
---

# Guía de primer uso, v3.1: encima de la interfaz real y en el orden de un ciclo (CYC-213)

> **Versión 3.1.** La v2 (CYC-190, ya construida en la web por CYC-191) mostraba la guía como diálogo, tarjeta y barra propios: pareció una presentación. La v3 la pasó a **marcas sobre la interfaz real** (halo + globo corto). Esta v3.1 corrige el **orden**: la v3 empezaba creando un ejercicio, que se usa dentro de una rutina, que se usa dentro de un ciclo que aún no existía. Ahora hay una **explicación breve de cómo se piensa un ciclo** y la guía se arma **de arriba hacia abajo**: ciclo → rutinas → ejercicios. Contrastado con `origin/main` de25ad6. **Estado: aprobado el 2026-11-03 y construido** (web de la coach: CYC-191 y CYC-214; app móvil: CYC-192; guía del atleta en la web: CYC-233, PR #188 mezclado el 2026-11-05). El PRD vigente es [`PRD-Onboarding`](../../onboarding/PRD-Onboarding.md) v1.1. Maqueta en [`propuestas.html`](propuestas.html); v2 en [`propuestas-v2.html`](propuestas-v2.html).

## Lo que pidió la usuaria

1. Antes del manual de uso, **una explicación breve de cómo se piensan los ciclos**: se crea un ciclo, el ciclo contiene rutinas y las rutinas contienen ejercicios.
2. Que la guía **siga ese orden de creación**. Pedir como primer paso «crea un ejercicio» no tiene sentido si el ejercicio se usa dentro de una rutina o de un ciclo que todavía no existe.

## Verificado contra origin/main de25ad6

| Tema | Archivo(s) | Qué hay hoy y cómo lo toma la guía |
|---|---|---|
| Guía v2 construida | `components/tour/*`, `lib/tour.ts`, `hooks/useTour.ts`, `services/tourApi.ts` | La parte visual se reemplaza; `tourApi` y `tourStatus` se conservan. |
| **El ciclo se arma desde la ficha del atleta** | `AthletePage.tsx`, `components/board/NewCycleDialog.tsx`, `CycleSection.tsx` | **Nuevo ciclo** pide un atleta que **ya aceptó** (el atleta queda fijado). Por eso invitar es el prerrequisito, no un paso de «contenido». |
| **Rutina nueva sin salir de la pizarra** | `components/board/RoutinePanel.tsx`, `RoutineDrawer.tsx` | El panel de rutinas de la pizarra tiene **Crear rutina nueva**, que abre un cajón («Crear rutina») sin salir del ciclo. |
| **Ejercicio nuevo desde la rutina** | `components/ExercisePicker.tsx` (atajo de CYC-56), `ExerciseForm.tsx` | El buscador de ejercicios ofrece **Crear «nombre»** y el botón «Crear y agregar a la rutina»: el ejercicio se crea **dentro** de la rutina. No hace falta pasar antes por Ejercicios. |
| Asignar rutina a un día | `board/DayCell.tsx`, `RoutinePicker.tsx` | El **«+»** de cada día abre un buscador de rutinas; elegir una crea la sesión y **activa el ciclo** con la primera. Con cero rutinas, el popover enlaza a `/routines/new` (hoy redirige a la Biblioteca con el cajón abierto; sale de la pizarra: ver «Ajustes pequeños»). |
| Navegación del coach | `AppLayout.tsx` | Inicio, Atletas, Biblioteca, Ejercicios. Ejercicios y Biblioteca quedan como lugares de consulta, no como pasos de la guía. |
| Inicio del coach | `AttentionPage.tsx`, `CoachWeekBoard.tsx` | Nuevo Inicio (#162). |
| Tour móvil | `apps/mobile/src/` | Aún sin código del tour (CYC-192). Veredicto sin cambios (abajo). |

**Consecuencia:** el orden «de arriba hacia abajo» **ya es posible en la app tal cual está**, sin construir nada nuevo en las pantallas.

## Explicación inicial: «Así se arma un ciclo»

Una sola tarjeta corta **antes** de la guía, que aparece la primera vez. Es la única pieza que ocupa pantalla: pequeña (máx. 440 px), sin velo, anclada abajo a la derecha, con la app visible detrás. Lleva un dibujo de **tres cajas encajadas** y tres líneas.

**Dibujo (cajas encajadas, solo texto y bordes):**
- Caja grande: **Ciclo** · «Fuerza base · 6 semanas».
- Dentro, dos cajas: **Rutina** «Torso A» y **Rutina** «Pierna».
- Dentro de cada rutina, fichas pequeñas: **Ejercicio** «Press banca», «Remo», «Sentadilla».

**Textos:**
- Título: «Así se arma un ciclo»
- «Un ciclo organiza las semanas de tu atleta.»
- «Contiene rutinas: la sesión de cada día.»
- «Cada rutina contiene ejercicios.»
- Cierre: «Lo armamos en ese orden.»
- Botones: **Empezar la guía** · **Ahora no**

Reglas: aparece una sola vez (antes del primer paso) y se puede releer desde **Cómo usar Cycles → Cómo se piensa un ciclo**. Sin animación. Es la excepción acordada a «sin ventanas»: es breve, no tapa el menú y se cierra con un toque.

## Qué se conserva y qué cambia

| Tema | v3 | v3.1 |
|---|---|---|
| Intro | Globo de bienvenida | **Tarjeta «Así se arma un ciclo»** con el dibujo y tres líneas. |
| Orden | Ejercicio → rutina → invitar → espera → ciclo → seguimiento | **Atleta → ciclo → rutina → ejercicios → ponerla en un día → seguimiento.** |
| Parada «Ejercicios» | Primer paso | **Desaparece como paso.** Los ejercicios se crean dentro de la rutina con **Crear «nombre»**. La pestaña Ejercicios queda para consulta. |
| Dónde se crea la rutina | Biblioteca → Crear → Rutina (sale del ciclo) | **Dentro de la pizarra**: **Crear rutina nueva** (cajón). |
| Pasos | 6 paradas | **6 pasos** con otro orden. |
| Forma, chip de espera, cierre, `tourStatus`, saltar y reabrir, estados vacíos, atleta web | — | **Sin cambios.** |

## Anatomía de una marca (sin cambios respecto a la v3)

- **Halo:** anillo de 2 px en `#3080fc`, separación de 4 px, mismo radio del elemento (6, 8 o 10) y fondo suave al 10 %. **No bloquea clics.**
- **Atenuar el resto:** no por defecto; solo bajo diálogos o cajones, al 12 %.
- **Globo** (`#1f2228`, texto blanco, radio 10, máx. 280 px, flecha al elemento): «Paso N de 6», **una instrucción de hasta 12 palabras**, **Siguiente** o **Saltar paso** y **Salir de la guía**.
- **Posición:** abajo del elemento si cabe; si no, arriba o a un lado (junto a un menú, a su izquierda). Nunca tapa el elemento.
- **Completar:** avanza al detectar la acción, o con **Siguiente** / **Saltar paso**.
- **Sin movimiento propio.**

## Recorrido de la coach (web)

Parte con `tourStatus = pending` en coaches sin atletas, ciclos ni rutinas (o que ya la empezaron). La tarjeta «Así se arma un ciclo» abre la guía.

| Paso | Qué se arma | Marca | Elemento resaltado | Globo | Se completa cuando |
|---|---|---|---|---|---|
| **1 · Tu atleta** | El prerrequisito: un ciclo se crea para alguien que ya aceptó | 1a | Ítem **Atletas** | «Primero, tu atleta. Entra a Atletas.» | Ruta `/athletes` |
| | | 1b | Formulario de invitación | «Escribe su nombre y el email con el que se registrará.» | Campos completos |
| | | 1c | **Enviar invitación** | «Toca Enviar invitación.» | Existe ≥1 invitación |
| **Espera** | — | — | Solo el **chip** | «Esperando a {Nombre}. Te avisamos aquí.» | Un atleta acepta |
| **2 · Ciclo** | La caja grande | 2a | Fila del atleta | «Abre a {Nombre} para crearle un ciclo.» | Ruta `/athletes/:id` |
| | | 2b | **Nuevo ciclo** | «Toca Nuevo ciclo.» | Se abre el diálogo |
| | | 2c | **Crear** del diálogo | «Ponle nombre, inicio y semanas.» | Existe el ciclo |
| **3 · Rutina** | Una caja dentro del ciclo | 3a | **«+»** de un día | «Toca «+» en un día.» | Se abre el selector |
| | | 3b | **Crear rutina nueva** (panel de rutinas) | «Crea la rutina de ese día.» | Se abre el cajón |
| | | 3c | Campo **Nombre** del cajón | «Ponle nombre. Por ejemplo, Torso A.» | Hay nombre |
| **4 · Ejercicios** | Las fichas dentro de la rutina | 4a | Buscador de ejercicios del cajón | «Busca y agrega 2 o 3 ejercicios.» | ≥1 ejercicio agregado |
| | | 4b | **Crear «nombre»** (si no aparece) | «¿Falta uno? Toca Crear «nombre».» | Opcional (se muestra cuando la búsqueda no encuentra) |
| | | 4c | **Crear rutina** del cajón | «Cuando termines, toca Crear rutina.» | Existe la rutina con ejercicios |
| **5 · Ponla en un día** | Cerrar el ciclo | 5a | **«+»** del día, y la rutina en el selector | «Elige la rutina para ese día.» | El ciclo tiene ≥1 sesión (**queda activo**) |
| **6 · Seguimiento** | Dónde mirar después | 6a | Ítem **Inicio** / chip **Necesitan atención** | «En Inicio ves quién necesita tu atención.» | Ruta `/` |
| | | 6b | Selector **Resumen** de la ficha | «En Resumen ves su carga y adherencia.» | Cambia a Resumen o **Siguiente** |
| **Cierre** | — | — | Avatar | «Listo. Reabre la guía en Cómo usar Cycles.» | **Entendido** → `tourStatus = completed` |

El globo de cada marca muestra además el **nivel** con una migaja corta («Ciclo», «Rutina», «Ejercicios») para que se vea el encaje de la explicación inicial.

### Cómo se deriva el avance (sin campos nuevos)

| Paso | Hecho si… |
|---|---|
| 1 | Existe ≥1 atleta invitado |
| 2 | La atleta activa tiene ≥1 ciclo |
| 3 | Existe ≥1 rutina |
| 4 | Existe ≥1 rutina con ejercicios |
| 5 | Hay ≥1 ciclo activo (primera sesión asignada) |
| 6 | **Entendido** en el cierre |

Si la coach ya tiene datos (por ejemplo, rutinas), la guía salta los pasos hechos. **Ejercicios propios** deja de contar.

### Espera y chip

La espera sigue igual: el **chip** («Guía · Paso 1 de 6 · Esperando a Camila» y **Seguir**) no ocupa Inicio. Mientras espera, la coach puede mirar la Biblioteca o Ejercicios sin que la guía interfiera. Al aceptar la atleta, el chip dice «Camila ya aceptó. Crea su ciclo.»

### Ajustes pequeños en pantallas existentes (para CYC-214)

- **Selector «+» sin rutinas:** hoy dice «Todavía no tienes rutinas. **Crea la primera**» y enlaza a `/routines/new` (sale de la pizarra). Debe **abrir el cajón «Crear rutina nueva»** para mantener la coach dentro del ciclo.
- **Anclas** `data-tour="…"` en los elementos resaltados.

### Cuando algo se sale del guion (sin cambios respecto a la v3)

Elemento fuera de vista (se desplaza), aún sin cargar (espera 2 s y globo anclado abajo con **Llévame**), cambio de tamaño (recalcula), tablet (globo de 260 px), móvil web (globo abajo a todo el ancho), navegación libre (chip «Volver al paso N» y salto al paso de la pantalla a la que llegue), acción hecha antes (avanza sin mostrar el paso) y diálogos o cajones abiertos (la marca se acomoda dentro y atenúa al 12 %).

## Recorrido del atleta

### Traspaso web → app (sin cambios)

«Tu cuenta está lista» tras aceptar la invitación: «Entrenas desde la app. Entra con {email}.», selector **iPhone / Android** y **Seguir en el navegador**.

### Atleta en la web (sin cambios)

Tres marcas sobre el menú: **Hoy**, **Calendario** y **Mis ciclos**, con el mismo mecanismo.

### Tour móvil (CYC-192): veredicto (sin cambios)

Hay ajustes M1 a M5 (halo sobre «Empezar sesión», marcas 2 y 3 que piden tocar la pestaña, atenuado al 12 % o nada, mismo globo que la web y conservar pista, cierre y «Cómo usar Cycles»). **No dependen del orden del ciclo**, porque el atleta no crea ciclos: solo los entrena.

## Estados vacíos (CYC-75 y CYC-76)

Sin cambios respecto a la v2: se conserva lo que ya existe y solo se diseña lo que falta. La guía no reemplaza la franja «Empieza invitando a un atleta» de Inicio.

## Qué se guarda por cuenta

| Campo | Valores | Se escribe cuando |
|---|---|---|
| `tourStatus` | `pending` · `skipped` · `completed` | Salir de la guía, **Ahora no**, o terminar |

- Todo lo demás se deriva de los datos (atletas, ciclos, rutinas y sus ejercicios).
- La marca «ya empezó» sigue en el navegador, como en la v2.
- La tarjeta «Así se arma un ciclo» se considera vista al pulsar **Empezar la guía** o **Ahora no**; reabrirla desde «Cómo usar Cycles» no cambia el estado.
- Ningún dato de salud ni de rendimiento (R1–R12 de `docs/SEGURIDAD.md`).

## Accesibilidad

- **Tarjeta inicial:** `role="dialog"` no modal con `aria-labelledby`; el dibujo lleva una lista equivalente en texto («Un ciclo contiene rutinas; cada rutina contiene ejercicios») y no depende del color. Foco en **Empezar la guía** al abrir; Esc equivale a **Ahora no**.
- **Teclado:** el halo no quita el foco; **Esc** pausa la guía; **Alt + G** lleva el foco al globo; **← / →** cambian de marca con el foco en el globo.
- **Lector de pantalla:** globo como región `role="complementary"` con `aria-label="Guía de inicio"` y anuncio en `aria-live="polite"` («Paso 3 de 6, Rutina. Toca «+» en un día.»). El elemento resaltado recibe `aria-describedby`.
- **Contraste:** globo `#1f2228` con texto blanco (15,9:1); halo `#3080fc` solo como señal, siempre con la instrucción escrita.
- **Movimiento reducido:** sin animaciones; desplazamiento instantáneo si se pide.
- **Destinos táctiles:** ≥ 40 px (≥ 44 px en móvil).
- **A verificar con código:** orden de tabulación con el globo insertado y que el cajón «Crear rutina» conserve el foco mientras la guía lo señala.

## Fuera de alcance

- Tutoriales en video, correos de bienvenida o recordatorio, pestaña Asistente en el tour móvil.
- Vista de seguimiento del equipo (PRD §5.3).

## Preguntas para la usuaria

1. ¿Apruebas la explicación inicial «Así se arma un ciclo» con el dibujo de cajas encajadas?
2. ¿Apruebas el orden **atleta → ciclo → rutina → ejercicios → ponerla en un día → seguimiento**? Invitar va primero porque un ciclo solo se puede crear para una atleta que ya aceptó; el resto sigue exactamente tu orden.
3. ¿Quitamos la parada «Ejercicios» como paso y dejamos que los ejercicios se creen dentro de la rutina con **Crear «nombre»**?
4. ¿Que el selector «+» sin rutinas abra el cajón en vez de enlazar fuera de la pizarra?

## Cómo se conecta con otras tarjetas

- **CYC-214 (web):** reemplaza `TourDialog`, `TourCard`, `TourStepBar` y `GuidePanel` por la tarjeta inicial y la capa de marcas (resaltado, globo y chip). Reutiliza `useTour`, `tourApi` y `lib/tour.ts` (cambiar los conteos a atletas, ciclos, rutinas con ejercicios y ciclos activos). Añade las anclas y el ajuste del selector «+».
- **CYC-192 (móvil):** aplicar M1 a M5.
- **CYC-170:** aporta el contenido del manual enlazado en «Cómo usar Cycles».


## Implementado (CYC-214)

La guía v3.1 vive en `components/tour/TourLayer.tsx` (halo + globo sobre el elemento con `data-tour="…"`), `TourIntro.tsx` (tarjeta «Así se arma un ciclo» y dibujo), `lib/tour.ts` (pasos y estado local) y `lib/tourMarks.ts` (catálogo de marcas). Capturas de cada paso en [`capturas/`](capturas/).

Decisiones al construir:

- El cajón «Crear rutina» cubre los pasos 3 y 4: la rutina nace con sus ejercicios, así que ambos pasos de datos se cumplen a la vez. Los textos usan el botón real, **Guardar y usar**.
- En el paso 6 el Resumen va antes que Inicio (la coach ya está en la ficha del atleta tras el paso 5), y el cierre sale en Inicio sobre el avatar.
- «Saltar paso» y el progreso de la guía se recuerdan en el navegador; en la cuenta solo se guarda `tourStatus`.
- No se atenúa el resto de la pantalla (los cajones y diálogos ya traen su propio velo).
- Con la guía en un paso cuya pantalla no está abierta, sale la fichita «Volver al paso N».
- **Reenviar invitación** y el botón **Instalar la app** de iPhone siguen fuera (sin endpoint y sin enlace público de TestFlight).

**Verificado en tablet (768) y móvil (390):** pasos 3 a 5, incluida la marca 4b («¿Falta uno? Toca Crear»), con el ejercicio creado dentro de la rutina. En tablet el panel de rutinas pasa a un botón **Rutinas**, así que la marca 3b resalta **Crea la primera** dentro del selector. Mientras el formulario «Nuevo ejercicio» está abierto, la marca 4a resalta todo el bloque de ejercicios (queda para pulir).
