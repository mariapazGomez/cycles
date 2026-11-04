---
type: design
parent: "[[PRD-LandingContacto]]"
status: proposed
tags: [diseno, landing, capturas, marca]
created: 2026-11-03
updated: 2026-11-03
---

# Vistas de la landing con la app actual (CYC-188)

> Inventario de lo que muestra la landing (`getcycles.app`), qué sigue vigente, qué se rehace y qué falta, con la lista exacta de capturas y el plan para animaciones. **Contrastado con `origin/main` c879ab4.** Estado: propuesto, pendiente de aprobación de la usuaria; después pasa a desarrollo. Hoja visual en [`capturas.html`](capturas.html) (se abre desde el disco, con las imágenes actuales al lado de lo que se rehace).

## Veredicto

**Ninguna captura actual sirve tal cual.** Las nueve imágenes (`apps/web/src/assets/landing/`) se tomaron con la versión anterior de la web: el menú dice **Inicio · Atletas · Ciclos · Rutinas** (hoy es **Inicio · Atletas · Biblioteca · Ejercicios**), el Inicio es el antiguo y la ficha de ciclo es la lista de semanas, no la pizarra. Las maquetas animadas del teléfono usan la isla antigua de tres pestañas con etiqueta. Hay que rehacer todo con la misma versión de la app y la misma cuenta demo.

## Dónde se usa cada pieza (verificado en `LandingPage.tsx`, `CoachShowcase.tsx`, `PhoneScreens.tsx`)

| Sección de la landing | Pieza | Archivo | Estado |
|---|---|---|---|
| Portada, marco de navegador (carrusel de 3 pestañas) | Inicio · Rutinas · Ciclos | `coach-inicio.jpg`, `coach-rutinas.jpg`, `coach-planes.jpg` | **Rehacer** (menú, Inicio nuevo, pizarra) |
| Portada, teléfono | Pantalla Hoy (maqueta HTML animada) | `PhoneScreens.tsx` + `phoneStory.ts` | **Rehacer** (isla, medidas, nota del coach) |
| «Tu atleta lo registra en el celular» | Hoy · Serie · Cierre (3 maquetas HTML animadas) | `PhoneScreens.tsx` + `phoneStory.ts` | **Rehacer** (mismos cambios) |
| «Todos tus atletas, en un solo lugar» | Inicio con avisos y Resumen de un atleta, en escritorio y en celular | `atencion.jpg`, `resumen.jpg`, `m-atencion.jpg`, `m-resumen.jpg` | **Rehacer** |
| «Una sesión que no se pudo hacer también cuenta» | Ciclo con dos sesiones omitidas y su nota, en escritorio y en celular | `plan.jpg`, `m-plan.jpg` | **Rehacer** (ahora es la pizarra) |
| «Cada ciclo construye el siguiente» | Anillo animado de marca | `CycleRing.tsx` | **Vigente** (es ilustración de marca, no captura) |
| Fondos de cadena de proteína | Canvas | `ChainCanvas.tsx` | **Vigente** |
| (no está en la landing) | Video «build in public» | `content/video/out/build-in-public.mp4` (40 MB) | **Fuera de la landing** (ver «Animaciones») |

## Lo que debe mostrar cada vista

Todas salen de la **base demo** (`cycles_demo`, coach Camila Reyes; atletas ficticios), con el mismo día de captura, **modo claro** y copy en tú. Datos de ejemplo, nunca de personas reales.

### Escritorio (viewport 1440 × 900, escala 2 → 2880 × 1800)

| # | Archivo nuevo | Reemplaza | Pantalla y estado |
|---|---|---|---|
| W1 | `coach-inicio` | `coach-inicio.jpg` | **Inicio nuevo (#162)** del coach: semana con filas que crecen, día de hoy resaltado y al menos un día con **dos o tres sesiones**. Chip «Necesitan atención» con contador. |
| W2 | `coach-ciclo` | `coach-planes.jpg` | **Ficha de Matías Fuentes → Ciclo**: «Fuerza base» en curso, **pizarra** de la semana 4 con sesiones hechas y la de hoy. |
| W3 | `coach-rutinas` | `coach-rutinas.jpg` | **Editor de la rutina «Piernas»** (Biblioteca → Piernas): ejercicios con series, reps, carga, descanso y RIR, **una nota del coach en un ejercicio** y el panel «Carga de la sesión». |
| W4 | `atencion` | `atencion.jpg` | **Inicio con «Necesitan atención» abierto**: Javiera Muñoz con **Dolor reportado** y sus acciones (Ver sesión, Descartar). |
| W5 | `resumen` | `resumen.jpg` | **Ficha de Matías Fuentes → Resumen**: carga semanal y adherencia. |
| W6 | `plan` | `plan.jpg` | **Ficha de Diego Paredes → Ciclo**, semana 4 en la pizarra con **dos sesiones omitidas** y sus notas («Viaje de trabajo», «Salí tarde y llegué sin energía»). Si la tarjeta no muestra la nota, se usa el detalle de la sesión. |
| W7 | `ejercicios` | nueva (opcional) | **Ejercicios → Míos**, con filtros de grupo muscular y el botón «Nuevo ejercicio». |
| W8 | `biblioteca` | nueva (opcional) | **Biblioteca** con rutinas y ciclos en una lista, y el menú **Crear**. |

W7 y W8 se capturan igual: sirven para la presentación del onboarding (CYC-170) y las redes. No se agregan a la landing todavía (pregunta 2).

### Celular, versión web del coach (viewport 390 × 844, escala 2 → 780 × 1688)

| # | Archivo nuevo | Reemplaza | Pantalla |
|---|---|---|---|
| M1 | `m-atencion` | `m-atencion.jpg` | Inicio móvil con avisos (misma vista que W4) |
| M2 | `m-resumen` | `m-resumen.jpg` | Resumen de Matías Fuentes (misma vista que W5) |
| M3 | `m-plan` | `m-plan.jpg` | Pizarra de Diego Paredes con las dos omitidas (misma vista que W6) |

### App del atleta (maquetas HTML animadas, no capturas del simulador)

Se mantienen como maquetas porque se animan y pesan casi nada. Lo que cambia respecto a `PhoneScreens.tsx`:

| # | Cambio | Detalle (de `FloatingTabBar.tsx` y las pantallas móviles) |
|---|---|---|
| A1 | **Isla de cuatro íconos, sin etiquetas** | Calendario, Inicio, Resumen y Asistente; tamaño fijo y resaltado que se desliza. Hoy la maqueta muestra tres pestañas y «Inicio» con texto. |
| A2 | **Título con el anillo de marca** | Isotipo de 22 px junto al título de cada pestaña, y medidas compactas (tarjeta oscura con relleno 14, número 34, nombre 22). |
| A3 | **Nota del coach en el ejercicio** | En la maqueta Serie, una línea «Nota de tu coach» (por ejemplo, «Baja lento y cuida el hombro»). |
| A4 | **Barra de estado limpia** | Hora 9:41 (hoy dice 18:40), batería llena. |
| A5 | **Descanso en pantalla de bloqueo** (nueva, opcional) | Una maqueta estática de la Live Activity del descanso. |

## Animaciones

| Pieza | Decisión | Por qué |
|---|---|---|
| Maquetas del teléfono (`phoneStory.ts`) | **Se conservan como DOM animado**; solo se actualiza su contenido | Cero peso, nítidas en cualquier pantalla y ya respetan «reducir movimiento» y la visibilidad. |
| Carrusel del coach | Se conserva; las imágenes cambian | Rota solo a la vista y se detiene con «reducir movimiento». |
| `build-in-public.mp4` (40 MB) y su versión de 18 MB | **No van en la landing** | Pesan demasiado para móvil. Es contenido para redes. Se regraba después de actualizar las maquetas, porque `grabar-telefono.mjs` filma la propia landing y heredará los cambios. |
| **Clip nuevo de la pizarra** (opcional, fase 2) | «Arrastra una rutina a un día», 6 s en bucle, ≤ 1,2 MB (MP4 y WebM) | Es la acción central del producto. Tiene que llevar `muted`, `playsinline`, `poster`, carga diferida y **sin reproducción automática con «reducir movimiento» o ahorro de datos**; sin él, se ve el póster. |

Reglas para cualquier animación: el contenido **no puede depender solo de ella** (el texto de la sección dice lo mismo), debe haber una imagen de respaldo, y se prueba en Safari de iPhone (modo de bajo consumo no reproduce solo) y en Android Chrome (CYC-32).

## Cómo se ve en la página (decisiones de diseño)

- **Pestañas del carrusel:** «Inicio · Ciclo · Rutinas» (de «Ciclos» a «Ciclo», porque muestra la pizarra de uno). Mismo orden de la historia: *ves quién necesita atención → diseñas el ciclo → armas la rutina*.
- **Pie de imagen:** una línea discreta «Datos de ejemplo» bajo cada captura (las personas son ficticias; no se presentan como clientes).
- **Marcos de navegador:** se conservan (`lp-browser`), con la barra de tres puntos.
- **Peso y carga:**

| Imagen | Formato | Tamaño objetivo |
|---|---|---|
| Escritorio, portada | WebP y JPG, `srcset` 1440 y 2880 | ≤ 220 KB (1440) y ≤ 520 KB (2880) |
| Escritorio, secciones | WebP y JPG a 1440, carga diferida | ≤ 200 KB cada una |
| Celular web | WebP y JPG a 780 de ancho | ≤ 110 KB cada una |
| Todas | `width` y `height` explícitos | Sin saltos de diseño |

Total de imágenes de la landing: ≤ 1,6 MB en escritorio y ≤ 0,9 MB en celular.
- **Textos de alternativa:** se actualizan a lo que se ve («Ficha del atleta con la pizarra del ciclo», «Editor de rutina con nota del coach»).

### Textos de la landing que hay que ajustar

| Dónde | Hoy | Propuesta |
|---|---|---|
| Pilar «Agiliza tu planificación» | «Mira la cadena de semanas de cada ciclo de un vistazo.» | «Arma el ciclo en un calendario: arrastra una rutina a un día.» |
| Alt del carrusel | «Visualizador de un ciclo: avance por semanas…» | «Pizarra del ciclo: rutinas asignadas a cada día de la semana» |
| Pestaña del carrusel | «Ciclos» | «Ciclo» |

El resto del copy (tú, «ciclo» y «ciclos», #3080fc / #1f2228) ya es coherente.

## Cómo se capturan (para cuando se apruebe)

Sigue `docs/MANUAL-DEMOS.md` al pie de la letra:

1. **Un jueves o viernes antes de las 18:30** (la semana 4 queda «real»): jueves 5 o viernes 6 de noviembre.
2. Regenerar la demo ese mismo día (`cycles_demo`) y confirmar «Demo lista: 1 coach, 8 atletas, 8 planes».
3. API de la demo en el puerto 3000 **sin** claves de Resend ni Slack, y web sin `VITE_POSTHOG_KEY`. Esto exige **apagar tu API de desarrollo** mientras dure la captura.
4. Ventana de 1440 × 900 y de 390 × 844, modo claro, sin extensiones; zona horaria America/Santiago.
5. Capturar con un script de Playwright (como `grabar-telefono.mjs`) que inicie sesión con las cuentas demo y deje los archivos listos; la contraseña la lee del archivo fuera del repo y **nunca** sale en pantalla ni en los archivos.
6. Revisar a ojo las 8 + 3 imágenes (que no salga nada real: correo, `.env`, gestor de contraseñas).

Esta captura toca tu entorno (apagar la API de desarrollo), por eso **espera tu visto bueno**.

## Calendario propuesto

| Día | Qué |
|---|---|
| Mar 3 – mié 4 | Aprobación de este diseño |
| Jue 5 o vie 6 | Captura con la demo recién regenerada (y las maquetas del teléfono en desarrollo) |
| Sáb 7 – lun 9 | Desarrollo: imágenes nuevas, maquetas del teléfono, textos |
| Mar 10 | Despliegue y prueba en iPhone/Safari y Android (CYC-32) |
| Mié 11 | Entrega (vence CYC-188) |

## Hallazgo aparte

La carpeta `content/` (proyecto de video, ~150 MB con `node_modules`, videos y grabaciones) **no está versionada** en el repositorio. Conviene decidir si se versionan solo los guiones (`*.mjs`, `src/`) y se ignora el resto, o si queda como carpeta local. No lo cambio yo.

## Preguntas para la usuaria

1. ¿La isla de las maquetas del teléfono muestra **los cuatro íconos** (incluido el Asistente, que hoy es una demo) como en la app? Se recomienda sí, sin hablar del Asistente en el texto.
2. ¿Agregamos **Ejercicios** y **Biblioteca** a la landing (por ejemplo, como cuarta pestaña del carrusel) o solo se capturan para el onboarding y las redes?
3. ¿Hacemos el **clip de la pizarra** (fase 2) o lo dejamos para después?
4. ¿Capturamos el **jueves 5** o el **viernes 6**, apagando tu API de desarrollo durante la sesión?
5. ¿Pongo «Datos de ejemplo» bajo cada captura?

## Para desarrollo (tras la aprobación)

- Reemplazar los nueve archivos de `apps/web/src/assets/landing/` por las capturas nuevas (WebP y JPG, `srcset`, `width`/`height`) y actualizar `LandingPage.tsx` y `CoachShowcase.tsx` (pestaña «Ciclo», `alt`, «Datos de ejemplo»).
- Actualizar `PhoneScreens.tsx` y `landing.css` con A1 a A4 (y A5 si se aprueba) y revisar que `phoneStory.ts` apunte a los mismos elementos.
- Probar con CYC-32 (iPhone/Safari y Android) y revisar el peso con Lighthouse.
- Regrabar `build-in-public` después de este cambio (contenido para redes, no landing).
