# Correo de invitación y onboarding inicial (CYC-295)

Solo diseño, sin código ni migraciones. Parte de `origin/main` (c607b17). Maqueta en [correo.html](correo.html) y capturas en `capturas/`.

**Estado:** correo, versión de texto, textos de la página de inicio y pantalla de enlace que no sirve: **aprobados por la usuaria (26-11)**. El primer registro propuesto **no se aprobó** y lo reemplaza [registro.md](registro.md), **aprobado el 26-11**. El onboarding del atleta sigue postergado.

## Cambios posteriores (26-11), pendientes de aprobación

- [Invitaciones en admin](admin-invitaciones.md): lista con un botón para enviar cada invitación, cola para lo que supere las 15 diarias y registro de hasta 12 meses. **Falta confirmar** si el clic reemplaza el envío automático (puntos 1 y 3 de abajo) y cambia la confirmación y el aviso de la página.
- [Encuesta para coaches actuales](encuesta-coaches.md).

## Decidido por la usuaria (26-11)

1. Todos los que dejan su correo reciben la misma carta con el enlace. Sin personalizar por ahora.
2. Remitente `Cycles <hola@mail.getcycles.app>`. Firma «Cycles».
3. Se envía automáticamente. Enlace personal, de un solo uso, vence en 7 días. Una invitación por correo. Máximo 15 al día.
4. Sin segunda verificación: el enlace prueba el correo y la persona entra directo a Cycles.
5. En el registro puede elegir coach o atleta, con coach marcado.

## Textos

| Pieza | Texto |
|---|---|
| Asunto | Tu invitación a Cycles |
| Vista previa | Crea tu cuenta. El enlace es personal y dura 7 días. |
| Botón | Crear mi cuenta |
| Aviso bajo el botón | El enlace es personal, sirve una sola vez y vence en 7 días. Si no dejaste tu correo en getcycles.app, ignora este mensaje: no se crea ninguna cuenta. |
| Confirmación en la página | Recibido. Tu invitación a Cycles va a tu correo. Si no la ves, revisa el spam o escríbenos a hola@getcycles.app. |
| Aviso del formulario | Usaremos tu correo para enviarte tu invitación a Cycles y para responderte. Más en la política de privacidad. |
| Enlace que no sirve | Esta invitación ya no sirve. Las invitaciones duran 7 días y sirven una sola vez. Si ya creaste tu cuenta, inicia sesión. Si no, escríbenos a hola@getcycles.app y te ayudamos. |

La carta completa está en la maqueta, con su versión de texto plano. No usa el nombre ni nada de lo que la persona escribió en el formulario.

## Estilo

- El correo conserva el motivo de proteína, con radios de 6 px, botón rectangular y sin negritas pesadas en el botón. Los demás correos siguen con el estilo anterior; cambiarlos no es parte de este diseño.
- La página de inicio es una pantalla existente y se muestra como está. Cambian dos textos; el formulario no suma campos.

## Para la construcción

- `MAIL_REPLY_TO` debe apuntar a `hola@getcycles.app` (tiene regla de reenvío). **No verificado** qué valor tiene en producción; revisar también el efecto en los demás correos.
- La confirmación es la misma en todos los casos: no revela si el correo ya tenía invitación o cuenta.
- **Tope diario (decidido):** lo que supere las 15 diarias queda en cola y sale solo en los días siguientes. Ver [admin-invitaciones.md](admin-invitaciones.md).
- Enlace vencido, usado o inválido: una sola pantalla. Hoy `/register` sin código redirige al inicio de sesión.
- Registro con invitación: ver [registro.md](registro.md). Sin pantalla «Revisa tu email», sin botón de Google, y con la sesión iniciada al crear la cuenta.
- Guardar invitaciones requiere cambio en la base (tabla propuesta en CYC-295), con diagrama, respaldo y «apruebo» antes de migrar.
- `/privacidad`, bloque «Formulario de contacto»: «Para qué» debe decir que enviamos una invitación para crear la cuenta; «Qué» debe sumar la fecha y el estado del envío y si se usó. Sumar las invitaciones de acceso al bloque de correos enviados con Resend.

## Por decidir

- Si el clic en admin reemplaza el envío automático.
- Qué pasa con una invitación vencida.

Resuelto el 26-11: a quienes escribieron antes no se les envía nada automático (se invitan desde admin) y el registro de la invitación se guarda hasta 12 meses, con una invitación por correo en ese plazo.

## Novedad

No lleva ficha: lo ven personas que aún no tienen cuenta.
