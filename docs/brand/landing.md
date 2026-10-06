---
type: brand
parent: "[[brand]]"
status: decided
tags: [brand, landing, copy]
created: 2026-10-03
updated: 2026-10-06
---

> Hijo de [[speech]]. Texto de la landing para **coaches**, en voz "nosotros" ([[voz-y-tono]]). Vive dentro de `apps/web`, en la ruta `/` para visitantes sin sesión (ver [[PRD-LandingContacto]]). Reescrita el 2026-10-06 tras el feedback de la fundadora: la primera versión no dejaba claro a quién le hablaba ni qué ofrecía, y los ciclos de entrenamiento no tenían protagonismo.

# Landing page

## Principios de esta versión

- **Le habla al coach desde la primera línea.** Reconoce lo que ya hace bien ("Tú diseñas el ciclo de entrenamiento") y dice qué le suma ("Cycles te cuenta cómo les fue").
- **El ciclo de entrenamiento es el centro**, porque es el nombre del producto: aparece en el título, en la definición y en una sección propia ("Cada ciclo construye el siguiente").
- **La propuesta de valor se muestra como cambio en el trabajo del coach**, con funciones que la app ya tiene.
- **La oferta es acceso anticipado gratis mientras se construye.** Es un compromiso: quien deja su correo espera poder entrar.

## 1. Portada

- **Etiqueta:** "PARA" fija y una palabra que gira hacia abajo como un carrete: *coaches, personal trainers, preparadores físicos, entrenadores de equipos*. Sin fondo ni burbuja.
- **Título:** Tú diseñas el ciclo de entrenamiento. Cycles te cuenta cómo les fue.
- **Línea azul:** Todos tus atletas en un solo lugar, sin perseguir mensajes.
- **Definición:** Cycles es la plataforma de ciclos de entrenamiento: armas el ciclo, tu atleta lo registra desde el celular y tú ves quién necesita tu atención.
- **Botón:** Quiero acceso anticipado
- **Visual:** pantalla "Hoy" de la app móvil sobre la cadena de proteína animada.

## 2. Cada ciclo construye el siguiente

Anillo del ciclo (perlas de la marca y un punto que lo recorre) con cuatro pasos:

1. **Diseñas el ciclo.** Armas rutinas y las programas semana a semana. Tu atleta las recibe en su celular.
2. **Tu atleta lo entrena.** Registra cada serie y cierra la sesión contándote cómo se sintió.
3. **Ves qué pasó.** Cycles te marca quién necesita tu atención: dolor, cargas desajustadas, sesiones sin hacer.
4. **Ajustas y empieza el siguiente.** Cambias la carga con datos y el próximo ciclo parte de lo que de verdad pasó.

Introducción: "Cycles gira alrededor de tu ciclo de entrenamiento, sea micro, meso o macrociclo."

## 3. Lo que cambia en una semana normal

Dos columnas, **Hoy** y **Con Cycles**, con cuatro líneas cada una (Excel y WhatsApp frente a ciclo en el celular, registro de cada serie, aviso de quién necesita atención y todos los atletas en un solo lugar). Cierra con: **Nada se pierde entre tú y tus atletas.**

## 4. Qué cambia en tu trabajo

Cuatro resultados, todos respaldados por funciones que la app ya tiene:

| Resultado | Respaldo en la app |
|---|---|
| **Ves qué pasó sin preguntar** | Registro por serie y cierre de sesión |
| **Sabes a quién mirar primero** | "Necesitan atención": dolor, carga alta o baja, adherencia |
| **Ajustas el ciclo con datos** | Sugerencia de ajuste de carga que el coach acepta o descarta |
| **Recuperas tiempo** | Todos los atletas en un solo lugar |

Cierre: **No cambia cómo entrenas. Tú sigues diseñando el plan.**

## 5. Tu atleta lo registra en el celular

Tres maquetas del teléfono que cuentan **una sola historia, en orden**, con un dedo que toca cada elemento: (1) *Hoy*, elige continuar → (2) *Serie por serie*, sube el peso, elige repeticiones en reserva y guarda → de vuelta en *Hoy*, el progreso avanza hasta "Cerrar sesión" → (3) *Cuéntale a tu coach*, marca el esfuerzo, escribe una nota y envía. Solo el teléfono activo está nítido; los demás esperan. Son maquetas animadas, no grabaciones de la app: deben seguir coincidiendo con ella.

## 6. Todos tus atletas, en un solo lugar

Dos capturas de la web con datos ficticios, con pie: "Inicio: quién necesita tu atención" y "Un atleta: carga semanal y adherencia". Botón: Quiero acceso anticipado.

## 7. Una sesión que no se pudo hacer también cuenta

"Un día no se pudo. Pasa. En Cycles eso queda registrado, con su nota, y no se convierte en un fracaso: es un dato más para decidir cómo sigue el ciclo." Con la captura del plan donde se ve la sesión omitida y su nota.

## 8. Acceso anticipado

- **Título:** Acceso anticipado, gratis mientras lo construimos
- **Texto:** Estamos armando Cycles junto a los primeros coaches. Déjanos tu correo y cuéntanos cómo trabajas: te damos acceso y tu experiencia nos ayuda a decidir qué sigue.
- **Campos:** Correo · Cuéntanos quién eres y cuántos atletas llevas
- **Botón:** Quiero acceso anticipado
- **Aviso:** Usaremos tu correo solo para responderte.
- **Fondo:** cadena de proteína animada, detrás de una tarjeta opaca.

El formulario guarda el mensaje en la base de datos y avisa al canal privado de Slack `#cycles-early-adopters` (ver [[PRD-LandingContacto]]).

## 9. Pie

Hecho por InProgress Co. (ver [[firma]]).

## Animaciones

Todas se apagan con "reducir movimiento" y solo corren cuando están a la vista.

- **Cadena de proteína viva:** las perlas flotan y una onda de energía recorre cada hebra (portada y sección final).
- **Carrete de la etiqueta:** cambia de palabra cada 1,5 s, con el ancho ajustado.
- **Botones:** flecha, aro que late y desplazamiento al apuntar.
- **Anillo del ciclo:** un punto lo recorre cada 12 s.
- **Historia del teléfono:** ver sección 5.

## Reglas de esta página

- Sin promesas de resultados, ciencia del deporte ni inteligencia artificial (ver [[mensajes]]).
- Sin secciones de precios ni de atletas por ahora.
- Sin humor explícito: sigue pendiente de definir.
- Todo en "tú" y sin voseo.

## Pendiente

- Verificar con producto el mensaje "demostrar resultados" antes de usarlo en público (no aparece en esta versión).
- Revisar el texto con 2 o 3 coaches antes de publicar.
- Capturas de la web a mayor resolución (hoy 800 px).
- Probar la landing en un iPhone real y en Safari (P-19).
