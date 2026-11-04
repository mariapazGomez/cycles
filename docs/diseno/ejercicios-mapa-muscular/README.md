---
type: design
parent: "[[crear-ejercicio]]"
status: proposed
tags: [diseno, ejercicios, web, mapa-muscular]
created: 2026-11-04
updated: 2026-11-04
---

# Ejercicios: filtrar con el mapa muscular (CYC-230)

> **Actualización 2026-11-04:** el panel del mapa va a la **derecha** de la lista (decisión de la usuaria). La pestaña Ejercicios de la web incorpora el mismo mapa del cuerpo que ya usa la app móvil, pero como **filtro**: tocas una zona y la lista muestra solo los ejercicios que la trabajan. Bloquea CYC-231 (desarrollo web). **Contrastado con `origin/main` d3586ac.** Estado: propuesto, pendiente de aprobación de la usuaria. Maqueta interactiva en [`propuestas.html`](propuestas.html) (usa el cuerpo y las zonas reales de la app; se abre desde el disco dentro del repositorio).

## Verificado contra origin/main d3586ac

| Archivo | Qué hay hoy y cómo lo usa el diseño |
|---|---|
| `apps/mobile/src/components/BodyMap.tsx`, `bodyZones.ts` | Dos figuras (frente y espalda): una **imagen PNG de 400 × 810** (`assets/body/front.png`, `back.png`) y encima los **trazados SVG de cada zona**. Hay 7 zonas: Pecho, Espalda, Piernas, Glúteos, Hombros, Brazos y Core (frente: 13 trazados; espalda: 16). Elegir una zona la marca con borde `#1f2228` de 2,5 px. |
| `apps/mobile/src/theme/colors.ts` | Relleno sin carga `#dfe4ec`; azul de marca `#3080fc`; rampa de azules `#cfe0fd … #0d2f78`. |
| `apps/web/src/pages/ExercisesPage.tsx` | Pestañas **Míos / Catálogo**, fila de botones de grupo (`GROUP_OPTIONS`: los 9 grupos, **uno a la vez**), buscador y lista de filas con la insignia del grupo principal y las de los secundarios. |
| `apps/web/src/lib/exercises.ts` | `visibleExercises` ya filtra por **cualquier grupo del ejercicio** (`exerciseGroups` = principal + secundarios, CYC-196) y por nombre. Ordena alfabéticamente. |
| `apps/web/src/lib/muscleGroups.ts` | 9 grupos: pecho, espalda, piernas, glúteos, hombros, brazos, core, **cardio** y **otro**. |

**Dato clave:** el mapa tiene **7 zonas** y la web tiene **9 grupos**. **Cardio** y **Otro** no tienen zona del cuerpo.

## Resumen del diseño

El mapa es un **atajo visual**, no un reemplazo. Los botones de grupo de siempre se quedan (son la forma accesible, cubren Cardio y Otro y muestran cuántos ejercicios hay) y pasan a ser de **selección múltiple**, sincronizados con el mapa: tocar una zona o un botón hace lo mismo.

### Dónde vive el mapa

| Ancho | Posición |
|---|---|
| Escritorio (≥ 1100 px) | **Panel lateral derecho de 330 px**, fijo al desplazarse, con las dos figuras una al lado de la otra. La lista queda a la izquierda, junto a los botones de grupo, y el mapa filtra desde el costado. La página pasa de 880 a **1120 px** de ancho máximo. |
| Tablet (641–1099 px) | **Franja sobre la lista**, abierta por defecto, con las dos figuras de 130 px. |
| Móvil web (≤ 640 px) | **Plegado** tras el botón «Mapa del cuerpo» (con el número de zonas elegidas, por ejemplo «Mapa del cuerpo · 2»). Al abrirlo, las dos figuras ocupan el ancho y la lista sigue debajo. |

Orden vertical: título y **Nuevo ejercicio** → pestañas Míos / Catálogo → botones de grupo → contador de resultados → lista (y el mapa a la derecha en escritorio, o entre los botones y el contador en tablet y móvil). El buscador por nombre se queda donde está.

### Cómo se elige

- **Varias zonas a la vez.** Tocar una zona la suma o la quita. Tocar otra no borra la anterior.
- **Se ve lo elegido:** la zona se rellena con `#3080fc` al 88 % y lleva **borde `#1f2228` de 2,5 px** (el mismo de la app); el botón de grupo queda oscuro; y debajo del mapa aparecen **etiquetas con ×** («Pecho ×», «Core ×»). El estado nunca depende solo del color.
- **Sin elegir:** las zonas son un gris suave (`#dfe4ec` al 55 %) y el texto del panel dice «Toca una zona para filtrar.»
- **Pasar el cursor:** la zona y **todas sus partes (frente y espalda)** se aclaran a `#8fb8fb`. Elegir un grupo en una figura lo marca también en la otra, como en la app.
- **Zonas sin ejercicios** en la pestaña actual (por ejemplo, Espalda en «Míos» si no tienes ninguno): quedan casi transparentes (25 %), no se pueden elegir y su botón se deshabilita con el contador en 0. Si ya estaba elegida, sigue activa y se puede quitar.
- **Cardio y Otro:** solo con los botones de grupo; no aparecen en el mapa. Se pueden combinar con las zonas.
- **Limpiar:** enlace **Limpiar** junto al título del panel, **×** en cada etiqueta y el botón **Todos**.

### Qué muestra la lista

- **Criterio: «cualquiera».** Un ejercicio aparece si trabaja **alguna** de las zonas elegidas, como grupo principal **o secundario** (CYC-196). Es lo que ya hacen los botones hoy; con varias zonas no se pide que las trabaje **todas**.
- **Orden:** primero los que la trabajan como **principal**, y debajo, bajo el encabezado «También trabajan esta zona», los que la trabajan solo como secundario. Dentro de cada bloque, alfabético.
- **Insignias:** en cada fila, los grupos que coinciden con el filtro llevan **borde azul y texto oscuro**; el resto queda en gris. Así se entiende por qué aparece.
- **Contador** sobre la lista: «3 ejercicios en Pecho o Core» (con `aria-live`). Sin filtro: «19 ejercicios».
- **Contadores en los botones** (por ejemplo «Pecho 1»): cuántos ejercicios de **la pestaña y la búsqueda actuales** trabajan ese grupo. Cambian al cambiar de pestaña o buscar.

### Cero resultados

Tarjeta sobre la lista: **«Ningún ejercicio trabaja Pecho o Core con «prensa».»**, con «Prueba con otra zona, o mira el Catálogo.» (esto último solo en la pestaña Míos) y el botón **Limpiar filtros**. Como las zonas sin ejercicios no se pueden elegir, esto pasa sobre todo al sumar un texto en el buscador.

### Estados

| Estado | Qué se ve |
|---|---|
| Cargando | Las dos figuras en gris tenue (sin zonas) y cuatro tarjetas de esqueleto; los botones no responden. |
| Error | El aviso rojo de siempre «No se pudieron cargar los ejercicios.» con **Reintentar**; el mapa no se muestra. |
| Sin ejercicios propios (Míos vacío) | Se conserva «Todavía no creaste ejercicios» y **no** se muestra el mapa ni los botones de grupo (como hoy). |
| Con filtro | Contador, etiquetas, orden y insignias como arriba. |

### Que se mantenga al volver

La selección va en la dirección de la página (`?zonas=chest,core`): al recargar o volver atrás se conserva, y se puede compartir. El buscador y la pestaña siguen como hoy.

## Armonía visual

- Mismo cuerpo y **mismas zonas** que la app. Aquí las zonas indican **selección**, no la carga (en la app se pintan con la rampa azul según el trabajo realizado).
- Tokens: `#3080fc` solo como estado de selección, `#1f2228` para el borde y los botones activos, `#dfe4ec` para lo sin elegir.
- Radios de la escala de CYC-206: panel 10, botones y etiquetas 8, insignias 999 (son etiquetas pequeñas).
- Español en tú, sin subtítulos grises bajo los títulos y sin metadatos tipo «X · Y · Z».

## Accesibilidad

- **El mapa es un atajo para el puntero.** Se marca como decorativo para lector de pantalla (`aria-hidden`) y **no entra en el orden de tabulación**; la forma accesible son los botones de grupo, que son botones con `aria-pressed`, tienen nombre («Pecho, 8 ejercicios») y se usan con teclado.
- **Estado no solo por color:** selección = relleno + borde oscuro + etiqueta con texto + botón pulsado.
- **Anuncio:** el contador de resultados está en una región `aria-live="polite"`; al quitar la última zona dice «19 ejercicios».
- **Contraste:** botones activos `#ffffff` sobre `#1f2228` (15,9:1); etiquetas y texto `#1f2228` sobre `#eaf2ff`. El relleno de la zona elegida `#3080fc` frente al gris `#dfe4ec` tiene menos de 3:1, por eso lleva además el **borde oscuro de 2,5 px**.
- **Destinos táctiles:** los botones y etiquetas miden al menos 36 px (los botones de acción, 40). Las zonas del mapa son grandes pero irregulares; en móvil la forma segura es el botón de grupo.
- **Sin animación:** el relleno cambia de golpe; nada se mueve al elegir.
- **Foco al limpiar:** el foco vuelve al botón **Todos**.

## Qué reutiliza y qué cambia (para CYC-231)

- **Reutilizar de la app:** `assets/body/front.png`, `back.png` (≈ 230 KB entre los dos) y `bodyViews` de `bodyZones.ts` (≈ 17 KB). Para no duplicarlos, moverlos a un lugar compartido (por ejemplo `packages/shared`) o copiarlos con una nota de origen; el desarrollo decide.
- **Peso:** cargar el mapa con carga diferida, y las PNG convertidas a WebP si se puede (≈ 60 % menos). El panel debe reservar su alto (`aspect-ratio: 400 / 810`) para no mover la página al cargar.
- **Nuevos:** componente `BodyFilter` (dos figuras y la lógica de selección), estado de selección múltiple en `ExercisesPage` (`Set` de grupos), `visibleExercises` con una lista de grupos y el orden «principal primero», contadores por grupo en `lib/exercises.ts`, y el parámetro `?zonas=`.
- **Sin cambios:** formulario de crear y editar, filas de la lista, pestañas, buscador y la regla de que Míos vacío no muestra filtros.

## Fuera de alcance

- Usar el mapa para **elegir** el grupo al crear un ejercicio (podría ser una mejora del formulario más adelante).
- Colorear el mapa según la carga del coach (eso es el Resumen del atleta).
- Filtrar «todas las zonas» (criterio «y»): no se ofrece.

## Preguntas para la usuaria

1. ¿Apruebas que el criterio sea **«cualquiera de las zonas»** (principal o secundario), con los principales primero?
2. ¿Conservamos los **botones de grupo** (ahora de selección múltiple) junto al mapa, como forma accesible y para Cardio y Otro? Se recomienda que sí.
3. ¿Está bien que la página de Ejercicios pase de 880 a **1120 px** de ancho para alojar el panel lateral?
4. ¿Las zonas sin ejercicios se **desactivan** (recomendado) o se dejan elegibles y se muestra el cero resultados?
