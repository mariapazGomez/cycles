# Portal del equipo de Cycles (CYC-193)

Portal independiente, solo para el equipo de desarrollo, en **`admin.getcycles.app`**. Sin login propio: lo protege **Cloudflare Access** y la API vuelve a validar el token en cada petición. Diseño: [`docs/diseno/panel-admin`](../diseno/panel-admin/README.md). Este documento cubre la API (PR 1) y lo que debe configurarse en Cloudflare, Vercel y Render; el portal en sí (`apps/admin`) llega en el PR 2.

## Cómo está protegido

1. **Cloudflare Access** pide autenticarse antes de que cualquier petición llegue al portal. La lista de quién entra vive en la política de Access (nunca en el código, el repo ni Linear).
2. **La API valida el token** (`Cf-Access-Jwt-Assertion`) en **cada** ruta `/admin/*`: firma contra las claves públicas del equipo (`https://<equipo>.cloudflareaccess.com/cdn-cgi/access/certs`), emisor, audiencia (`CF_ACCESS_AUD`), algoritmo RS256 y vencimiento. Sin token válido responde **401**, aunque alguien llegue directo a `api.getcycles.app`. Un token de la app no sirve. Los tokens de máquina (sin correo) tampoco.
3. **Sin configuración, cerrado:** si faltan `CF_ACCESS_TEAM_DOMAIN` o `CF_ACCESS_AUD`, todas las rutas `/admin/*` responden 401.
4. **Lo mínimo de cada cuenta:** nombre, correo, rol, fechas, verificación, política y último ingreso. Nunca contraseñas, tokens ni datos de entrenamiento o salud.
5. **Registro de consultas:** cada consulta de cuentas queda en `AdminAccessLog` con el correo del token (y sin datos de personas en el detalle). Se ve en `GET /admin/access-log`.

## Rutas de la API

| Ruta | Para qué |
|---|---|
| `GET /admin/session` | Correo de la sesión de Access (cabecera del portal). |
| `GET /admin/users?kind=real\|demo&q=&role=&verified=&page=` | Cuentas, 25 por página. **Reales y demo van en listas distintas.** |
| `GET /admin/users/:id` | Detalle mínimo y relación coach–atleta. |
| `GET /admin/summary` | Totales de cuentas **reales** (las demo aparte): registros, coaches con atletas invitados, atletas con sesión. |
| `GET /admin/usage?days=7\|30` | Uso desde PostHog por usuario y por pantalla, sin demo. `{ status: "not_connected" }` sin clave; **503** `posthog_error` si PostHog falla. |
| `GET /admin/access-log` | Últimas 50 consultas. |
| `GET/POST/PUT/DELETE /admin/emails` | Directorio de correos, editable sin tocar el código. |
| `GET /admin/versions` | Commit de la API, última migración, política vigente y versión de iOS. |
| `PUT /admin/settings/ios-version` | Versión de la app iOS (a mano; vacío la borra). |

Base de datos (migración aditiva `20261104120000_portal_equipo`): `User.lastLoginAt` (se guarda al iniciar sesión con contraseña, Google o Apple; renovar la sesión no cuenta; las cuentas anteriores salen «Sin dato» hasta su próximo ingreso), `EmailAddress` (con las cuatro direcciones iniciales), `AdminAccessLog` y `AdminSetting`.

## Variables de entorno (solo en Render)

| Variable | Valor |
|---|---|
| `CF_ACCESS_TEAM_DOMAIN` | El dominio del equipo de Zero Trust, **sin** `https://`: `equipo.cloudflareaccess.com`. |
| `CF_ACCESS_AUD` | El *Application Audience (AUD) Tag* de la aplicación de Access. |
| `POSTHOG_PERSONAL_API_KEY` y `POSTHOG_PROJECT_ID` | Clave personal de solo lectura y el ID del proyecto (ver [`POSTHOG.md`](POSTHOG.md)). Opcionales: sin ellas, la pestaña Uso dice «no conectado». |

Los valores solo viven en Render. Nunca van al repo, a Linear ni a un chat.

## Cloudflare y Vercel (CYC-215), en este orden

El orden importa: con el proxy de Cloudflare encendido, Vercel no puede validar el dominio ni emitir su certificado.

1. **DNS:** registro `CNAME`, nombre `admin`, destino el que muestre Vercel al agregar el dominio (normalmente `cname.vercel-dns.com`), proxy **apagado** («Solo DNS»).
2. **Vercel:** crear el proyecto de `apps/admin` (raíz `apps/admin`), agregar `admin.getcycles.app` y esperar a que emita el certificado.
3. **Proxy y SSL:** encender el proxy (nube naranja) y poner SSL/TLS en **Full (strict)**. La [guía de Vercel](https://vercel.com/docs/integrations/cloudflare) nombra **Full** con proxy y advierte que **Flexible** provoca un bucle de redirecciones; el certificado de Vercel es público y válido, así que *strict* debería funcionar. Si diera error 526, bajar a **Full**.
4. **Access:** crear la aplicación de Access para `admin.getcycles.app` con la política del equipo (correos y método de inicio) y sesión de 8 horas. Agregar una política **Bypass** solo para la ruta `/.well-known/acme-challenge/*`: Vercel renueva su certificado cada ~60 días con un reto en esa ruta y Access lo bloquearía. (Pendiente de comprobar en el primer despliegue.)
5. **Copiar** el *AUD Tag* y el dominio del equipo a las variables de Render.
6. **Comprobar:** `https://admin.getcycles.app/` debe pedir autenticarse; un correo fuera de la política ve el «Acceso denegado» de Cloudflare; `https://api.getcycles.app/admin/session` sin token responde 401.

La API del portal se sirve bajo el mismo host protegido (`admin.getcycles.app/api/*` reenviado a Render por Vercel), porque el token de Access solo viaja a los hosts protegidos. Al ser el mismo origen, no hace falta ampliar el CORS de la API.

## Antes de mezclar la migración

La migración es aditiva, pero igual lleva respaldo previo (`gh workflow run respaldo.yml -f motivo=pre-migracion`, o `respaldo-supabase.sh` mientras el automático no esté activo). Ver [`RESPALDOS.md`](RESPALDOS.md).

## Límites conocidos

- Las cuentas **demo** y las de las pruebas no se cuentan; el **tráfico interno** del equipo se excluye solo si usa cuentas demo.
- PostHog solo mide la web: la app iOS no aparece en Uso.
- El estado de la última compilación de la web y de la app (TestFlight) no se lee automáticamente; la versión de iOS se escribe a mano.
