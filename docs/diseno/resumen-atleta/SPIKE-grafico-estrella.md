---
type: spike
parent: "[[resumen-atleta]]"
status: partial
tags: [spike, resumen, graficos, mobile]
created: 2026-11-04
updated: 2026-11-04
---

# Spike CYC-244: «gráfico estrella» del Resumen con react-native-svg

Pregunta: ¿alcanza `react-native-svg` (ya instalado) para el gráfico de plan contra real de la app, sin Skia, Victory Native ni Reanimated? Código: `apps/mobile/src/components/charts/PlanVsRealChart.tsx` (el gráfico, reutilizable) y `apps/mobile/src/utils/chartMath.ts` (escalas y trazados, sin d3). `SpikeChartDemo.tsx` y su enganche en `SummaryScreen.tsx` son **solo del spike y no se mezclan**.

## Qué se construyó

Tarjeta oscura `#1f2228`; lo cargado en `#3080fc` con perlas (borde blanco de 2,5 px, halo al 16 %, la última más grande); lo planificado en gris con línea de puntos y perlas huecas; banda azul suave entre ambas; rejilla de puntos redondos; cifra final grande; leyenda de texto; y la frase «Cargó 2,5 kg menos que el plan en la última sesión.». Es un solo componente con datos de ejemplo (`{ label, plan, real }[]`), sin dependencias nuevas.

## Medición

| Qué | Resultado | Cómo se midió | Alcance |
|---|---|---|---|
| **Peso en la app** | **+8,4 KB** en el bundle de iOS en Release (3 257 696 → 3 266 066 bytes, +0,26 %) | `react-native bundle` de `origin/main` contra la rama, con la demo incluida | Medido. Sin módulos nativos nuevos: no cambia el binario ni el riesgo de Xcode Cloud |
| **Legibilidad** | Todo el texto del gráfico a **11 px o más**, dibujado al ancho real (se mide con `onLayout`, no se escala un lienzo fijo) | Prueba automática: ningún `fontSize` bajo 11 | Medido. Las 6,6 px de la maqueta no se repiten |
| **Complejidad** | 6 sesiones: 18 círculos; 12: 36; 40: 120 (más líneas y textos) | Árbol de render | Medido |
| **Costo de redibujar** | **2,4 ms** (6 sesiones), **3,3 ms** (12), **7,4 ms** (40) por redibujo | Jest en Node (JS en un Mac), 200 redibujos con datos distintos | **Solo orientativo**: Hermes en un iPhone es más lento y esto no incluye el dibujo nativo. No es fluidez |
| **Fluidez en iPhone** | **Sin medir** | No hay simulador ni iPhone en esta máquina | **Pendiente** (ver abajo) |

Lectura: para el uso real (6 a 12 sesiones, **sin animación continua**, se dibuja una vez por pantalla) el costo es despreciable. Solo habría riesgo si se animara el gráfico cuadro a cuadro con muchos puntos, porque sin Reanimated cada cuadro es un re-render de React.

## Cómo medir la fluidez en un teléfono

La demo trae la **«Prueba de fluidez (3 s)»**: redibuja el gráfico en cada cuadro con datos que cambian y muestra cuadros por segundo, el peor cuadro y cuántos pasaron de 20 ms; hay botones de 6, 12 y 40 sesiones. Está al principio de la pestaña Resumen en un APK de Android compilado desde la rama `spike/cyc-244-grafico-estrella` (Actions → Android → Run workflow). Para iPhone haría falta una build de TestFlight desde esa rama, que no conviene para un spike. La prueba mide el hilo de JavaScript, no el de dibujo nativo.

## Hallazgos y recomendación

1. **Recomendación: sí, `react-native-svg` alcanza.** Seguir sin Skia, Victory Native ni Reanimated. La matemática propia cuesta ~60 líneas; no hace falta `d3-shape` en la app para líneas rectas (se puede sumar si se quiere suavizar con curvas).
2. **Tipografía:** el diseño usa Bricolage Grotesque para las cifras, pero **la app no tiene fuentes propias** (usa la del sistema). La cifra grande va en el sistema en peso 800. Decidir si se empaqueta Bricolage (fuente nueva en la app, licencia y peso) o se queda el sistema.
3. **Fluidez no demostrada en iPhone:** la recomendación se sostiene en el peso, el costo de render y que el gráfico es estático. Si se pide animación de entrada, evaluar primero con el `Animated` de React Native (sin dependencias nuevas) y medir antes de sumar Reanimated.
4. **Accesibilidad:** el gráfico se expone como una imagen con una descripción hablada de todas las sesiones y la frase. Falta la «tabla equivalente» del diseño: en la app se resuelve con el detalle por ejercicio (tocar la tarjeta).
5. **Datos:** esto no resuelve el endpoint `GET /me/exercise-progress` (CYC-239, Desarrollo general), que bloquea CYC-241.

## Qué queda para CYC-241

Mover `PlanVsRealChart` y `chartMath` tal cual a la pantalla real, quitar la demo y su enganche en `SummaryScreen`, y alimentar el gráfico con el historial por ejercicio cuando exista CYC-239.
