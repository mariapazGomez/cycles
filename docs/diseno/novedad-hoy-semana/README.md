# Novedad de la pestaña Hoy: «Esta semana» (CYC-256)

Ficha **`athlete-weekly@1`** para la app del atleta, según el sistema de novedades (`docs/diseno/guia-novedades-bloques/README.md`, §4). Maqueta interactiva en [`propuestas.html`](propuestas.html): se ven las dos slides, las fases de cada demostración y la respuesta en tres ventanas (390 × 640, 320 × 568 y letra ×1,6). Contrastado con `origin/main` (ya incluye #241, #242 y #243). Estado: propuesta, pendiente de aprobación de la usuaria.

## Ficha

```ts
{
  key: "athlete-weekly", version: 1, since: "2026-11-11",
  platforms: ["mobile"], roles: ["athlete"],
  name: "Tu semana en Hoy",
  slides: [
    {
      title: "Tu semana de un vistazo",
      text: "Arriba de Hoy ves cuántas sesiones llevas esta semana. El anillo se llena a medida que entrenas.",
      demo: "athlete-weekly-ring",
      demoLabel: "Una tarjeta «Esta semana» donde un anillo pasa de 0 a 2 sesiones de 3.",
    },
    {
      title: "Entiende tus cifras",
      text: "Sesiones, tiempo entrenado y esfuerzo medio, siempre de la semana en curso. Si no registraste esfuerzo, verás «Sin dato».",
      demo: "athlete-weekly-figures",
      demoLabel: "Tres cifras de la semana: sesiones, tiempo entrenado y esfuerzo medio.",
    },
  ],
}
```

Textos de 96 y 121 caracteres (límite 140), en tuteo. Sin `when`: ambas slides se muestran siempre. Hay que sumar los ids `athlete-weekly-ring` y `athlete-weekly-figures` a `NoveltyDemoId` en `packages/shared/src/novelties.ts`.

## Demostraciones (se dibujan en código, como las de `athlete-blocks@1`)

Cada fase dura 1,8 s (`PHASE_MS`), se repiten, y **la última es el resultado final**: con «reducir movimiento» solo se muestra esa, fija. Sin parpadeos.

| Slide | Fases | Resultado final |
|---|---|---|
| **1 · Tu semana de un vistazo** (`athlete-weekly-ring`) | 1) tarjeta «Esta semana», «9 al 15 nov», anillo en 0 %, «0 de 3 sesiones». 2) anillo a 33 %, «1 de 3». 3) anillo a 67 %, «2 de 3». | Fase 3 |
| **2 · Entiende tus cifras** (`athlete-weekly-figures`) | 1) se resalta «Sesiones», «2 de 3». 2) «Tiempo entrenado», «3 h 20 min». 3) «Esfuerzo medio», «6,5». 4) las tres cifras sin resaltado. | Fase 4 |

Detalles de dibujo (react-native-svg):
- **Anillo:** 76 px, trazo de 8, pista `#dbe5f7`, avance `#3080fc` con extremos redondeados; el porcentaje va dentro y se actualiza con la fase. Reutiliza el anillo de la tarjeta real.
- **Tarjeta:** blanca, radio 22, sombra azulada, sin degradados; título «Esta semana» y el rango «9 al 15 nov» (es el texto que ya trae la tarjeta, no un subtítulo nuevo).
- **Resaltado de cifras:** aro de 3 px en `#3080fc` y elevación de 3 px; sin color extra. El resaltado es lo único que cambia entre fases.
- **Datos de ejemplo** fijos (nada del atleta real): 2 de 3, 3 h 20 min, 6,5.

## Reglas que cumple

- Texto de la demostración ≥ 11 px; con letra ×0,85 a ×2 el cuerpo crece y se desplaza dentro de la tarjeta, y el **pie con botones queda siempre visible**.
- Botones de 44 pt o más; azul de botones `#1a66dd`, solo de la app.
- Sin subtítulos grises ni metadatos «X · Y · Z».
- Velo oscuro sin blur real (como el resto de la app).
- Reactivo a la pantalla: la demostración se escala con el ancho de la tarjeta (nunca se recorta); con alto ≤ 380 y ancho < 560 se oculta y quedan texto y botones. Verificado en la maqueta con 390 × 640, 320 × 568 y 390 × 700 a ×1,6: el pie queda dentro de la pantalla en las dos slides.

## Aviso para quien construye

- En la maqueta, «3 h 20 min» salta de línea dentro del cuadro angosto de 320 px; en la app, deja que el cuadro crezca en alto o usa «3 h 20 m» solo si no cabe, pero no reduzcas la letra de 11 px.
- «Adelantar» no aparece: aún no está decidido y no se muestra en esta novedad.
- Se verifica con las pruebas automáticas del sistema (claves únicas, ≤ 4 slides, texto ≤ 140).
