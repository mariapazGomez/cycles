---
type: design
parent: "[[PRD-CatalogoEjercicios]]"
status: decided
tags: [diseno, ejercicios, coach]
created: 2026-10-19
updated: 2026-10-19
---

# Pestaña Ejercicios: crear un ejercicio (T-180)

> Un coach pidió crear sus propios ejercicios: escribe el nombre y elige el resto de las características entre las opciones disponibles, incluidos los implementos que necesita. Este diseño define la pestaña **Ejercicios** de la web (computador y celular), el atajo «Crear» dentro del editor de rutinas y cómo se vería, de forma opcional, en la app del coach. **Decidido por la fundadora el 2026-10-20** (las ocho decisiones, con recomendaciones aprobadas). Se construye en T-181 a T-186; reemplaza a T-081.

**Estado de la construcción (2026-10-30):** hecho el modelo de implementos, la API (obligatorios, nombre repetido, editar) y la pestaña Ejercicios de la web con lista, crear, editar y dejar de usar (CYC-56). **Falta:** el atajo «Crear» en el editor de rutinas, cargar los implementos de los 54 ejercicios del catálogo y la búsqueda por implementos.

## Cómo verlo

Abre [`propuestas.html`](propuestas.html). Arriba alternas entre los estados (lista, nuevo ejercicio, con errores, guardado, sin ejercicios, dejar de usar, catálogo, desde una rutina, en la app) y entre **Computador** y **Celular**. Los nombres son de ejemplo.

## Qué se puede elegir al crear un ejercicio

Lo que hoy existe en el modelo (`Exercise`) y en `POST /exercises`, más **Implementos**, que se agrega con este diseño (pedido de la fundadora el 2026-10-20):

| Campo | Tipo | Obligatorio | Opciones |
|---|---|---|---|
| Nombre | Texto | Sí | Libre |
| Grupo muscular | Una opción | Sí en el diseño (hoy la API lo deja opcional y cae en «Otro») | Pecho, Espalda, Piernas, Glúteos, Hombros, Brazos, Core, Cardio, Otro |
| Implementos | Varias opciones | Sí: al menos uno, o «Peso corporal» | Barra, Discos, Mancuernas, Kettlebell, Banco, Rack, Polea, Máquina, Banda elástica, Barra de dominadas, Paralelas, Suspensión, Balón medicinal, Cajón; y «Peso corporal» (excluyente) |
| Descripción | Texto largo | No | Libre |
| Enlace del video | Enlace | No | Debe empezar con `https://` |

Otras características (tipo de movimiento, unilateral) no se incluyen: se diseñan si el coach las pide.

## Dónde vive

1. **Pestaña «Ejercicios»** al final del menú del coach: Inicio, Atletas, Ciclos, Rutinas, **Ejercicios**.
2. **Atajo en el editor de rutinas:** si el buscador no encuentra el ejercicio, aparece «Crear «{texto}»».

## Implementos

**Qué es:** lo que el ejercicio necesita para hacerse. Ejemplo: **Remo con barra** necesita **Barra** y **Discos**; **Plancha** es **Peso corporal**.

**Por qué importa:** habilita el buscador futuro «¿qué ejercicios puedo hacer con lo que tengo?». Para que esa búsqueda funcione, los implementos tienen que ser una **lista cerrada y de selección múltiple**, no texto libre («Barra», «barra olímpica» y «bar» serían tres cosas distintas), igual que el grupo muscular.

**En el formulario:** chips de selección múltiple (aria-pressed), de una sola fila que se ajusta. «Peso corporal» va separado por una línea, con borde punteado, y es excluyente: al marcarlo se desmarcan los demás, y al marcar otro se desmarca. Ayuda debajo: «Elige todo lo que necesita, o «Peso corporal» si no usa nada.» Si no se elige nada: «Elige los implementos o marca «Peso corporal».»

**En la lista:** cada fila muestra los implementos como etiquetas azul claro debajo del nombre (por ejemplo, Barra, Discos), junto a la etiqueta gris del grupo. No es una línea de metadatos con puntos medios.

**Búsqueda por implementos (más adelante):** el coach marca lo que tiene («Tengo estos implementos») y la lista muestra los ejercicios cuyos implementos están **todos** marcados; «Peso corporal» siempre entra. Está en la maqueta (pestaña «Por implementos») solo como referencia; no se construye ahora.

**Los 54 ejercicios del catálogo no tienen implementos.** Hay que asignárselos a mano (revisados, como los nombres) antes de que la búsqueda tenga sentido; mientras un ejercicio no tenga implementos, no entra en la búsqueda y la pantalla lo avisa. La lista de implementos es cerrada: agregar uno nuevo requiere un cambio en el sistema.

## Pantalla Ejercicios

- **Encabezado:** título «Ejercicios» (Bricolage) y botón primario «Nuevo ejercicio» a la derecha.
- **Dos pestañas dentro de la tarjeta:** «Míos» (los que creó el coach) y «Catálogo» (los 54 de Cycles, solo lectura).
- **Búsqueda por nombre** y chips por grupo (Todos y los nueve grupos), que se desplazan en horizontal.
- **Fila de ejercicio:** nombre en negrita, etiqueta con su grupo y el botón «Dejar de usar». Sin línea gris con la descripción debajo del nombre y sin metadatos con puntos medios.
- **Catálogo:** filas sin acciones y un recordatorio: «El catálogo de Cycles es de todos y no se edita. Si falta un ejercicio, créalo en «Míos».»

## Nuevo ejercicio (formulario)

Se abre **arriba de la lista, en una tarjeta, sin modal** (igual que el panel de asignar rutina de la grilla). Orden: Nombre, Grupo muscular (chips de una sola elección), Implementos (chips de selección múltiple), Descripción (opcional), Enlace del video (opcional). Botones: **«Guardar ejercicio»** (primario) y «Cancelar».

| Situación | Texto |
|---|---|
| Nombre vacío | «Escribe el nombre del ejercicio.» |
| Sin grupo | «Elige un grupo muscular.» |
| Sin implementos | «Elige los implementos o marca «Peso corporal».» |
| Enlace inválido | «Pega un enlace que empiece con https://» |
| Nombre repetido (propio o del catálogo) | Aviso arriba: «Ya tienes un ejercicio llamado «Press banca». Búscalo en la lista y úsalo en tu rutina.» |
| Guardado | «Ejercicio guardado.» y la fila nueva queda arriba con fondo azul claro y la etiqueta «Nuevo» |

## Dejar de usar

Confirmación dentro de la propia lista, sin diálogo del navegador: **«¿Dejar de usar «Remo en máquina»?»** «Ya no aparecerá al armar rutinas. Las sesiones donde lo usaste lo conservan.» Botones «Dejar de usar» y «Cancelar». Usa `PATCH /exercises/:id/deactivate`, que ya existe.

## Sin ejercicios propios

Tarjeta con la cadena de proteína solo detrás del texto: «Todavía no creaste ejercicios» y «Aquí van los que crees tú. El catálogo de Cycles ya tiene 54 para empezar.», con el botón «Nuevo ejercicio».

## Desde el editor de rutinas

Cuando el buscador no devuelve resultados, la primera fila es **«Crear «{texto}»»** (azul, con un más). Abre una tarjeta con el nombre ya escrito y pide el grupo y los implementos; «Descripción y video (opcional)» queda plegado. El botón dice **«Crear y agregar a la rutina»** y, al guardar, el ejercicio entra a la rutina sin que el coach salga de lo que estaba haciendo.

## Celular

Es la misma página de la web a ancho de teléfono, no una pantalla aparte: la cabecera se parte en dos filas (logo, campana y avatar arriba; pestañas desplazables abajo), la columna ocupa todo el ancho con 14 px de margen y los chips de grupo se ajustan en filas. Los botones y chips miden al menos 40 a 44 px de alto.

## En la app del coach (opcional)

La maqueta incluye cómo se vería: una hoja desde abajo con nombre, grupo e implementos, y el aviso «Descripción y video se agregan desde la web». **Hoy no entra en el alcance de la app del coach** (ver [[app-coach-movil]]): crear contenido nuevo de la biblioteca falla la segunda pregunta de la regla («usa solo lo que ya existe»). Mientras tanto, la app ofrece «Abrir en la web» cuando falta un ejercicio. Solo se construiría si se decide ampliar ese alcance.

## Medidas y estilo

Tokens que ya existen (`global.css`); no se agrega ninguno.

| Elemento | Valor |
|---|---|
| Fondo de la página | `--color-page` (`#f3f5f8`) |
| Tarjetas | Blancas, radio 18 px, sombra `--shadow-card` (el lenguaje de las pantallas de trabajo del coach) |
| Campos | Alto 48 px, borde 1,5 px `--color-control-border`, radio 8 px; con error, borde `--color-pain-ink` y texto de ayuda debajo |
| Etiquetas de campo | Inter 600, 0,85 rem; «(opcional)» en peso 400 y `--color-ink-secondary` |
| Chips de grupo e implementos | Alto 40 px, radio completo; elegido `--color-ink` lleno con texto blanco; «Peso corporal» con borde punteado y separado por una línea de 1 px |
| Etiquetas de implementos | Fondo `--color-blue-tint`, texto `--color-blue`, 12,5 px en negrita, radio completo |
| Botón primario | `--color-blue`, hover `--color-blue-hover`, alto 44 px, radio completo, texto en sentence case |
| Botón secundario | Blanco, borde `--color-control-border` |
| Fila nueva | Fondo `--color-blue-tint` y etiqueta «Nuevo» |
| Avisos | Guardado en verde (`ok`), repetido en naranja (`warn`); errores de campo en `--color-pain-ink` |
| Tipografía | Títulos en Bricolage Grotesque; el resto en Inter |
| Sin | Subtítulos grises bajo títulos, metadatos con puntos medios, emoji, degradados |

**Accesibilidad:** los chips de grupo forman un `radiogroup`; los errores llevan `role="alert"` y el «Ejercicio guardado.» `role="status"`; el foco queda en el nombre al abrir el formulario y vuelve al botón «Nuevo ejercicio» al cerrarlo; todos los destinos táctiles miden al menos 44 px de alto.

## Datos y API (guía para construir)

- Ya existen `GET /exercises`, `POST /exercises` y `PATCH /exercises/:id/deactivate`. En la web falta `createExercise` y `deactivateExercise` en `exercisesApi.ts`.
- **Modelo:** agregar `Exercise.equipment`, una lista de un enum cerrado `Equipment` (con «Peso corporal» como valor propio y excluyente). Requiere una migración, el tipo compartido en `packages/shared` y la validación en `CreateExerciseDto`. Para la búsqueda: un ejercicio coincide si todos sus implementos están en los que marcó el coach, o es «Peso corporal».
- **Catálogo:** un script de datos (revisado a mano, con ensayo antes de aplicar) que asigne implementos a los 54 ejercicios globales.
- **Falta en la API:** detectar un nombre repetido (hoy no se valida), exigir el grupo muscular y, si se aprueba, `PATCH /exercises/:id` para corregir el nombre o la descripción sin desactivar y volver a crear.
- Al crear desde el editor de rutinas, el ejercicio nuevo se agrega a la lista del catálogo en memoria y a la rutina en una sola acción.

## Decisiones (confirmadas 2026-10-20)

1. **Grupo muscular obligatorio** al crear (hoy es opcional). Recomendado: alimenta los gráficos de carga por grupo.
2. **Editar un ejercicio propio** (corregir nombre o descripción): el diseño solo incluye crear y dejar de usar. Recomendado sumar la edición, porque sin ella un error de tipeo obliga a desactivar y volver a crear.
3. **Avisar y bloquear el nombre repetido** con el catálogo y con los propios (recomendado).
4. **Incluir el atajo «Crear» en el editor de rutinas** además de la pestaña (recomendado, es donde el coach se da cuenta de que falta).
5. **App del coach:** dejarlo fuera del alcance por ahora (recomendado) o ampliar la regla.
6. **La lista de implementos** (catorce más «Peso corporal»): confirmar que no sobra ni falta nada para tus ejercicios.
7. **Implementos obligatorios** al crear (recomendado, para que la búsqueda futura sea confiable) frente a opcionales.
8. **Cargar los implementos de los 54 ejercicios del catálogo** como parte de esta entrega (recomendado).
