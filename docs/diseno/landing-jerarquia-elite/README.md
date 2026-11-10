# Landing: frase-eje y jerarquía (CYC-266)

Propuesta de diseño para llevar **«Que cualquier atleta que entrene en serio tenga la comprensión que hoy solo tiene la élite»** a la landing y a las redes. Abre `propuestas.html` en el navegador. **No hay cambios de código**: la landing no se toca hasta que la fundadora apruebe.

## Qué se propone

- **Opción B (recomendada):** el título de la portada se mantiene y entra una sección nueva, **«Por qué lo hacemos»**, entre los pilares y el anillo del ciclo. Fondo tinta `#1f2228`, la frase en grande y un texto de apoyo que pone al coach como quien lo hace posible. «Cada ciclo deja memoria» queda como el *cómo*.
- Opciones descartadas: A (frase como título) y C (frase como subtítulo bajo el título). Las razones están en el mockup.
- **Redes:** la frase cabe en Instagram (129 de 150) y LinkedIn (113 de 120); TikTok conserva la frase corta.

## Para quien desarrolle (solo si se aprueba)

- Archivo: `apps/web/src/pages/LandingPage.tsx`. La sección nueva va justo antes del anillo del ciclo; reutiliza las clases `lp-eyebrow` y el fondo tinta de la sección final.
- Texto: frase en `h2`, texto de apoyo en `p`. Sin subtítulos grises, sin capturas.
- Responsive: la frase usa `clamp(28px, 5vw, 58px)`, ancho máximo de 18 em; el padding vertical se reduce en celulares. Probar en 320, 390, 768 y 1440 px.
- Respeta `prefers-reduced-motion` (la sección no lleva animación propia).
- Título de la pestaña y vista previa (CYC-264): sin cambios.

## Documentos de marca actualizados

`docs/brand/posicionamiento.md` (nuevo: frase-eje, escalera de mensajes, vocabulario puente y puertas de paso, riesgos), `esencia.md`, `mensajes.md`, `redes-perfiles.md`, `speech.md` y `landing.md`.

## Reglas que se mantienen (CYC-262)

En landing y redes: sin «gemelo digital», sin «agentes de IA», sin fechas, sin «mejora el rendimiento», sin «ciencia del deporte». En conversaciones personales con coaches sí se nombran la IA y los gemelos digitales como dirección.
