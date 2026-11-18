---
type: brand
parent: "[[brand]]"
status: decided
tags: [brand, landing, copy]
created: 2026-10-03
updated: 2026-11-17
---

> Hijo de [[speech]]. Texto de la landing para **coaches**, en voz "nosotros" ([[voz-y-tono]]). Vive dentro de `apps/web`, en la ruta `/` para visitantes sin sesión (ver [[PRD-LandingContacto]]). Reescrita el 2026-10-06 tras el feedback de la fundadora: la primera versión no dejaba claro a quién le hablaba ni qué ofrecía, y los ciclos de entrenamiento no tenían protagonismo.

# Landing page

## Principios de esta versión

- **Le habla al coach desde la primera línea.** Reconoce lo que ya hace bien ("Tú diseñas el ciclo de entrenamiento") y dice qué le suma ("Cycles te cuenta cómo les fue").
- **El ciclo de entrenamiento es el centro**, porque es el nombre del producto: aparece en el título, en la definición y en una sección propia ("Cada ciclo construye el siguiente").
- **La propuesta de valor se muestra como cambio en el trabajo del coach**, con funciones que la app ya tiene.
- **La oferta es acceso anticipado gratis mientras se construye.** Es un compromiso: quien deja su correo espera poder entrar.

## 1. Portada

*Actualizada el 2026-11-08 (CYC-262, CYC-263): título y definición nuevos, con el enfoque de un solo ciclo coach–atleta.*

*Actualizada el 2026-10-12: el título resume los tres pilares y la imagen principal es la plataforma del coach.*

- **Etiqueta:** "PARA" fija y una palabra que gira hacia abajo como un carrete: *coaches, personal trainers, preparadores físicos, entrenadores de equipos*. Sin fondo ni burbuja.
- **Título:** Planifica el ciclo. Recibe el feedback. Ajusta el siguiente.
- **Definición:** Cycles es la plataforma de ciclos de entrenamiento para coaches: tú los planificas en la web, tu atleta los entrena en la app y te cuenta cómo le fue, y tú ajustas el siguiente con lo que de verdad pasó.
- *(Anterior, 2026-10-12: «Potencia tus ciclos, agiliza tu planificación y mejora la comunicación con cada atleta.» Los tres pilares de la sección 1b siguen vigentes.)*
- **Botón:** Quiero acceso anticipado
- **Visual:** la **plataforma del coach** como imagen principal, en un marco de navegador que alterna cada 4,5 s entre tres vistas (**Inicio**, **Rutinas** y **Planes**), con un selector de píldoras (al elegir una, la rotación se detiene). Encima, a la derecha, el teléfono "Hoy" con la etiqueta **App del atleta**: la app del atleta es el complemento del sistema del coach. Todo sobre la cadena de proteína animada.

## 1b. Así te ayuda Cycles en cada parte de tu trabajo

Reemplaza a la sección "Qué cambia en tu trabajo" y va justo después de la portada. Tres pilares; los dos primeros son de **planificación del entrenamiento** y el tercero de **seguimiento constante**. Todo respaldado por funciones que la app ya tiene.

| Pilar | Puntos | Respaldo en la app |
|---|---|---|
| **Potencia tus ciclos** | Diseña el ciclo a la medida de cada atleta (micro, meso o macrociclo). Ajusta la carga con lo que tu atleta realmente hizo. Acepta o descarta las sugerencias de ajuste. | Planes por atleta, sugerencia de ajuste de carga |
| **Agiliza tu planificación** | Arma rutinas con el catálogo de ejercicios y asígnalas desde un solo lugar. Tu atleta las recibe en su celular. Mira la cadena de semanas de cada plan. | Editor de rutinas, catálogo, detalle del plan |
| **Mejora la comunicación** | Tu atleta registra cada serie y cuenta cómo se sintió. Ves quién necesita tu atención. Todo queda en un lugar. | Registro por serie, cierre de sesión, "Necesitan atención" |

Cierre: **No cambia cómo entrenas. Tú sigues diseñando el plan.**

## 1c. Nuestra causa (aprobada el 2026-11-17, CYC-292)

> **Aprobada por la usuaria y aplicada en `apps/web` (CYC-293).** Quedan **por confirmar** tres textos: el titular de la sección larga (T1), «equipos grandes» y «llevar su trabajo más lejos». Opción **B** de [`docs/diseno/landing-vision-global/`](../diseno/landing-vision-global/README.md), con el texto **T2** en la portada. Reemplaza la propuesta de «Por qué lo hacemos» de CYC-266 (más abajo) en lo que toca a la causa; la frase-eje pasa a cerrar la sección.

**Decisión:** la causa se ve **en los primeros segundos**, sin competir con el título. El título («Planifica el ciclo. Recibe el feedback. Ajusta el siguiente.») y el botón principal no cambian.

**En la portada (reemplaza la lista «1 Planificas en la web · 2 Tu atleta registra en la app · 3 Ves qué pasó y ajustas»**, que repite el título y la definición):

- **Etiqueta** (con el isotipo): Nuestra causa
- **Frase:** Queremos poner la ciencia del deporte al alcance de cada coach.
- **Enlace:** Por qué lo hacemos ↓ (baja a la sección siguiente)

**Sección «Por qué lo hacemos»** (nueva), **después de los tres pilares (1b)** y antes del anillo del ciclo. Fondo tinta `#1f2228`, sin capturas ni subtítulos grises:

- **Titular:** La ciencia del deporte no debería ser cosa de equipos grandes. *(Titular propuesto T1; la usuaria aprobó T2 solo para la portada: confirmar el de la sección al desarrollar.)*
- **Texto:** Hoy, las herramientas que se apoyan en ella las usan atletas profesionales con equipos enteros detrás. El coach que entrena solo con sus atletas se queda con un Excel y un chat. / Estamos construyendo Cycles para cerrar esa distancia: ponerla al alcance de coaches pequeños e independientes, para que lleven su trabajo más lejos. Es una dirección, no una promesa: recién empezamos, vamos paso a paso y el coach siempre decide.
- **Cierre:** *Que cualquier atleta que entrene en serio tenga la comprensión que hoy solo tiene la élite.* (la frase-eje; ver [[posicionamiento]]).
- **Acciones:** botón principal «Quiero acceso anticipado» y enlace «Quiero sumarme a la causa», ambos al formulario (`#contacto`).

**Llamado a la acción:** el botón principal no cambia. En el formulario se propone la línea «¿No eres coach pero quieres sumarte? Cuéntanos igual.» y cambiar el campo a «Cuéntanos quién eres y cómo trabajas».

**Brecha de acceso:** de **tamaño y recursos** (equipos grandes frente a coaches independientes), no de geografía ni de precio.

**Se mantiene:** «Hacia dónde vamos: Cada ciclo deja memoria» (7b) como el *cómo*, y el cierre «Nada se pierde entre tú y tus atletas.»

## Propuesta anterior: frase-eje y jerarquía (2026-11-10, CYC-266; la causa de arriba la reemplaza en parte)

> **No está aplicada.** Es una propuesta de diseño para que la fundadora apruebe antes de tocar `apps/web`. Mockup en `docs/diseno/landing-jerarquia-elite/propuestas.html`. Marco: [[posicionamiento]].

**Decisión que se pide:** dónde y cómo entra **«Que cualquier atleta que entrene en serio tenga la comprensión que hoy solo tiene la élite.»** en la landing, y si el título de la portada cambia.

**Recomendación (opción B):**

- **Título de la portada: se mantiene** («Planifica el ciclo. Recibe el feedback. Ajusta el siguiente.»). Un coach entiende en cinco segundos qué hace Cycles y qué haría con él; la frase-eje es un *por qué* y como título no diría qué es el producto.
- **Nueva sección «Por qué lo hacemos»**, justo después de los tres pilares (1b) y antes del anillo del ciclo. Una frase grande sobre fondo tinta `#1f2228`, con el texto de apoyo: «En la élite hay un equipo entero que entiende a cada atleta. Cycles le da esa claridad al coach que entrena solo con sus atletas.» Sin subtítulos grises.
- **«Hacia dónde vamos: Cada ciclo deja memoria»** (7b) se queda, y su etiqueta pasa a remitir a la frase: es el *cómo*.
- **Cierre de la página** sigue siendo «Nada se pierde entre tú y tus atletas.»
- **Título de la pestaña y vista previa**: no cambian (CYC-264).

**Jerarquía resultante:** 1 portada (qué) → 1b pilares (qué te cambia) → **1c por qué (nueva)** → 2 anillo → 3 semana normal → 5 teléfono → 6 capturas → 7 sesión omitida → 7b cómo vamos más lejos → 8 acceso anticipado.

**Alternativas descartadas:** (A) la frase como título: bonita, pero no dice qué es Cycles ni a quién le habla; (C) la frase bajo el título como subtítulo: compite con la definición y con las reglas de no poner líneas grises bajo los títulos.

**Reglas que siguen:** sin «gemelo digital», sin «agentes de IA», sin fechas, sin «mejora el rendimiento»; «ciencia del deporte» solo como causa (excepción de 2026-11-17, ver arriba).

## 2. Cada ciclo construye el siguiente

Anillo del ciclo (perlas de la marca y un punto que lo recorre) con cuatro pasos. Es un solo ciclo: la web del coach y la app del atleta son sus dos lados.

1. **Diseñas el ciclo.** Armas rutinas y las programas semana a semana. Tu atleta las recibe en su celular.
2. **Tu atleta lo entrena.** Registra cada serie y cierra la sesión contándote cómo se sintió.
3. **Ves qué pasó.** Cycles te marca quién necesita tu atención: dolor, cargas desajustadas, sesiones sin hacer.
4. **Ajustas y empieza el siguiente.** Cambias la carga con datos y el próximo ciclo parte de lo que de verdad pasó.

Introducción: "Cycles gira alrededor de tu ciclo de entrenamiento, sea micro, meso o macrociclo."

## 3. Lo que cambia en una semana normal

Dos columnas, **Hoy** y **Con Cycles**, con cuatro líneas cada una (Excel y WhatsApp frente a ciclo en el celular, registro de cada serie, aviso de quién necesita atención y todos los atletas en un solo lugar). Cierra con: **Nada se pierde entre tú y tus atletas.**

## 4. (retirada)

La sección "Qué cambia en tu trabajo" (cuatro resultados) la reemplazaron los tres pilares de la sección 1b.

## 5. Tu atleta lo registra en el celular

Tres maquetas del teléfono que cuentan **una sola historia, en orden**, con un dedo que toca cada elemento: (1) *Hoy*, elige continuar → (2) *Serie por serie*, sube el peso, elige repeticiones en reserva y guarda → de vuelta en *Hoy*, el progreso avanza hasta "Cerrar sesión" → (3) *Cuéntale a tu coach*, marca el esfuerzo, escribe una nota y envía. Solo el teléfono activo está nítido; los demás esperan. Son maquetas animadas, no grabaciones de la app: deben seguir coincidiendo con ella.

## 6. Todos tus atletas, en un solo lugar

Dos capturas de la web con datos ficticios, con pie: "Inicio: quién necesita tu atención" y "Un atleta: carga semanal y adherencia". Botón: Quiero acceso anticipado.

## 7. Una sesión que no se pudo hacer también cuenta

"Un día no se pudo. Pasa. En Cycles eso queda registrado, con su nota, y no se convierte en un fracaso: es un dato más para decidir cómo sigue el ciclo." Con la captura del plan donde se ve la sesión omitida y su nota.

## 7b. Hacia dónde vamos: «Cada ciclo deja memoria» (nueva, 2026-11-08)

Va después de la sección 7 y **antes** del acceso anticipado.

- **Etiqueta:** Hacia dónde vamos
- **Título:** Cada ciclo deja memoria.
- **Texto:** Cada ciclo que planificas deja el historial de cada atleta. Estamos construyendo hacia una memoria viva de cómo responde cada uno, para que Cycles pueda sugerirte ajustes. Siempre tú decides.
- **Cierre de la página:** Nada se pierde entre tú y tus atletas.

Se dice como dirección, no como función disponible. Sin «gemelo digital», sin «agentes de IA», sin fechas y sin «mejora el rendimiento».

## 8. Acceso anticipado

- **Título:** Acceso anticipado, gratis mientras lo construimos
- **Texto:** Estamos armando Cycles junto a los primeros coaches. Déjanos tu correo y cuéntanos cómo trabajas: te damos acceso y tu experiencia nos ayuda a decidir qué sigue.
- **Campos:** Correo · Cuéntanos quién eres y cuántos atletas llevas
- **Botón:** Quiero acceso anticipado
- **Aviso:** Usaremos tu correo solo para responderte.
- **Fondo:** cadena de proteína animada, detrás de una tarjeta opaca.

El formulario guarda el mensaje en la base de datos y avisa al canal privado de Slack `#cycles-early-adopters` (ver [[PRD-LandingContacto]]).

## Título de la página y vista previa al compartir (CYC-264)

- **Título de la página:** Cycles: planifica el ciclo, recibe el feedback, ajusta el siguiente
- **Descripción (meta y vista previa):** Cycles es la plataforma de ciclos de entrenamiento para coaches: tú los planificas en la web, tu atleta los entrena en la app y te cuenta cómo le fue.
- **Vista previa al compartir (Open Graph y Twitter):** título «Planifica el ciclo. Recibe el feedback. Ajusta el siguiente.» y la misma descripción. **Sin imagen de vista previa todavía** (no hay una creada; es una mejora aparte).
- Viven en `apps/web/index.html`. Como ese archivo es común a toda la web, el título de la pestaña es el mismo en todas las pantallas.

## 9. Pie

Hecho por InProgress Co. (ver [[firma]]).

## Animaciones

Todas se apagan con "reducir movimiento" y solo corren cuando están a la vista.

- **Cadena de proteína viva:** las perlas flotan y una onda de energía recorre cada hebra (portada y sección final).
- **Carrete de la etiqueta:** cambia de palabra cada 1,5 s, con el ancho ajustado.
- **Vistas del coach (portada):** cada 4,5 s pasa de Inicio a Rutinas a Planes, con fundido y una barra de avance en la píldora activa; se detiene al elegir una vista y solo corre mientras se ve.
- **Botones:** flecha, aro que late y desplazamiento al apuntar.
- **Anillo del ciclo:** un punto lo recorre cada 12 s.
- **Historia del teléfono:** ver sección 5.

## Reglas de esta página

- Sin promesas de resultados ni inteligencia artificial (ver [[mensajes]]); «ciencia del deporte» solo como causa y dirección, nunca como función de hoy; la sección «Cada ciclo deja memoria» es dirección, no promesa.
- Sin secciones de precios ni de atletas por ahora.
- Sin humor explícito: sigue pendiente de definir.
- Todo en "tú" y sin voseo.

## Pendiente

- Verificar con producto el mensaje "demostrar resultados" antes de usarlo en público (no aparece en esta versión).
- Revisar el texto con 2 o 3 coaches antes de publicar.
- Capturas de la web a mayor resolución (hoy 800 px). Las de la portada (1.400 px) y las de "Todos tus atletas, en un solo lugar" (escritorio 1.200 px, móvil 750 px, actualizadas el 2026-10-12 con el Inicio rediseñado) salen de la base de demostración con la versión actual. La captura del plan (`plan.jpg`, `m-plan.jpg`, sección de la sesión omitida) también se actualizó el 2026-10-15 con la cadena de semanas, dos sesiones omitidas y su nota. Las nueve capturas se volvieron a tomar el 2026-10-18 con el término «Ciclos» en el menú, desde la base de demostración (`apps/api/scripts/seed-demo.ts`): `plan.jpg` y `m-plan.jpg` usan el ciclo de Diego Paredes (dos sesiones omitidas) y el resto el de Matías Fuentes.
- Probar la landing en un iPhone real y en Safari (P-19).
