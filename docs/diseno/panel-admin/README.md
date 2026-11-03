---
type: design
parent: "[[PRD-General]]"
status: proposed
tags: [diseno, admin, portal, seguridad]
created: 2026-11-03
updated: 2026-11-03
---

# Portal del equipo de Cycles (CYC-212)

> Diseño previo de CYC-193. **Versión 2:** ya no es un panel dentro de la web de la app, sino un **portal independiente en su propio subdominio, solo para el equipo de desarrollo de Cycles**, con su propio inicio de sesión. Bloquea CYC-193. Contrastado con `origin/main` 737fe00. Estado: propuesto, pendiente de aprobación de la usuaria. Maqueta en [`propuestas.html`](propuestas.html).

## Qué cambia respecto a la versión 1

| Tema | v1 (panel dentro de la app) | v2 (portal en un subdominio) |
|---|---|---|
| Dónde vive | Ruta `/admin` de `app.getcycles.app` | **Subdominio propio** (ejemplo: `admin.getcycles.app`), aplicación aparte |
| Quién entra | La fundadora | **El equipo de desarrollo** (varias personas) |
| Inicio de sesión | El de la app; «Administración» en el menú de usuario | **Propio del portal.** Sin relación con el login, el menú ni las sesiones de la app |
| `isAdmin` en `/auth/me` | Sí | **No.** La app no sabe que el portal existe |
| Qué ve un coach o atleta | «No encontramos esta página» dentro de la app | **Nada:** el portal no está enlazado desde ningún lugar de la app ni de la web |
| Quién puede entrar | Correo de administradora en la app | **Lista de correos del equipo** validada solo en el servidor del portal |
| Pantallas de datos | Usuarios, Uso, Correos, Enlaces y versiones | **Sin cambios**; solo cambia el cromo (cabecera) |

## Verificado contra origin/main 737fe00

| Tema | Archivo(s) | Qué hay hoy y cómo lo usa el diseño |
|---|---|---|
| Dominios | `docs/deploy/PLAN-Deploy.md` | Hay `app.`, `api.` y `mail.getcycles.app` (y `www.` parcial). El portal sería un subdominio más; la web de la app **no** se toca. |
| CORS de la API | `apps/api/src/main.ts` (`enableCors({ origin: corsOrigins(config) })`) | El origen del portal se agrega **solo para las rutas `/admin/*`**; no se amplía el CORS del resto de la API. |
| Modelo `User` | `apps/api/prisma/schema.prisma` | Tiene `isDemo`, `emailVerifiedAt`, `dataConsent*`, `phonePlatform`, `tourStatus`; **falta `lastLoginAt`** (campo nuevo propuesto). |
| PostHog | `lib/analytics.ts`, `docs/deploy/POSTHOG.md` | UE, solo web; la persona se identifica por ID interno y rol, **nunca por nombre o correo**. El portal cruza el ID con la base **en el servidor**. |
| Correos transaccionales | `mail.getcycles.app` (Resend) | Sirve para enviar el **enlace de inicio de sesión** del portal. |
| Tokens | `styles/global.css` | `--radius-*` (4/6/8/10/12/999) y colores vigentes: se reutilizan en el portal. |

## Decisiones (S1–S5)

| # | Decisión | Detalle |
|---|---|---|
| S1 | **Autenticación propia del portal** (recomendada): **enlace de un solo uso por correo**, sin contraseñas | Solo para correos de una **lista del equipo** (`ADMIN_EMAILS`, variable de entorno en el servidor). El enlace vence en 10 minutos y se enviaría con Resend. Sesión en cookie `httpOnly`, `Secure`, **solo del subdominio**, de 8 horas con cierre a los 30 minutos de inactividad. |
| S2 | **Aislada de la app** | Secreto de firma distinto (`ADMIN_SESSION_SECRET`), audiencia propia y **no acepta tokens de la app**; la app tampoco acepta los del portal. Un coach o atleta, aunque conozca la URL, no tiene cómo entrar. |
| S3 | **Último ingreso** | Campo nuevo `lastLoginAt` en `User` (migración aditiva con respaldo previo). Las cuentas existentes salen «Sin dato» hasta su próximo ingreso. |
| S4 | **PostHog** | Clave de **solo lectura** en el servidor; nunca en el navegador. |
| S5 | **Directorio de correos** en la base de datos, editable desde el portal | Datos iniciales cargados por el desarrollo. |

**Alternativa a S1 (para decidir):** poner **Cloudflare Access** delante del subdominio (inicio con Google del equipo) y que la API valide el token de Access. No requiere construir el inicio de sesión ni enviar enlaces, pero depende de que el DNS esté en Cloudflare (hoy se sabe que se usa para el correo de entrada, no confirmado para el DNS de la web). En ese caso la pantalla de «Iniciar sesión» de la maqueta no se construye y quien no esté autorizado ve la página de bloqueo de Access.

## Cómo se entra

1. El equipo abre el subdominio (guardado en marcadores; **no hay enlace desde la app, la landing ni el correo**).
2. **Iniciar sesión:** escribe su correo y toca **Enviar enlace**. La respuesta es **siempre la misma** («Si tu correo está autorizado, te enviamos un enlace»), exista o no en la lista, para no revelar quién es del equipo.
3. Abre el enlace del correo: inicia sesión y llega a **Usuarios**.
4. El enlace sirve **una vez**; si venció o ya se usó, muestra «Este enlace ya no sirve» con **Pedir un enlace nuevo**.
5. **Sesión expirada** por inactividad: vuelve a la pantalla de inicio con el aviso.
6. **Cerrar sesión** en la cabecera.

Protecciones: límite de solicitudes de enlace por correo y por IP, el portal responde con `noindex` y `X-Frame-Options: DENY`, y cada consulta de datos de usuarios queda registrada con la persona del equipo que la hizo.

## Cromo del portal (distinto de la app)

- Cabecera blanca: **Cycles**, etiqueta **Equipo**, etiqueta de entorno **Producción** (verde, con texto), correo de la persona y **Cerrar sesión**. **No** lleva el menú del coach (Inicio, Atletas, Biblioteca, Ejercicios) ni avatar de usuario de la app.
- Debajo, las cuatro pestañas (`role="tablist"`): **Usuarios · Uso · Correos · Enlaces y versiones**. Sin subtítulos grises bajo los títulos.
- Antes de iniciar sesión solo se ve la cabecera con las etiquetas y la tarjeta «Portal del equipo».

## Pantallas

### 1. Usuarios

- **Totales distintos y arriba:** «Cuentas reales 43» (coaches 12, atletas 31) y, aparte y más discreta, «Demo 6». Las demo **no suman** en ninguna cifra real.
- **Resumen** (solo reales): registros de la semana, coaches con atletas invitados (9 de 12), atletas con al menos una sesión (18 de 31).
- **Dos listas separadas** con un selector **Reales / Demo**. La lista Demo lleva el aviso «Cuentas ficticias. No cuentan en ninguna métrica» y cada fila la etiqueta de texto **Demo**; no basta con el color.
- **Columnas:** nombre y correo · rol · registro · correo verificado · política (versión o «Pendiente») · último ingreso («hoy», «hace 3 días», «Sin dato»; la fecha exacta en el `title`).
- **Búsqueda** por nombre o correo, filtros por **Rol** y **Verificación**, **paginación** de 25 por página.
- **Detalle** al abrir una fila (panel lateral): rol, teléfono, estado del tour, relación coach–atleta. **Nunca** contraseñas, tokens ni datos de entrenamiento o salud.
- **Registro de consultas** (plegado, al final): qué persona del equipo consultó qué vista y cuándo.
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

- **Inicio de sesión:** campo con `label`, error y avisos en regiones `role="alert"`/`role="status"`, foco en el campo al abrir, enlace de correo sin depender del color.
- **Teclado:** pestañas con flechas, panel lateral con foco atrapado, Esc para cerrar y foco devuelto.
- **Tablas:** `caption`, `th scope` y orden con `aria-sort`; botones de columna ≥ 40 px.
- **Estado más allá del color:** verificado = ✓ «Sí»; demo = etiqueta «Demo»; entorno = «Producción» en texto; compilación = «Correcta» o «Falló» con ícono.
- **Contraste:** `#1f2228` y `#5c6068` sobre blanco (≥ 4,5:1); estados `#1e6b32`, `#9a4a00` y `#a3282c` sobre sus fondos claros.
- **Anuncios:** cambios de pestaña, resultados de búsqueda y guardado en `aria-live="polite"`.

## Seguridad y privacidad (contra `docs/SEGURIDAD.md`)

- **Aplicación aparte** (no una ruta de la web): despliegue, cookies y CSP propios; host-only en el subdominio.
- La API de `/admin/*` exige la sesión del portal en **cada** ruta; sin ella responde 401. Sin `isAdmin` en la app, sin menú, sin enlaces.
- CORS: el origen del portal solo se acepta en `/admin/*`.
- La clave de PostHog y `ADMIN_SESSION_SECRET` solo viven en variables del servidor.
- Se muestra lo mínimo de cada persona: sin contraseñas, tokens ni datos de entrenamiento.
- Cada consulta queda registrada con la persona del equipo; las demo se excluyen de totales y de Uso.
- El equipo no puede darse acceso a sí mismo desde el portal: la lista de correos se cambia en el servidor.

## Preguntas para la usuaria

1. ¿Autenticación propia del portal con enlace por correo (recomendada, S1) o **Cloudflare Access** delante del subdominio?
2. ¿Qué subdominio usamos? En la maqueta aparece `admin.getcycles.app` como ejemplo.
3. ¿Quiénes del equipo entran al inicio? (La lista se carga en el servidor, no en el portal.)
4. ¿La versión de la app iOS se ingresa a mano en el portal?
5. ¿Las cuentas demo quedan en una lista aparte dentro de Usuarios (recomendado)?

## Para CYC-193 (implementación)

- **Aplicación nueva** (por ejemplo `apps/admin`, desplegada en el subdominio) que reutiliza tokens de estilo; **sin** cambios en `apps/web` (sin menú, sin `isAdmin`).
- API: autenticación del portal (`POST /admin/auth/request-link`, `GET /admin/auth/verify`, `POST /admin/auth/logout`) con tabla de enlaces de un solo uso y límite de solicitudes; `GET /admin/users`, `GET /admin/usage`, `GET/PUT/POST/DELETE /admin/emails`, `GET /admin/versions`; todas con la sesión del portal y registro de consulta.
- Base: `lastLoginAt` en `User`, tabla del directorio de correos, tabla de enlaces de acceso y tabla de registro de consultas (migraciones aditivas con respaldo).
- DNS del subdominio y CORS solo para `/admin/*`.
- Pruebas: sin sesión del portal, toda ruta `/admin/*` responde 401; un token de la app no sirve en el portal; el correo no autorizado recibe la misma respuesta que uno autorizado; las demo no aparecen en totales ni en Uso.
