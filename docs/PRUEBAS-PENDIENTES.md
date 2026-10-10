---
type: reference
tags: [pruebas, qa]
status: vigente
created: 2026-09-26
updated: 2026-10-10
---

# Pruebas pendientes

> Registro de las pruebas manuales que quedaron sin hacer o a medias. No hay tests automáticos todavía: eso llega con la tanda 2 de [`docs/PLAN-Seguridad.md`](PLAN-Seguridad.md), 2C. Cada fila dice qué probar, cómo, quién la hace y de qué depende.
>
> **Cómo se usa:** al cerrar un PR o una fase, las pruebas que quedaron sin hacer se agregan aquí (ver [[PRD-General]] §10.1). Cuando una se hace, se marca como hecha con la fecha y el resultado, o se mueve a un issue si falló.

**Quién:** *Usuaria* = requiere tu cuenta, tu email o tu celular. *Claude* = se puede hacer desde la terminal o el navegador integrado.

## Pendientes

| # | Qué probar | Cómo | Quién | Depende de | Origen |
|---|---|---|---|---|---|
| P-06 | **Botones −15 s / +15 s del descanso** | En el registro por serie, durante un descanso: tocar +15 s y ver que el total sube a 1:45 (con 1:30 de base), y −15 s para volver a 1:30. La prueba anterior los ejecutó sin error, pero no verificó el total en pantalla. | Claude | — | PR #4 (descanso entre series) |
| P-07 | **Descanso con la pantalla bloqueada en un celular real** | Registrar una serie, bloquear el celular 30 s y desbloquear: la cuenta debe seguir exacta. Ver si vibra al terminar (Android sí, iPhone no desde la web). | Usuaria | — | PR #4 |
| P-08 | **"Mis planes" de un atleta sin planes, con datos reales** | Con un atleta recién invitado y sin planes asignados, ver el mensaje "Todavía no tienes planes…". Hoy solo se probó simulando la respuesta en el navegador. | Usuaria o Claude | P-01 (sirve el atleta recién creado) | PR #8 (issue #7) |
| P-14 | **Constructor de rutinas con la API real** | En `app.getcycles.app/routines`: crear una rutina, editarla (cambiar orden, duplicar, quitar) y borrarla. Revisar que borrar una rutina ya asignada a un plan no rompe las sesiones (el PRD dice `SetNull`). Revisar la barra de guardado en el celular. | Usuaria | — | PR #30 |
| P-15 | **Página en blanco tras el merge del #30** | La usuaria vio la web en blanco justo tras el merge. No se pudo reproducir: en local, con datos del mismo formato que la API real, lista, edición, nueva rutina e inicio cargan sin errores, y el login de producción carga bien. Probable pestaña con la versión anterior en caché. Probar un refresco forzado; si se repite, anotar la ruta y el error de la consola. | Usuaria | — | PR #30 |
| P-16 | **Pantallas de autenticación e inicio rediseñados, en producción** | Revisar a mano `/login`, `/register`, `/forgot-password`, un enlace inválido (`/reset-password?token=x`) y el inicio del coach y del atleta, en escritorio y celular. | Usuaria | — | PR #28 y #29 |
| P-17 | **Formulario de la landing en producción** | En `app.getcycles.app` sin sesión: enviar el formulario y ver que llega a `#cycles-early-adopters` (con el correo completo y el texto escapado) y que queda una fila en `ContactRequest`. Borrar la fila de prueba. Enviar otra vez con el mismo correo: debe responder igual y no duplicar. **Avance (2026-10-10):** el aviso llega con el correo completo, repetir el mismo correo no duplica y las filas de prueba se borraron. El primer envío no avisó porque `SLACK_CONTACT_WEBHOOK_URL` no estaba cargada en Render (el mensaje solo quedó en el log); ya está cargada. **Falta** comprobar en producción que el texto se escapa (`<!channel>`, `<@U123>`), una vez desplegado T-130. | Usuaria | Deploy del PR de la landing y el webhook cargado en Render | Landing 2026-10-03 |
| P-18 | **Límite por IP del formulario con la IP real** | Desde producción, enviar 4 veces seguidas: el cuarto debe dar 429 ("Hiciste demasiados intentos…"). Comprueba que `CLIENT_IP_HEADER` sirve también para `/contact`. **Visto (2026-10-10):** el cuarto envío seguido dio "demasiadas solicitudes"; se repite con el límite nuevo (T-009). | Claude | P-17 | Landing 2026-10-03 |
| P-19 | **Landing en un celular real y en Safari** | Ver la landing en un iPhone: que las maquetas del teléfono, los botones animados y el formulario se vean y funcionen. Hoy solo se probó en el navegador integrado (escritorio y 375 px). | Usuaria | Deploy | Landing 2026-10-03 |
| P-20 | **La API ya no se duerme** | Más de 15 minutos después de crear el monitor de cron-job.org, medir `curl -w "%{time_total}" https://api.getcycles.app/health`: debe dar menos de 2 s. Si da ~50 s, el monitor no está funcionando. | Claude | Monitor creado (PLAN-Deploy 3.10) | Arranque en frío 2026-10-06 |
| P-10 | **Registro de sesión completo en un celular real** | Como atleta, desde el navegador del celular: empezar una sesión, registrar series con los botones −/+, responder las reps en reserva, descansar y cerrar la sesión. | Usuaria | — | PR #4 |

## Hechas

| # | Qué | Fecha | Resultado |
|---|---|---|---|
| — | P-01 · Aceptar la invitación desde el email real | 2026-10-01 | OK, confirmado por la usuaria (sin detalle de bandeja o spam) |
| — | P-02 · Email de verificación de registro | 2026-10-01 | OK, confirmado por la usuaria |
| — | P-04 · Cómo se ven los emails (invitación y verificación, con el diseño nuevo) | 2026-10-01 | OK, confirmado por la usuaria. El correo de recuperación de contraseña no llega (P-03), así que ese no se pudo revisar |
| — | P-13 · Avisos de actividad y resumen diario en producción: resumen programado sin duplicados desde el 29-09 (verificado en las ejecuciones de GitHub) y avisos de actividad en `#cycles-actividad` | 2026-10-01 | OK, confirmado por la usuaria |
| — | Rediseño de los correos: la usuaria envió una invitación de prueba con el diseño nuevo y confirmó que se ve bien (el cliente de correo no quedó anotado; la comparación en Gmail web, Gmail móvil y Apple Mail sigue en P-04) | 2026-10-01 | OK |
| — | P-05 · DMARC publicado: `dig TXT _dmarc.getcycles.app` devuelve `v=DMARC1; p=none;` | 2026-10-01 | OK |
| — | Imágenes de los correos servidas desde `app.getcycles.app/email/` (logo y fondo de proteína) | 2026-10-01 | OK: responden 200 con `image/png` |
| — | Primer envío real de una invitación desde `hola@mail.getcycles.app` | 2026-09-26 | Llegó, sin errores en el log |
| — | Avisos de actividad en local (log): los cinco eventos una sola vez cada uno, sin dolor ni cargas; resumen con totales correctos; endpoint 401/400/404; no duplica el resumen con un Slack falso; Chile con cambio de horario (días de 23 y 25 h) | 2026-09-28 | Todo como se esperaba |
| — | Avisos de actividad a `#cycles-actividad` con el webhook real: un aviso de ejemplo (coach nuevo) y el resumen de un día | 2026-09-28 | Llegaron los dos, con el formato esperado y el email oculto |
| — | P-11 · Límite de intentos en Render: 429 al sexto login con el mismo email; con IPs inventadas en `X-Forwarded-For` y `True-Client-IP`, el límite por IP igual bloquea al sexto pedido (después de corregir S-13) | 2026-09-28 | OK |
| — | P-12 · Alerta de seguridad desde producción con la IP real: `152.231.117.33` (antes de corregir S-13 mostraba `10.31.18.12`, un proxy interno) | 2026-09-28 | OK |
| — | Workflow del resumen diario ejecutado a mano dos veces contra producción: `sent: true` y luego `sent: false` | 2026-09-28 | OK: llegó un solo resumen a `#cycles-actividad`, con los totales en 0 (base de producción vacía) |
| — | P-09 · Login con Google en producción (`app.getcycles.app`, cliente OAuth en modo *Testing*, con tu cuenta como usuario de prueba): entró, completó el perfil como coach con el consentimiento de datos y llegó a la app | 2026-09-29 | OK |
| — | P-03 · Email de recuperación de contraseña (falló el 2026-10-01: el correo no llegaba) | 2026-10-10 | OK, confirmado por la usuaria: el correo llega y el flujo funciona. La causa del fallo del 1 de octubre no quedó identificada |
