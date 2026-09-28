---
type: reference
tags: [pruebas, qa]
status: vigente
created: 2026-09-26
updated: 2026-09-26
---

# Pruebas pendientes

> Registro de las pruebas manuales que quedaron sin hacer o a medias. No hay tests automáticos todavía: eso llega con la tanda 2 de [`docs/PLAN-Seguridad.md`](PLAN-Seguridad.md), 2C. Cada fila dice qué probar, cómo, quién la hace y de qué depende.
>
> **Cómo se usa:** al cerrar un PR o una fase, las pruebas que quedaron sin hacer se agregan aquí (ver [[PRD-General]] §10.1). Cuando una se hace, se marca como hecha con la fecha y el resultado, o se mueve a un issue si falló.

**Quién:** *Usuaria* = requiere tu cuenta, tu email o tu celular. *Claude* = se puede hacer desde la terminal o el navegador integrado.

## Pendientes

| # | Qué probar | Cómo | Quién | Depende de | Origen |
|---|---|---|---|---|---|
| P-01 | **Aceptar la invitación desde el email real** | Tocar "Crear mi cuenta" en el email que llegó a `gomezgomariapaz@gmail.com`, definir una contraseña y entrar como atleta. Ver si llegó a la bandeja de entrada o a spam. | Usuaria | — | PR #6 (Resend) |
| P-02 | **Email de verificación de registro** | Registrarse como coach en `/register` con un email propio, recibir "Confirma tu email para entrar a Cycles" y confirmar con el enlace. | Usuaria | — | PR #6 |
| P-03 | **Email de recuperación de contraseña** | En `/forgot-password`, con una cuenta que tenga contraseña: recibir el email, cambiar la contraseña y verificar que las otras sesiones se cierran. | Usuaria | — | PR #6 |
| P-04 | **Cómo se ven los emails** | Abrir los tres emails en Gmail web, Gmail en el celular y Apple Mail. Revisar el botón, el enlace escrito, los colores y la versión de texto plano. | Usuaria | P-01 a P-03 | Plan de deploy §1.6 |
| P-05 | **DMARC publicado** | Cargar el TXT `_dmarc` (`v=DMARC1; p=none;`) en Cloudflare y confirmar con `dig TXT _dmarc.getcycles.app`. | Usuaria carga, Claude verifica | — | Plan de deploy §1.3 |
| P-06 | **Botones −15 s / +15 s del descanso** | En el registro por serie, durante un descanso: tocar +15 s y ver que el total sube a 1:45 (con 1:30 de base), y −15 s para volver a 1:30. La prueba anterior los ejecutó sin error, pero no verificó el total en pantalla. | Claude | — | PR #4 (descanso entre series) |
| P-07 | **Descanso con la pantalla bloqueada en un celular real** | Registrar una serie, bloquear el celular 30 s y desbloquear: la cuenta debe seguir exacta. Ver si vibra al terminar (Android sí, iPhone no desde la web). | Usuaria | — | PR #4 |
| P-08 | **"Mis planes" de un atleta sin planes, con datos reales** | Con un atleta recién invitado y sin planes asignados, ver el mensaje "Todavía no tienes planes…". Hoy solo se probó simulando la respuesta en el navegador. | Usuaria o Claude | P-01 (sirve el atleta recién creado) | PR #8 (issue #7) |
| P-09 | **Login con Google** | Entrar con "Continuar con Google" y verificar que termina en la app. Hoy da error 500 porque faltan las credenciales. Verificar además que la URL de `/oauth-callback` solo trae `?code=` (nunca tokens), que al terminar la URL queda limpia y que volver atrás al callback muestra el error en vez de iniciar sesión otra vez. | Claude | Plan de deploy, paso 5 (credenciales de Google) | Auditoría (S-02) |
| P-13 | **Avisos de actividad y resumen diario en producción** | Con la API en Render: recorrer registro de coach → invitación → atleta acepta → primer plan → primera sesión y ver los cinco avisos en `#cycles-actividad`. Al día siguiente, ver que el resumen llega una vez a las 8:00 de Chile con los totales correctos (y correr el workflow a mano desde GitHub una vez para confirmar que no duplica). | Claude, con la usuaria mirando el canal | Plan de deploy, pasos 3 y 8.4 (webhook, secreto en Render y GitHub) | Avisos de actividad (paso 8) |
| P-12 | **Alertas de seguridad en Slack real** | Con `SLACK_SECURITY_WEBHOOK_URL` configurada: forzar una alerta (por ejemplo, 12 logins fallidos con emails distintos) y ver que llega **un** mensaje a `#cycles-seguridad`, con el email oculto (`lu***@…`) y sin tokens. Repetir en Render detrás del proxy: la IP de la alerta debe ser la real. | Usuaria crea el webhook; Claude prueba | Crear el canal y el webhook de Slack | PR 1E de seguridad |
| P-11 | **Límite de intentos detrás del proxy de Render** | Con la API en Render y `TRUST_PROXY=1`: seis logins fallidos seguidos con el mismo email dan 429 al sexto, y desde otra red se puede seguir entrando. Confirma que se toma la IP real y no la del proxy. | Claude | Plan de deploy, paso 3 | PR 1B de seguridad |
| P-10 | **Registro de sesión completo en un celular real** | Como atleta, desde el navegador del celular: empezar una sesión, registrar series con los botones −/+, responder las reps en reserva, descansar y cerrar la sesión. | Usuaria | — | PR #4 |

## Hechas

| # | Qué | Fecha | Resultado |
|---|---|---|---|
| — | Primer envío real de una invitación desde `hola@mail.getcycles.app` | 2026-09-26 | Llegó, sin errores en el log |
| — | Avisos de actividad en local (log): los cinco eventos una sola vez cada uno, sin dolor ni cargas; resumen con totales correctos; endpoint 401/400/404; no duplica el resumen con un Slack falso; Chile con cambio de horario (días de 23 y 25 h) | 2026-09-28 | Todo como se esperaba |
| — | Avisos de actividad a `#cycles-actividad` con el webhook real: un aviso de ejemplo (coach nuevo) y el resumen de un día | 2026-09-28 | Llegaron los dos, con el formato esperado y el email oculto |
