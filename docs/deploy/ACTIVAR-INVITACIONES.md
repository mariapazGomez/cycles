# Activar las invitaciones (CYC-295)

Pasos de la usuaria, en orden. Aquí van solo **nombres** de variables: nunca valores, claves ni enlaces de invitación (regla del proyecto). Las variables de la API se ponen en Render; cada cambio vuelve a desplegarla.

## Antes de encender nada
1. **Revisión legal** de `/privacidad` y `/terminos` 1.6 (lista en `PRD-PrivacidadYTerminos` §9), o decidir publicar sin ella. Ajustar la fecha del encabezado al día de publicación.
   *Comprobar:* el texto final está en el PR antes de mezclar.
2. **Que `hola@getcycles.app` reciba correo.** Escribe desde otra cuenta a esa dirección.
   *Comprobar:* te llega. La invitación pide responder ahí. También `privacidad@getcycles.app`.
3. **Mezclar los PR**, en el orden que indiquen, con respaldo si alguno trae migración (los de este paso no traen).
   *Comprobar:* Render y Vercel con despliegue correcto; `https://api.getcycles.app/health` responde; `/privacidad` y `/terminos` dicen versión 1.6.
4. **Aceptar la 1.6** con tu cuenta en la web. Todas las cuentas, también las de demostración, verán «Antes de seguir».
   *Comprobar:* entras después de aceptar. En un iPhone con la app instalada, abrirla, ver «Antes de seguir (versión 1.6)» y entrar.
5. **`CONTACT_NOTICE_SINCE`** en Render: la fecha y hora en que quedó publicado el aviso nuevo, con zona (formato `AAAA-MM-DDTHH:MM:SS-03:00`).
   *Comprobar:* la API despliega. En admin → Invitaciones, quien escribió antes tiene la nota «Escribió antes del aviso nuevo». La página muestra los textos nuevos.

## Revisar el correo
6. **`FRONTEND_URL`** debe ser la dirección de la web (`https://app.getcycles.app`): con ella se arma el enlace.
7. **`RESEND_API_KEY`** y **`MAIL_FROM`** ya se usan para los demás correos. En Resend, revisa que el dominio esté verificado y que el **seguimiento de clics esté apagado**: si está encendido, reescribe el enlace y el token pasa por su redirección.
8. **`MAIL_REPLY_TO`**: la invitación no lo usa (siempre responde a `hola@getcycles.app`). Sí lo usan los demás correos, incluido el de Android. Si quieres que todas las respuestas lleguen al mismo buzón, ponlo en `hola@getcycles.app`.
9. **Si habrá atletas con iPhone:** las cuatro variables de TestFlight (`APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_PRIVATE_KEY`, `TESTFLIGHT_GROUP_ID`). Sin ellas, su invitación a TestFlight queda pendiente en admin y se envía a mano.

## Encender
10. **`INVITATIONS_CRON_SECRET`**: genera uno propio de 64 caracteres o más y guárdalo en tu gestor de contraseñas.
11. **`INVITATIONS_ENABLED`** = `true`.
    *Comprobar:* en admin → Invitaciones desaparece el aviso «El envío de invitaciones todavía no está activado».
12. **Programador externo (cron-job.org):** una tarea `POST` a `https://api.getcycles.app/internal/invitations/run-queue` con el encabezado `Authorization: Bearer` seguido del secreto, cada 10 a 30 minutos entre las 10:00 y las 20:00 de Chile. Despierta la API y envía la cola.
    *Comprobar:* la ejecución responde 200 con tres cantidades; sin el encabezado responde 401.

## Prueba real (solo con un correo tuyo)
13. Desde la página, deja un mensaje con un correo tuyo **que no tenga cuenta**. En admin, envía la invitación a ese correo.
    *Comprobar:* llega «Tu invitación a Cycles» (revisa spam), el enlace empieza con la dirección de la web, y «Responder» va a `hola@getcycles.app`.
14. Abre el enlace en una **ventana privada**: si tienes otra sesión abierta, el enlace te lleva a esa cuenta sin avisar. Crea la cuenta y responde las preguntas.
    *Comprobar:* entras sin verificar el correo aparte; admin muestra «Cuenta creada» y las respuestas en el detalle del coach.
15. Abre el mismo enlace otra vez en otra ventana privada.
    *Comprobar:* «Esta invitación ya no sirve».
16. Si quieres, elimina la cuenta de prueba desde «Mi cuenta».

## Aparte (no hace falta para invitar)
- **`COACH_SURVEY_ENABLED`** = `true` hace que los coaches que ya tienen cuenta respondan la encuesta al entrar a la web. Es obligatoria: enciéndela cuando quieras pedírsela.
- **No encender `EMAIL_HISTORY_ENABLED`**: falta publicar qué se conserva (otra versión de la política), el texto en «Mi cuenta» y una versión nueva de la app.

## Para apagar
`INVITATIONS_ENABLED` = `false`: no sale ningún correo más, la cola queda en espera y los enlaces ya enviados siguen sirviendo hasta que vencen.
