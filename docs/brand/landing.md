---
type: brand
parent: "[[brand]]"
status: draft
tags: [brand, landing, copy]
created: 2026-10-03
updated: 2026-10-03
---

> Hijo de [[speech]]. Texto de la landing para **coaches**, en voz "nosotros" ([[voz-y-tono]]). Vive dentro de `apps/web`, en la ruta `/` para visitantes sin sesión. El llamado a la acción es **conversar con la fundadora**, no registrarse. Imágenes: capturas reales de la app móvil; las de la web del coach quedan pendientes hasta que esas pantallas estén definidas.

# Landing page

## 1. Portada

**Título:** Nada se pierde entre tú y tu coach.

**Línea del coach:** Todos tus atletas, en un solo lugar.

**Texto:** Si eres coach, Cycles te trae de vuelta lo que pasó en cada sesión, sin que tengas que estar ahí.

**Botón:** Conversemos

**Fondo:** motivo de cadenas de proteína en `brand-blue`, detrás de tarjetas opacas (ver [[identidad-visual]]).

> El título habla a ambos lados de la relación coach-atleta. La línea del coach y el texto de abajo se dirigen al coach, que es la audiencia de esta página. "Todos tus atletas, en un solo lugar" sube a la portada por decisión de la fundadora (2026-10-03): es lo que más pesa en quien lleva varios atletas (hasta ~20) y se puede mostrar hoy en la web del coach.

## 2. La escena

**Título:** Seguro conoces esta escena

**Texto:**
Tú diseñas el plan y se lo mandas a tu atleta en un Excel.
Tu atleta entrena según cómo se siente ese día.
Después tiene que acordarse de contártelo, y a veces se le olvida.
Lo demás se resuelve por WhatsApp.

Lo que de verdad pasó en la sesión no queda guardado en ninguna parte.

Y eso, por cada atleta que llevas.

## 3. El problema real

**Título:** No es tu atleta. No eres tú.

**Texto:** El entrenamiento está repartido en pedazos: el plan en un lugar, la conversación en otro, y lo que de verdad ocurrió, en ninguno.

## 4. Cómo funciona

**Título:** Cycles junta los pedazos

Tres pasos:

| Paso | Texto | Imagen |
|---|---|---|
| 1. Armas el ciclo de entrenamiento | Diseñas rutinas y las programas semana a semana, en micro, meso o macrociclos. Tu atleta las recibe. | **Pendiente:** captura de la web del coach |
| 2. Tu atleta cuenta cómo le fue | En el celular, serie por serie, sin acordarse de nada después. | Captura de la app móvil (registro de sesión) |
| 3. Tú lo ves | Lo que hizo, cómo se sintió y qué no pudo hacer, de todos tus atletas en un solo lugar. | **Pendiente:** captura de la web del coach |

> Hasta tener las capturas de la web, los pasos 1 y 3 van solo con texto, sin imagen provisional ni ilustración inventada. Solo se muestra lo que ya funciona.

## 5. La sesión perdida es un dato

**Título:** Una sesión que no se pudo hacer también cuenta

**Texto:** Un día no se pudo. Pasa. En Cycles eso queda registrado, con su nota, y no se convierte en un fracaso: es un dato más para decidir cómo sigue el ciclo. Cada ciclo construye el siguiente.

> Hoy Cycles registra la sesión como omitida con una nota. Mostrar dónde cabe dentro de la semana es una idea de producto, no una función existente; este texto no la promete.

## 6. Construyámoslo juntos

**Título:** Todavía lo estamos construyendo

**Texto:** Queremos hacerlo junto a coaches. Más que venderte algo, queremos conversar contigo sobre cómo trabajas hoy: qué te sobra y qué te falta.

**Botón:** Conversemos

**Canal de contacto (decidido 2026-10-03):** un formulario con dos campos, el correo del coach y una breve descripción de quién es. Al enviarlo, el mensaje llega a un canal de Slack. Los dos botones "Conversemos" llevan a este formulario. Detalles técnicos y pendientes en la sección "Formulario de contacto" más abajo.

## 7. Pie

Hecho por InProgress Co. (ver [[firma]]). Enlaces a política de privacidad y términos cuando existan.

## Formulario de contacto

Campos: **correo** y **"Cuéntanos quién eres"** (texto corto). Nada más.

Texto de confianza bajo el formulario: "Usaremos tu correo solo para responderte."

Mensaje tras enviar: confirmación breve y sin dramatismo, en la voz de [[voz-y-tono]]. Si falla: explica qué pasó y qué hacer.

Notas técnicas (a decidir al implementar):
- **Endpoint público** en la API, sin sesión. Sigue las reglas de [[SEGURIDAD]]: validación con DTO (R6), límite de largo en ambos campos, límite de peticiones por IP, y un campo señuelo contra bots.
- **Slack:** reutiliza `postToSlack` (`apps/api/src/common/slack/slack.ts`) con un **tercer webhook propio** (variable nueva, secreto según R1), a un canal privado distinto de los de seguridad y actividad. A diferencia del canal de actividad, aquí el correo va **completo**, porque la fundadora necesita poder responder.
- **Texto que llega a Slack:** hay que neutralizar menciones (`@channel`, `<!here>`) y marcado, porque lo escribe un desconocido.
- **Si Slack falla** el mensaje no puede perderse (R9): guardarlo en la base de datos y avisar a Slack después, o devolver un error claro al coach.
- **La política de seguridad de la web** ya permite llamar a la API (`connect-src`), así que no hace falta cambiarla.
- **Privacidad:** se recogen datos de personas que no son usuarias. Necesita el aviso de arriba y conectar con la política de privacidad pendiente del plan de deploy.

## Reglas de esta página

- Sin promesas de resultados, ciencia del deporte ni inteligencia artificial (ver [[mensajes]]).
- Sin secciones de precios ni de atletas por ahora.
- Sin humor explícito: sigue pendiente de definir.
- Todo en "tú" y sin voseo.

## Pendiente

- Canal privado `cycles-early-adopters` creado (2026-10-03). Falta su webhook, que va como `SLACK_CONTACT_WEBHOOK_URL` en Render; es un secreto, no pegarlo en el chat ni en el repo.
- Decidido: los mensajes también se guardan en la base de datos (tabla `ContactRequest`). Endpoint `POST /contact` implementado en la API con filtros anti-bots; falta el formulario en la web.
- Capturas de la app móvil para el paso 2 (cuando el otro chat tenga estable la pantalla de registro).
- Capturas de la web del coach para los pasos 1 y 3 (cuando esas pantallas estén definidas).
- Revisar el texto con 2 o 3 coaches antes de publicar.
- Implementación en `apps/web`: ruta pública, redirección de quien ya tiene sesión, estilos con los tokens existentes.
