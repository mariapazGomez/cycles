---
type: design
status: approved
tags: [diseno, landing, vision, causa, marca]
created: 2026-11-17
updated: 2026-11-17
---

# Landing: la causa de Cycles en los primeros segundos (CYC-292)

> Contrastado con la landing en producción (getcycles.app, 2026-11-17) y con `origin/main`. Estado: **aprobada el 2026-11-17: opción B con el texto T2 en la portada** (el titular de la sección «Por qué lo hacemos» queda como T1 propuesto, por confirmar al desarrollar). Desarrollada en CYC-293 (pendiente de confirmar tres textos). Sin cambios de código. Maqueta en [`propuestas.html`](propuestas.html); capturas en `capturas/` (escritorio 1440 × 900 y móvil 390 × 844, con la línea roja del borde de la primera pantalla).

## Qué se decidió (comentarios de la usuaria, 17-11)

- «Ciencia del deporte» se nombra **como dirección y causa, sin prometerla**, y debe verse **en los primeros segundos**, no más abajo.
- La **brecha** es de acceso por tamaño y recursos: hoy esas herramientas las tienen atletas profesionales con equipos grandes; Cycles quiere ponerlas al alcance de **coaches pequeños o independientes**. No es de geografía ni de precio.
- Público: el coach independiente (principal) y quien quiera sumarse a la causa.
- Siguen vigentes: sin «gemelo digital» ni «agentes de IA», sin promesa de resultados ni de ingresos, sin «mejora el rendimiento», sin fechas, sin Resumen. La regla de CYC-262 / CYC-141 se levanta **solo** para esta frase de causa.

## Lo que encontré en la portada real

- El título («Planifica el ciclo. Recibe el feedback. Ajusta el siguiente.») y la definición ya ocupan la columna izquierda. **No se toca**: es el *qué*, y un coach lo entiende en cinco segundos.
- La lista «1 Planificas en la web · 2 Tu atleta registra en la app · 3 Ves qué pasó y ajustas» **repite** el título y la definición. Es el único espacio de la portada que se puede ceder sin perder contenido.
- En escritorio la primera pantalla termina justo bajo la lista y la imagen; en móvil, bajo el botón y las pestañas de la plataforma. Cualquier cosa que se sume tiene que caber **en esos 900 u 844 px**.

## Las tres opciones (misma voz, distinto lugar)

| | Dónde vive | Texto | ¿Se ve sin hacer scroll? | Riesgo |
|---|---|---|---|---|
| **A · Franja de causa** | Banda tinta bajo el encabezado, una línea y el enlace «Por qué lo hacemos ↓». | «Queremos poner la ciencia del deporte al alcance de cada coach.» | Sí, en escritorio y móvil (es lo primero). | Se lee como aviso; fácil de ignorar. |
| **B · Bloque en la portada (APROBADA)** | Dentro de la columna del título, **en el lugar de los tres pasos**: etiqueta «Nuestra causa», frase y enlace. | «Queremos poner la ciencia del deporte al alcance de cada coach.» (T2; la maqueta final usa este texto) | Sí: en escritorio termina a unos 80 px del borde; en móvil, bajo el botón. | Se pierde la lista de pasos (ya está dicha en el título y la definición). |
| **C · Banda ancha al pie de la portada** | Banda tinta de ancho completo bajo la imagen, con frase grande, párrafo y botón «Quiero sumarme». | «Queremos cambiar la forma tradicional de entrenar.» | **En escritorio solo asoma la frase** (90 px); en móvil sí cabe entre el botón y la imagen. | Dos botones seguidos en móvil; la banda empuja el contenido. |

En las tres, **el título y el botón principal no cambian**. La causa nunca es título ni va como subtítulo bajo él (CYC-266 ya descartó esas dos formas: compiten con la definición y rompen la regla de no poner líneas grises bajo los títulos).

### Por qué B (aprobada)

1. Convive con el título: lo lee **después** del botón, más pequeño, así que no compite; sigue el orden *qué → por qué*.
2. No añade altura: reemplaza una lista redundante.
3. Es parte de la portada, no un anuncio: la causa se lee como lo que Cycles es, no como una noticia.
4. Funciona igual en móvil (queda bajo el botón, antes de la imagen).

A es la más ligera si la usuaria quiere cambiar menos; C es la más enfática, pero en escritorio solo se ve la frase.

## Sección «Por qué lo hacemos» (se suma a cualquiera de las tres)

Va **después de los tres pilares** («Así te ayuda Cycles…») y antes del anillo del ciclo, como ya proponía CYC-266 para la frase-eje; esta versión la **reemplaza y amplía** con la causa. Fondo tinta `#1f2228`, sin capturas ni subtítulos grises. El enlace «Por qué lo hacemos ↓» de la portada baja hasta aquí.

> **POR QUÉ LO HACEMOS**
> **La ciencia del deporte no debería ser cosa de equipos grandes.**
>
> Hoy, las herramientas que se apoyan en ella las usan atletas profesionales con equipos enteros detrás. El coach que entrena solo con sus atletas se queda con un Excel y un chat.
>
> Estamos construyendo Cycles para cerrar esa distancia: ponerla al alcance de coaches pequeños e independientes, para que lleven su trabajo más lejos. Es una dirección, no una promesa: recién empezamos, vamos paso a paso y el coach siempre decide.
>
> *Que cualquier atleta que entrene en serio tenga la comprensión que hoy solo tiene la élite.*
>
> [Quiero acceso anticipado →] · Quiero sumarme a la causa

**Cómo convive con la frase-eje:** la causa nombra la **ciencia del deporte** (hacia dónde); la frase-eje cierra el bloque con lo que Cycles construye hoy, la **comprensión** de cada atleta. «Cada ciclo deja memoria» (7b) se queda como el *cómo*.

## Textos (2–3 opciones de titular y párrafo)

| # | Titular | Párrafo | Tono |
|---|---|---|---|
| **T1** (en la maqueta) | La ciencia del deporte no debería ser cosa de equipos grandes. | Ver arriba. | Señala la brecha; el más directo. |
| **T2** | Queremos poner la ciencia del deporte al alcance de cada coach. | «Hoy solo la tienen los equipos grandes de atletas profesionales. Cycles nace para que un coach independiente también pueda entender a sus atletas y llevar su trabajo más lejos. Recién empezamos y lo contamos en público.» | Positivo, sin señalar a nadie; el más cercano a la voz de marca. |
| **T3** | Queremos cambiar la forma tradicional de entrenar. | «Hoy la ciencia del deporte la usan atletas profesionales con equipos enteros. Estamos construyendo Cycles para que cualquier coach independiente pueda acercarse a ella.» | El más amplio («transformar»); el que menos concreta. |

Mapa: A y B (aprobada) usan T2; C usa T3; la sección larga usa T1. **Aprobado: T2 en la portada.** El titular de la sección larga queda como T1 hasta que la usuaria lo confirme.

## Los dos públicos

- **Coach independiente (principal):** «equipos grandes» frente a «coach independiente», con la imagen del Excel y el chat que ya usa la landing. Es lo que reconoce de su vida.
- **Quien quiere sumarse (coaches, deportistas, aliados):** la causa lo invita sin pedirle ser coach. El atleta aparece **a través de su coach** («sus atletas»), como pidió la usuaria; no se le promete nada directo.

## ¿Cambia el llamado a la acción?

**Recomendación: el botón principal no cambia** («Quiero acceso anticipado»): es lo único que hoy se puede cumplir y llega al formulario. Se suma:

1. Un **enlace de texto** «Quiero sumarme a la causa» en la sección larga (y el botón «Quiero sumarme» en C), que baja al mismo formulario `#contacto`.
2. Una línea en el formulario (propuesta para quien desarrolle): «¿No eres coach pero quieres sumarte? Cuéntanos igual.» y cambiar el campo a «Cuéntanos quién eres y cómo trabajas» (hoy dice «cuántos atletas llevas», que solo le sirve al coach).

Alternativa descartada: un segundo formulario o un botón «Sumarme» distinto en la portada. Parte la atención y no hay todavía a dónde llevar a quien se suma.

## Reglas que cumple

| Regla | Cómo se cumple |
|---|---|
| Sin gemelo digital ni agentes de IA | No aparecen. |
| Sin promesa de resultados ni de ingresos | «Poner al alcance de…», «llevar su trabajo más lejos», «dirección, no promesa». Sin «mejora el rendimiento», sin «escalar» ni cifras. |
| Sin fechas | «Recién empezamos, vamos paso a paso». |
| El coach siempre decide | Frase explícita en el párrafo. |
| Sin Resumen | La portada usa la plataforma y la app de hoy; no hay pantallas de Resumen. |
| Tuteo, sin subtítulos grises | Todo en «tú / queremos», texto en tinta; sin líneas grises bajo títulos. |
| «Ciencia del deporte» | Solo como causa («queremos poner…», «no debería ser…»), nunca como lo que el producto de hoy entrega. |

## Decisiones de la usuaria (17-11)

1. **Opción B con T2 en la portada.** Aprobada.
2. Siguen sin responder: «equipos grandes» (se usa en la sección, no en la portada) y «llevar su trabajo más lejos». Quedan como están hasta que diga lo contrario.

## Preguntas que quedan abiertas

1. ¿Cuál de A, B o C, y cuál titular (T1, T2 o T3)? Recomendación: **B + sección**, con T2 en la portada y T1 como titular de la sección.
2. «Equipos grandes»: ¿suena bien o prefieres «equipos de élite» / «clubes profesionales»? (Más concreto, pero deja fuera a quien no se identifica.)
3. «Llevar su trabajo más lejos»: es la forma de decir «escalar» sin leerse como promesa de ingresos. ¿Te sirve o prefieres quitarlo?

## Para quien desarrolle (solo tras el «apruebo»)

- Archivo: `apps/web/src/pages/LandingPage.tsx` y `apps/web/src/styles/landing.css`. B reemplaza el `<ol className="lp-hero-steps">` por un bloque con el isotipo de `Logo`, una etiqueta `lp-eyebrow`, un `h3` y un enlace a `#por-que`. La sección nueva usa el fondo tinta de la sección final y las clases ya existentes.
- Escritorio 1440 × 900: el bloque debe quedar por encima de los 900 px. Móvil 390 × 844: bajo el botón, antes de las pestañas de la plataforma. Probar en 320, 390, 768 y 1440.
- Sin animación propia; respeta «reducir movimiento».
- Título de la pestaña y vista previa al compartir: sin cambios (CYC-264).
- Tipografías reales de la landing: Bricolage Grotesque 800 (títulos) e Inter (texto). La maqueta usa las mismas.

## Documentos de marca a actualizar al aprobarse

`docs/brand/esencia.md`, `mensajes.md` y `landing.md`; ajustar la nota de `posicionamiento.md` (la frase-eje deja de ser el único *por qué*: la causa nombra la ciencia del deporte y la frase-eje queda como cierre). **No se editan hasta el «apruebo».**
