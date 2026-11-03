---
type: design
parent: "[[PRD-General]]"
status: proposed
tags: [diseno, admin, portal, seguridad]
created: 2026-11-03
updated: 2026-11-03
---

# Portal del equipo de Cycles (CYC-212)

> Diseño previo de CYC-193. **Versión 2:** ya no es un panel dentro de la web de la app, sino un **portal independiente en su propio subdominio, solo para el equipo de desarrollo de Cycles**, con su propio inicio de sesión. Bloquea CYC-193. Contrastado con `origin/main`. Acceso con **Cloudflare Access** (sin login propio). Estado: propuesto, pendiente de aprobación de la usuaria. Maqueta en [`propuestas.html`](propuestas.html).

## Qué cambia respecto a la versión 1

| Tema | v1 (panel dentro de la app) | v2 (portal en un subdominio) |
|---|---|---|
| Dónde vive | Ruta `/admin` de `app.getcycles.app` | **Subdominio propio** (ejemplo: `admin.getcycles.app`), aplicación aparte |
| Quién entra | La fundadora | **El equipo de desarrollo** (varias personas) |
| Inicio de sesión | El de la app; «Administración» en el menú de usuario | **Cloudflare Access** delante del subdominio: no construimos login. Sin relación con el login, el menú ni las sesiones de la app |
| `isAdmin` en `/auth/me` | Sí | **No.** La app no sabe que el portal existe |
| Qué ve un coach o atleta | «No encontramos esta página» dentro de la app | **Nada:** el portal no está enlazado desde ningún lugar de la app ni de la web |
| Cómo se entra | Cuenta de la app con correo de administradora | **Cloudflare Access**: política con los correos del equipo; inicio de sesión de Cloudflare, sin cuentas ni correos que enviemos nosotros |
| Pantallas de datos | Usuarios, Uso, Correos, Enlaces y versiones | **Sin cambios**; solo cambia el cromo (cabecera) |

## Verificado contra origin/main 737fe00

| Tema | Archivo(s) | Qué hay hoy y cómo lo usa el diseño |
|---|---|---|
| Dominios y DNS | `docs/deploy/PLAN-Deploy.md` | Hay `app.`, `api.` y `mail.getcycles.app` (y `www.` parcial). **El registrador y el DNS ya están en Cloudflare**, así que Access es viable. Hoy los registros de Vercel y Render van con el proxy **desactivado**; el del portal tendría que ir con el proxy **activado** (Access lo exige). La web de la app **no** se toca. |
| CORS de la API | `apps/api/src/main.ts` (`enableCors({ origin: corsOrigins(config) })`) | El origen del portal se agrega **solo para las rutas `/admin/*`**; no se amplía el CORS del resto de la API. |
| Modelo `User` | `apps/api/prisma/schema.prisma` | Tiene `isDemo`, `emailVerifiedAt`, `dataConsent*`, `phonePlatform`, `tourStatus`; **falta `lastLoginAt`** (campo nuevo propuesto). |
| PostHog | `lib/analytics.ts`, `docs/deploy/POSTHOG.md` | UE, solo web; la persona se identifica por ID interno y rol, **nunca por nombre o correo**. El portal cruza el ID con la base **en el servidor**. |
| Tokens | `styles/global.css` | `--radius-*` (4/6/8/10/12/999) y colores vigentes: se reutilizan en el portal. |

## Decisiones (S1–S5)

| # | Decisión | Detalle |
|---|---|---|
| S1 | **Acceso con Cloudflare Access** | Cloudflare protege el subdominio: nadie ve el portal sin autenticarse antes. La política permite solo los **correos del equipo** (la lista se administra en Cloudflare). El método de inicio lo maneja Cloudflare (por ejemplo, Google o un código de un solo uso al correo). **No construimos pantalla de inicio de sesión, llaves, envío de correos ni límite de intentos.** |
| S2 | **La API también valida** | Que el tráfico pase por Cloudflare **no basta**: cada ruta `/admin/*` verifica el token firmado que Cloudflare agrega a la petición (firma, audiencia de la aplicación y vencimiento) y rechaza con 401 lo que no lo traiga, aunque alguien llegue directo a `api.getcycles.app`. La identidad (el correo) sale de ese token. |
| S3 | **Último ingreso** | Campo nuevo `lastLoginAt` en `User` (migración aditiva con respaldo previo). Las cuentas existentes salen «Sin dato» hasta su próximo ingreso. |
| S4 | **PostHog** | Clave de **solo lectura** en el servidor; nunca en el navegador. |
| S5 | **Directorio de correos** en la base de datos, editable desde el portal | Datos iniciales cargados por el desarrollo. (Es el directorio de direcciones de Cycles; no tiene relación con el acceso.) |

**Por qué es más simple:** el cifrado en tránsito ya lo da Cloudflare (y `.app` exige HTTPS), y con Access se evitan la tabla de llaves, el comando para generarlas, el límite de intentos y la pantalla de inicio. Cloudflare Zero Trust es gratis hasta 50 personas.

**Lo que hay que resolver al construirlo (CYC-193):**
- El token de Access solo viaja a los hosts protegidos. Para que llegue a la API, la API del portal se sirve **bajo el mismo host protegido** (por ejemplo `admin.getcycles.app/api/*` que reenvía a Render) o se protege también la ruta `/admin/*` de `api.` con otra aplicación de Access. Se recomienda lo primero, porque `api.` hoy va con el proxy desactivado.
- Cerrar sesión: el enlace de la cabecera usa el cierre de Access (`/cdn-cgi/access/logout`).
- Duración de la sesión de Access: 8 horas (configurable en Cloudflare).

## Cómo se entra

1. La persona abre el subdominio (en marcadores; **no hay enlace desde la app, la landing ni correos**).
2. **Cloudflare** le pide autenticarse. Esa pantalla **no la construimos nosotros**; se ve en la maqueta solo como referencia.
3. Si su correo está en la política, entra directo a **Usuarios** y la cabecera dice «Sesión de {correo}».
4. Si no está en la política, Cloudflare muestra su página de **Acceso denegado** y **no llega ni una petición al portal ni a la API**.
5. **Sesión terminada:** si el token vence con el portal abierto, la API responde 401 y el portal muestra «Tu sesión terminó» con **Volver a entrar**, que recarga la página y Cloudflare vuelve a pedir la autenticación.
6. **Cerrar sesión** en la cabecera.

Protecciones: el portal responde con `noindex` y `X-Frame-Options: DENY`, cada consulta de datos de usuarios queda registrada con el correo de quien la hizo, y la API rechaza toda petición sin token válido.

## Cromo del portal (distinto de la app)

- Cabecera blanca: **Cycles**, etiqueta **Equipo**, etiqueta de entorno **Producción** (verde, con texto), «Sesión de {correo}» y **Cerrar sesión**. **No** lleva el menú del coach (Inicio, Atletas, Biblioteca, Ejercicios) ni avatar de usuario de la app.
- Debajo, las cuatro pestañas (`role="tablist"`): **Usuarios · Uso · Correos · Enlaces y versiones**. Sin subtítulos grises bajo los títulos.
- Antes de autenticarse no se ve nada del portal: lo único visible es la pantalla de Cloudflare.

## Pantallas

### 1. Usuarios

- **Totales distintos y arriba:** «Cuentas reales 43» (coaches 12, atletas 31) y, aparte y más discreta, «Demo 6». Las demo **no suman** en ninguna cifra real.
- **Resumen** (solo reales): registros de la semana, coaches con atletas invitados (9 de 12), atletas con al menos una sesión (18 de 31).
- **Dos listas separadas** con un selector **Reales / Demo**. La lista Demo lleva el aviso «Cuentas ficticias. No cuentan en ninguna métrica» y cada fila la etiqueta de texto **Demo**; no basta con el color.
- **Columnas:** nombre y correo · rol · registro · correo verificado · política (versión o «Pendiente») · último ingreso («hoy», «hace 3 días», «Sin dato»; la fecha exacta en el `title`).
- **Búsqueda** por nombre o correo, filtros por **Rol** y **Verificación**, **paginación** de 25 por página.
- **Detalle** al abrir una fila (panel lateral): rol, teléfono, estado del tour, relación coach–atleta. **Nunca** contraseñas, tokens ni datos de entrenamiento o salud.
- **Registro de consultas** (plegado, al final): el correo de quien consultó, qué vista y cuándo.
- **Estados:** cargando, vacío («Aún no hay cuentas reales»), sin resultados, error («No pudimos cargar los usuarios. Inténtalo de nuevo.») y muchos usuarios.

### 2. Uso (PostHog)

- Periodo de 7 o 30 días, **sin demo ni tráfico interno**.
- **Por usuario** (nombre cruzado en el servidor): visitas, ingresos, rutinas, ciclos, sesiones y último evento, con orden por columna (`aria-sort`).
- **Por pantalla:** rutas limpias (`/`, `/athletes`, `/biblioteca`, `/cycles/:id`…) con visitas y una barra **acompañada de su número**.
- Aviso fijo: «Solo web. La app iOS aún no se mide.» y enlace a PostHog.
- **Estados:** cargando, vacío, **error de PostHog** («No pudimos leer PostHog. Las demás pestañas siguen funcionando.» con **Reintentar**) y **no conectado** (sin revelar nada de la clave).

### 3. Correos

- Tabla del directorio: dirección · para qué sirve · cómo funciona (**Solo recepción**, **Solo envío**, **Envío y recepción**) · servicio.
- **Editar** y **Agregar correo** abren un panel lateral; **Guardar** confirma con aviso y **Quitar** pide confirmación.
- Datos iniciales: `redes@` (solo recepción, Cloudflare Email Routing), `privacidad@`, el remitente de Resend y el de contacto.
- **Estados:** vacío, guardando, error al guardar y validación de formato.

### 4. Enlaces y versiones

- **Enlaces rápidos** (otra pestaña): PostHog, Linear, Resend, Supabase, Render, Vercel, App Store Connect y **1Password, solo con el nombre de la bóveda**, nunca un enlace a un secreto.
- **Versiones y entornos:** Web (Vercel), API (Render), Base (Supabase, última migración), App iOS (TestFlight o App Store, campo editable) y **versión vigente de la política de privacidad**. La compilación se dice con texto e ícono («Correcta», «Falló»).
- **Estados:** cargando y «No pudimos leer la versión de {servicio}» por fila.

## Armonía visual

- Tokens vigentes: `#1f2228`, `#3080fc` solo como estado/selección (botones en `#1a66dd`), Bricolage Grotesque en títulos e Inter en el resto.
- Radios de CYC-206: tarjetas y paneles 10, botones y campos 8, celdas 6; cápsula solo para etiquetas pequeñas.
- Contenido a 1280 px máximo; por debajo de **900 px** las tablas pasan a filas apiladas con la etiqueta de cada celda.

## Accesibilidad

- **Inicio de sesión:** lo maneja Cloudflare. Lo nuestro es el aviso «Tu sesión terminó» (`role="status"`, con el botón **Volver a entrar** de 40 px y foco en él al aparecer).
- **Teclado:** pestañas con flechas, panel lateral con foco atrapado, Esc para cerrar y foco devuelto.
- **Tablas:** `caption`, `th scope` y orden con `aria-sort`; botones de columna ≥ 40 px.
- **Estado más allá del color:** verificado = ✓ «Sí»; demo = etiqueta «Demo»; entorno = «Producción» en texto; compilación = «Correcta» o «Falló» con ícono.
- **Contraste:** `#1f2228` y `#5c6068` sobre blanco (≥ 4,5:1); estados `#1e6b32`, `#9a4a00` y `#a3282c` sobre sus fondos claros.
- **Anuncios:** cambios de pestaña, resultados de búsqueda y guardado en `aria-live="polite"`.

## Seguridad y privacidad (contra `docs/SEGURIDAD.md`)

- **Aplicación aparte** (no una ruta de la web): despliegue y CSP propios, protegida por Cloudflare Access.
- La API de `/admin/*` valida el token de Access en **cada** ruta (firma, audiencia y vencimiento); sin token válido responde 401. Sin `isAdmin` en la app, sin menú y sin enlaces.
- La lista de quién entra vive en Cloudflare, no en el código ni en variables de la app.
- CORS: el origen del portal solo se acepta en `/admin/*`.
- La clave de PostHog solo vive en variables del servidor.
- Se muestra lo mínimo de cada persona: sin contraseñas, tokens ni datos de entrenamiento.
- Cada consulta queda registrada con el correo del token; las demo se excluyen de totales y de Uso.
- Si Cloudflare Access fallara o se mal configurara, la API sigue rechazando todo lo que no traiga el token.

## Preguntas para la usuaria

1. ¿Confirmas **Cloudflare Access** en lugar de la llave dinámica? (Es lo que propone este diseño.)
2. ¿Qué subdominio usamos? En la maqueta aparece `admin.getcycles.app` como ejemplo.
3. ¿Qué correos del equipo entran y con qué método (Google o código por correo)? Se configura en Cloudflare, no en el portal.
4. ¿La versión de la app iOS se ingresa a mano en el portal?
5. ¿Las cuentas demo quedan en una lista aparte dentro de Usuarios (recomendado)?

## Para CYC-193 (implementación)

- **Cloudflare** (lo hace quien administra la cuenta): registro DNS del subdominio con proxy activado, aplicación de Access con la política del equipo y duración de sesión, y copiar el identificador de audiencia para la API.
- **Aplicación nueva** (por ejemplo `apps/admin`, en el subdominio) que reutiliza tokens de estilo; **sin** cambios en `apps/web`.
- **API:** guarda de `/admin/*` que valida el token de Access (firma contra las claves públicas del equipo de Cloudflare, audiencia, vencimiento) y extrae el correo; variables `CF_ACCESS_TEAM_DOMAIN` y `CF_ACCESS_AUD` solo en el servidor; `GET /admin/session` (correo); `GET /admin/users`, `GET /admin/usage`, `GET/PUT/POST/DELETE /admin/emails`, `GET /admin/versions`; todas con registro de consulta.
- Servir la API del portal bajo el host protegido (reenvío a Render) para que el token llegue.
- Base: `lastLoginAt` en `User`, tabla del directorio de correos y tabla de registro de consultas (migraciones aditivas con respaldo).
- CORS solo para `/admin/*`.
- Pruebas: sin token toda ruta `/admin/*` responde 401; un token de la app no sirve; un token con audiencia distinta o vencido se rechaza; las demo no aparecen en totales ni en Uso.
