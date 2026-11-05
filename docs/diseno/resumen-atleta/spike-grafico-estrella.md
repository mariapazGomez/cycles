---
type: spike
parent: "[[resumen-atleta]]"
status: done
tags: [diseno, resumen, web, graficos, spike]
created: 2026-11-05
updated: 2026-11-05
---

# Spike CYC-243: gráfico estrella con d3-scale + d3-shape

Un día para decidir si la web puede dibujar el **gráfico estrella** del Resumen (peso planificado contra el cargado, tarjeta oscura) con `d3-scale` y `d3-shape` y marcas SVG propias, antes de construir la pizarra (CYC-240).

## Veredicto: sí, se puede seguir con D3 + SVG propio

| Medida | Resultado |
|---|---|
| **Peso en el paquete** | Solo las funciones que se usan (`scaleLinear`, `scalePoint`, `line`, `area`), empaquetadas y minificadas con esbuild: **≈ 50 KB sin comprimir, ≈ 15,8 KB comprimido (gzip)**. Es mucho menos que los «≈ 270 KB sin comprimir entre ambos» de la tabla del diseño, que cuenta los dos paquetes completos. El paquete `d3-array`, `d3-path`, `d3-time` y otros llegan como dependencias internas. |
| **Cálculo** | 0,17 ms por trazado con 52 puntos (el tope de sesiones por ejercicio de `GET /me/exercise-progress`). Redibujar al cambiar el tamaño de la ventana no se nota. |
| **Legibilidad** | Se dibuja al **ancho real del contenedor** (`ResizeObserver`), a escala 1 a 1. Medido en el navegador a 330, 520 y 700 px de ancho: el texto más chico del SVG mide **12 px** en los tres (el mínimo del diseño es 11 px). |
| **Aspecto** | Tarjeta `#1f2228`; planificado gris claro, discontinuo y con marcas huecas; cargado `#3080fc`, continuo y con marcas llenas; banda azul suave entre ambos donde hay plan y real; diferencia de la última sesión en grande («−2,5 kg») y una frase debajo. El estado no depende solo del color (forma de la marca, trazo y signo). |

## Qué quedó construido

- `apps/web/src/lib/starChart.ts`: la matemática (escalas, trazados, banda, frase y etiqueta de la última sesión). Funciones puras, con pruebas en `apps/web/__tests__/graficoEstrella.test.ts`.
- `apps/web/src/components/StarChart.tsx`: el dibujo. **Todavía no está conectado a ninguna pantalla** (lo hace CYC-240) y recibe `StarPoint[]` (`label`, `date`, `planned`, `actual`); `GET /me/exercise-progress` (CYC-239) entrega lo necesario (`plannedWeight` y `actualWeight` por sesión).
- Dependencias nuevas en `apps/web`: `d3-scale` y `d3-shape` (y sus tipos).
- `jest.config.cjs` ahora transforma los módulos ES de d3 (se publican solo como ES).

## Lo que el spike no cubrió

- **Tooltip por sesión:** se dejó como `<title>` nativo de cada marca (accesible, pero básico). El tooltip rico del diseño (cada serie con peso, repeticiones y RIR) se hace en CYC-240.
- **Animación y la banda curva:** la línea es recta entre sesiones (fiel a los datos); no se animó.
- **La app móvil:** el mismo cálculo (`d3-shape`) sobre `react-native-svg` no se probó aquí; el diseño lo pide como spike aparte en un iPhone.
- **visx:** no hizo falta para este gráfico. Podría ahorrar tiempo en ejes y tooltips de los demás gráficos; decidir en CYC-240.

## Recomendación

Seguir con **d3-scale + d3-shape y marcas SVG propias** en la web. El costo es de ≈ 16 KB comprimidos y el control sobre las marcas es total. Cargar los gráficos con `lazy` junto con la pestaña Resumen para que no pesen en el resto de la web.
