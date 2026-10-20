# Acceso de los coaches del piloto

Durante la fase de early adopters el **registro está cerrado al público** (`REGISTRATION_OPEN` y `VITE_REGISTRATION_OPEN` en `false`, issue 3 de [`ISSUES.md`](../ISSUES.md)). Los coaches del piloto entran con un **enlace privado con un código de acceso**: se registran ellos mismos, con su consentimiento y la verificación de su email, sin abrir el registro a nadie más.

## Cómo darle acceso a un coach

1. **Crea el código** (una sola vez; sirve para todo el piloto):
   ```bash
   openssl rand -base64 18 | tr -d '/+='
   ```
   Guárdalo en el gestor de contraseñas. Debe tener al menos 16 caracteres.
2. **Cárgalo en Render:** servicio `cycles-api` → *Environment* → `PILOT_ACCESS_CODE` = el código. Render reinicia la API (1 o 2 minutos).
3. **Arma el enlace** y mándaselo a cada coach por un canal privado:
   ```
   https://app.getcycles.app/register?codigo=<EL_CODIGO>
   ```
4. El coach abre el enlace (el código desaparece de la barra de direcciones), completa el formulario y verifica su email.
5. **Confirma** que llegó el aviso *Nuevo coach* a `#cycles-actividad`.

## Cómo quitar el acceso

- **Para todos los enlaces:** borra `PILOT_ACCESS_CODE` en Render (o cámbialo por otro código y reenvía el enlace nuevo). Los enlaces viejos responden «El código de acceso no es válido».
- Las cuentas ya creadas no se ven afectadas.

## Qué cubre y qué no

| | |
|---|---|
| Registro con email y contraseña | **Sí**, con el enlace |
| Google | No: no crea cuentas nuevas mientras el registro esté cerrado. Quien ya tiene cuenta puede entrar con Google con el mismo email |
| Atletas | No cambia: siguen entrando solo por invitación de su coach |
| Sin el enlace | `/register` redirige al login y la API responde 403 |

## Cuidados

- El código es un secreto compartido: mándalo por un canal privado, no lo pegues en canales abiertos ni en la landing.
- El registro tiene límite de intentos (5 por hora por IP) y el código es largo, así que no se puede adivinar.
- Si un coach reenvía el enlace a otra persona, esa persona también podrá registrarse. Si pasa, cambia el código.
- Para abrir el registro a todo el público (fin del piloto), ver el issue 3: `REGISTRATION_OPEN=true` en Render y `VITE_REGISTRATION_OPEN=true` en Vercel.
