---
type: spike
parent: "[[resumen-atleta]]"
status: done
tags: [diseno, resumen, mobile, graficos, spike]
created: 2026-11-04
updated: 2026-11-05
---

# Spike CYC-244 (app): gráfico estrella con react-native-svg

Complementa [`spike-grafico-estrella.md`](spike-grafico-estrella.md) (web, CYC-243). **Recomendación: `react-native-svg` alcanza**, sin Skia, Victory Native ni Reanimated. El gráfico quedó en la app como `apps/mobile/src/components/charts/PlanVsRealChart.tsx` y la matemática en `src/utils/chartMath.ts` (sin d3), y lo usa el Resumen (CYC-241).

| Qué | Resultado | Alcance |
|---|---|---|
| Peso en la app | **+8,4 KB** en el bundle de iOS en Release (+0,26 %), medido contra `origin/main` con la demo | Medido; sin módulos nativos nuevos |
| Legibilidad | Todo el texto a **11 px o más**, dibujado al ancho real (`onLayout`), con prueba automática | Medido |
| Redibujo | 2,4 ms (6 sesiones), 3,3 ms (12), 7,4 ms (40), en Jest/Node | Solo orientativo (Hermes en un iPhone es más lento) |
| Fluidez en un teléfono | **Sin medir** | El spike (PR #194, borrador) traía una prueba de fluidez en un APK de Android; no se midió en iPhone |

La API entrega hasta 52 sesiones por ejercicio: con muchas sesiones el eje X muestra una etiqueta de cada tantas (y siempre la última) para no encimar el texto.

**Tipografía:** la app usa la fuente del sistema; las cifras grandes van en peso 800, `letterSpacing` −0,4 y números tabulares. Empaquetar Bricolage Grotesque queda en CYC-246.
