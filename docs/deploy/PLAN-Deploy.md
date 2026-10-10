---
type: plan
tags: [deploy, infra]
status: draft
created: 2026-09-25
updated: 2026-10-01
---

# Plan de deploy de Cycles

> Plan **en ejecución** (pasos 0 a 3 y 8 hechos; paso 4 desplegado, con el recorrido completo pendiente; estado al 2026-10-01). Objetivo: tener Cycles accesible en internet para un piloto con 2 o 3 coaches reales, dentro del presupuesto acordado (tier gratuito o menos de 25 USD/mes). Las decisiones de infraestructura ya están cerradas (ver [[PRD-General]] §11 y `docs/ARCHITECTURE.md`): **Supabase** (Postgres), **Render** (API), **Vercel** (web) y **Resend** (email).

## Orden de los pasos

| # | Paso | Por qué en este orden | Estado |
|---|---|---|---|
| 0 | Definir y comprar el dominio | Resend necesita un dominio verificado para enviar a cualquier persona, y la web, la API y Google OAuth van a usar ese mismo dominio. | **Hecho** (2026-09-25) |
| 1 | Email transaccional con Resend | Sin emails nadie puede verificar su cuenta, recuperar la contraseña ni aceptar una invitación. Se puede hacer y probar en local antes de desplegar nada. | **Hecho** (2026-09-26); DMARC publicado (`p=none`, verificado el 2026-10-01) |
| 2 | Base de datos en Supabase | La API la necesita para arrancar. | **Hecho** (2026-09-28); falta el script de respaldo (2.5, antes del piloto) |
| 3 | API en Render | Depende de la base y de las variables de Resend. | **Hecho** (2026-09-28): `https://api.getcycles.app`, con las credenciales de Google y el DNS de `api.` |
| 4 | Web en Vercel | Depende de la URL pública de la API. | **Desplegado** (2026-09-29, PR #21): `https://app.getcycles.app`, con las cabeceras de 1D verificadas en producción. **Falta el recorrido completo de 4.4** (lo haces tú, con los alias Gmail) |
| 5 | Google OAuth en producción | Necesita las URLs definitivas de la API y de la web. | **Parcial:** login de punta a punta probado en modo *Testing* (P-09, 2026-09-29). Falta decidir si se publica la app, y para eso la política de privacidad |
| 6 | DNS de la web y la API | Apunta los subdominios del paso 0 a Vercel y Render. | **Parcial:** `app.`, `api.` y `mail.` listos; `www.` reservado para la landing (PR #22). Falta la redirección temporal de la raíz y `www.` a `app.` |
| 7 | Prueba de punta a punta y piloto | Cierra el plan. | Por detallar. Depende de cerrar el paso 4 y de las pruebas de `docs/PRUEBAS-PENDIENTES.md` |
| 8 | Avisos de actividad del piloto en Slack | Para seguir el piloto sin entrar a la base: quién se suma y qué hace. Comparte la integración con las alertas de seguridad (1E). | **Hecho y en producción** (2026-09-28): el resumen programado corre cada día y envía una sola vez (29-09, 30-09 y 01-10, sin duplicados). La ventana se amplió a 8:00–23:59 de Chile (PR #23) porque GitHub atrasa las ejecuciones. Avisos y resumen confirmados en Slack (P-13, 2026-10-01) |

**El dominio no bloquea todo.** Mientras se decide, se puede avanzar con el código del paso 1 (probando con el remitente de prueba de Resend, que solo envía a tu propio email) y con los pasos 2 a 4 usando las URLs gratuitas de cada servicio (`*.onrender.com`, `*.vercel.app`). Lo que sí necesita el dominio es enviar emails a los coaches y atletas del piloto.

Cada paso separa **lo que haces tú** (crear cuentas, cargar DNS, pegar secretos: nada de eso lo puede hacer Claude) de **lo que se cambia en el código**.

---

## Paso 0 · Definir y comprar el dominio

### 0.1 Qué hay que decidir

1. **El nombre.** "Cycles" es el nombre confirmado del producto, pero es una palabra común y es probable que `cycles.com` y variantes directas no estén disponibles. Hay que buscar opciones y verificar su disponibilidad en un registrador; esta lista son ideas para buscar, no dominios confirmados libres:
   - **Del producto:** `cycles.app`, `cycles.training`, `getcycles.com`, `cyclesapp.com`, `usecycles.com`.
   - **De la compañía, con el producto como subdominio:** `inprogress.co` o `inprogressco.com` → `cycles.<dominio>`. Encaja con la arquitectura de marca de [[brand]] (InProgress Co. como paraguas, Cycles como producto) y deja lugar a productos futuros, a cambio de URLs un poco más largas.
2. **La extensión (TLD).** Los precios son aproximados; hay que verificarlos al comprar.

   | TLD | A favor | En contra | Precio aprox. |
   |---|---|---|---|
   | `.com` | La más reconocida y fácil de dictar | Casi todo lo corto está tomado | ~10–15 USD/año |
   | `.app` | Encaja con un producto de software; exige HTTPS (Vercel y Render ya lo dan) | Menos familiar para algunos usuarios | ~15–20 USD/año |
   | `.co` | Corta y usada por startups | Se confunde con `.com` al tipearla | ~25–35 USD/año |
   | `.training` / `.fit` | Dicen de qué trata el producto | Poco conocidas y a veces caras | Variable |

3. **Criterios para elegir.**
   - Corto y fácil de dictar en español, sin guiones ni números.
   - Que no se confunda al escucharlo.
   - Idealmente disponible también como usuario en redes.
   - Dentro del presupuesto: cualquiera de las opciones de arriba entra holgado en menos de 25 USD/mes.

### 0.2 Estructura de subdominios propuesta

Con un solo dominio, cada servicio usa un subdominio:

| Subdominio | Para qué | Servicio |
|---|---|---|
| `www.<dominio>` | **Landing page.** ~~Proyecto aparte de Vercel (2026-09-28).~~ **Cambio 2026-10-03:** la landing se construyó dentro de `apps/web` (ruta `/` para visitantes) y se publica en `app.`; `www.` y la raíz redirigen a `app.` hasta que se decida mover la landing. | Redirección (Cloudflare) |
| `<dominio>` (raíz) | Redirige a `www.`, para que `getcycles.app` y `www.getcycles.app` lleven a la misma landing | Cloudflare (regla de redirección) |
| `app.<dominio>` | La web de Cycles | Vercel |
| `api.<dominio>` | La API | Render |
| `mail.<dominio>` | Envío de emails (paso 1) | Resend |

Si se elige la opción de compañía (`cycles.<dominio>`), la misma idea se adapta. Por ejemplo, `cycles.<dominio>` para la web, `api.cycles.<dominio>` para la API y `mail.<dominio>` para compartir el envío entre productos.

### 0.3 Registrador

| Opción | A favor | A tener en cuenta |
|---|---|---|
| **Cloudflare Registrar** | Cobra el precio de costo, sin recargos en la renovación, e incluye un DNS rápido y gratis | Hay que crear una cuenta de Cloudflare. Para los registros de Vercel y Render, dejar el proxy desactivado (*DNS only*) al empezar, para evitar conflictos con sus certificados |
| **Namecheap / Porkbun** | Simples, con privacidad de WHOIS incluida | La renovación puede costar más que el primer año |

**Recomendación:** Cloudflare Registrar, por precio y DNS. Cualquiera de los tres sirve.

### 0.4 Lo que haces tú

1. Hacer una lista corta de 3 a 5 nombres y revisar su disponibilidad en el registrador elegido.
2. Elegir uno (nombre y TLD) y la estructura de subdominios (0.2).
3. Comprarlo con la cuenta de la compañía y activar:
   - **verificación en dos pasos** en el registrador,
   - **renovación automática**, para no perder el dominio por un vencimiento,
   - **privacidad de WHOIS**, si el registrador no la trae por defecto.
4. Guardar el acceso al registrador en el gestor de contraseñas.
5. Anotar la decisión en este documento (0.5).

### 0.5 Decisión

| Campo | Valor |
|---|---|
| Dominio elegido | **`getcycles.app`** |
| Registrador | **Cloudflare Registrar** (el DNS también queda en Cloudflare) |
| Estructura de subdominios | `app.getcycles.app` (web), `api.getcycles.app` (API), `mail.getcycles.app` (emails); `www.getcycles.app` para la landing (la raíz redirige a `www.`); hasta que exista la landing, las dos redirigen temporalmente a `app.` |
| Fecha de compra y renovación | Comprado el 2026-09-25. Confirmar en Cloudflare la fecha de renovación y que la renovación automática esté activa |

> `.app` exige HTTPS en todos los subdominios (la extensión está en la lista HSTS de los navegadores). Vercel, Render y Resend lo resuelven solos. Lo único a cuidar: en Cloudflare, dejar los registros de Vercel y Render en modo *DNS only* (proxy desactivado) al configurarlos.

### 0.6 Listo cuando

- [x] Dominio comprado: `getcycles.app` en Cloudflare (2026-09-25).
- [x] Verificación en dos pasos activada en la cuenta de Cloudflare (2026-09-25).
- [x] Renovación automática confirmada en Cloudflare (2026-09-25).
- [x] Acceso al panel de DNS confirmado (2026-09-25; la zona está vacía, en modo *DNS Setup: Full*).
- [x] Subdominios definidos y anotados en 0.5.

---

## Paso 1 · Email transaccional con Resend

### 1.1 Qué hay hoy

- `apps/api/src/mail/mail.service.ts` es un stub: los tres métodos (`sendVerificationEmail`, `sendPasswordResetEmail`, `sendAthleteInvitationEmail`) solo escriben el enlace en el log.
- Lo llaman tres flujos:
  - `auth.service.ts` · registro → verificación de email.
  - `auth.service.ts` · recuperar contraseña.
  - `athletes.service.ts` · invitación de atleta.
- Los enlaces se arman con `FRONTEND_URL`, que **no está** en `apps/api/.env.example`.
- La invitación crea el usuario, la relación y el token **antes** de enviar el email. Si el envío falla, el email queda tomado y reinvitar da "Ya existe una cuenta con este email". Hay que resolverlo al conectar un proveedor real (ver 1.5).

### 1.2 Decisiones a tomar antes de empezar

| Decisión | Opciones | Recomendación |
|---|---|---|
| **Dominio de envío** | a) Dominio propio verificado. b) Sin dominio, con el remitente de prueba de Resend. | **a)**. Sin dominio verificado, Resend solo deja enviar al email del dueño de la cuenta: sirve para probar en local, no para el piloto. |
| **Dominio o subdominio** | Verificar el dominio raíz o un subdominio de envío. | **Subdominio `mail.getcycles.app`**: aísla la reputación de envío del resto del dominio y no toca el correo que pueda usar la raíz. |
| **Remitente** | Dirección y nombre visible. | `Cycles <hola@mail.getcycles.app>`. Que se pueda responder, o usar `reply-to` hacia un buzón real. |
| **Plan de Resend** | Gratuito o pago. | Gratuito para el piloto. Sus límites se revisan en resend.com/pricing antes de empezar: eran del orden de 3.000 emails/mes y 100/día, sobrado para el piloto. |

> El dominio y el subdominio de envío salen del paso 0.

### 1.3 Lo que haces tú (cuentas y DNS)

1. **Crear la cuenta** en resend.com con el email de la compañía.
2. **Agregar el dominio** (o subdominio) en *Domains → Add domain*. Elegir la región más cercana a los usuarios si lo ofrece.
3. **Cargar los registros DNS** que muestra Resend en el proveedor del dominio, copiados exactamente como aparecen. Suelen ser:
   - un registro **TXT de DKIM** (`resend._domainkey…`),
   - un **MX** y un **TXT de SPF** para el subdominio de rebote (`send…`).
4. **Agregar DMARC**: un TXT en `_dmarc.getcycles.app` que empiece en modo de solo monitoreo (`p=none`). Mejora la entrega en Gmail y Outlook.
   - La raíz `getcycles.app` no va a enviar emails (solo `mail.`). Para que nadie pueda hacerse pasar por `@getcycles.app`, que es lo que advierte Cloudflare en sus recomendaciones, se puede agregar además un SPF en la raíz que no autorice a nadie (`v=spf1 -all`). Si más adelante se activa *Email Routing* para recibir en `soporte@`, Cloudflare ajusta los registros de la raíz por su cuenta.
   - Los avisos de Cloudflare sobre `www` y la raíz ("Visitors cannot reach…") se ignoran por ahora: se resuelven en el paso 6.
5. **Esperar la verificación** en Resend (de minutos a unas horas, según el DNS). No seguir hasta que el dominio figure como *Verified*.
6. **Crear una API key** en *API Keys* con permiso **solo de envío** (*Sending access*), restringida a ese dominio. Una para producción y otra para desarrollo.
7. **Guardar las keys en tu gestor de contraseñas.** Nunca en el repo, en un issue ni en un chat. Se cargan solo como variables de entorno (local en `apps/api/.env`, producción en Render en el paso 3).

### 1.4 Cambios en el código

1. **Dependencia:** agregar el SDK oficial `resend` a `apps/api`.
2. **Variables de entorno** (y documentarlas en `apps/api/.env.example`):

   | Variable | Ejemplo | Para qué |
   |---|---|---|
   | `RESEND_API_KEY` | *(secreto)* | Autenticar contra Resend. Si no está definida, el servicio sigue en modo desarrollo y solo loguea el enlace, como hoy. |
   | `MAIL_FROM` | `Cycles <hola@mail.getcycles.app>` | Remitente. |
   | `MAIL_REPLY_TO` | `soporte@getcycles.app` | Opcional: a dónde van las respuestas (necesita un buzón que reciba; ver 1.8). |
   | `FRONTEND_URL` | `http://localhost:5173` / `https://app.getcycles.app` | Base de los enlaces de los emails (ya se usa, faltaba documentarla). |

3. **`MailService`:**
   - Mantener los tres métodos públicos con la misma firma: ningún otro módulo cambia.
   - Con `RESEND_API_KEY`, enviar por Resend; sin ella, loguear como hoy. Así el desarrollo local no necesita cuenta.
   - El SDK devuelve `{ data, error }` en vez de lanzar: convertir `error` en una excepción propia (`MailDeliveryError`) y loguear el motivo **sin** el token ni el enlace completo.
4. **Plantillas:** una por email, con versión HTML simple (logo, un botón, colores de marca) y versión de texto plano.
   - Textos en español latino con "tú", sin voseo.
   - Asunto claro, un solo botón y el enlace también escrito, por si el botón no carga.
   - Decir cuánto dura el enlace. Revisar los TTL reales en el código antes de escribirlo; la invitación dura 7 días.

   | Email | Asunto propuesto | Botón |
   |---|---|---|
   | Verificación | Confirma tu email para entrar a Cycles | Confirmar email |
   | Recuperar contraseña | Cambia tu contraseña de Cycles | Elegir nueva contraseña |
   | Invitación de atleta | {Coach} te invitó a entrenar en Cycles | Crear mi cuenta |

   Para la invitación hace falta el nombre del coach: agregar ese parámetro al método (hoy solo recibe email y token).

### 1.5 Qué pasa si el envío falla

| Flujo | Hoy | Propuesta |
|---|---|---|
| Registro | El usuario se crea igual. | Mantener: el registro no falla por el email. Se loguea el error, y el usuario puede pedir otro desde "Revisa tu email" (el endpoint `verify-email/resend` ya existe). |
| Recuperar contraseña | — | Responder igual que siempre (no revelar si el email existe) y loguear el error. |
| Invitación de atleta | Deja el email tomado. | Si el envío falla, deshacer lo creado (token, relación, usuario) y responder un error claro: "No pudimos enviar la invitación. Intenta de nuevo." Más adelante, un botón "Reenviar invitación" (ya está en el diseño de Atletas) cubre el caso de un email que llegó pero se perdió. |

### 1.6 Cómo se prueba

1. **Local sin key:** todo sigue igual que hoy (los enlaces aparecen en el log). Los tres flujos funcionan.
2. **Local con la key de desarrollo:** registrarse, pedir recuperar contraseña e invitar a un atleta usando emails propios. Revisar que:
   - llegan a la bandeja de entrada, no a spam,
   - el enlace abre `FRONTEND_URL` y completa el flujo,
   - se ven bien en Gmail web, en Gmail móvil y en Apple Mail,
   - la versión de texto plano se lee bien.
3. **Falla simulada:** con una key inválida, verificar que la invitación no deja el email tomado y que el registro sigue funcionando.
4. **Logs:** verificar que no aparecen tokens ni enlaces completos cuando hay key.
5. **Panel de Resend:** confirmar que cada envío figura como *Delivered*.

### 1.7 Listo cuando

- [x] Dominio `mail.getcycles.app` verificado en Resend, con DKIM y SPF publicados (2026-09-26).
- [ ] DMARC cargado en `_dmarc.getcycles.app`.
- [ ] API keys de desarrollo y de producción guardadas en el gestor de contraseñas.
- [x] `MailService` enviando por Resend, con el modo de desarrollo intacto sin key (2026-09-26, rama `feat/email-resend`).
- [x] Las 3 plantillas en HTML y texto, con "tú" y colores de marca (`apps/api/src/mail/templates.ts`).
- [x] La invitación ya no deja el email tomado si falla el envío (probado con una key inválida: responde 503 y no queda el usuario).
- [x] `.env.example` documenta `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` y `FRONTEND_URL`.
- [x] Primer envío real: invitación entregada desde `hola@mail.getcycles.app` (2026-09-26), sin errores en el log.
- [ ] Probado de punta a punta con emails reales (1.6): aceptar la invitación, verificación de registro y recuperación de contraseña.

### 1.8 Riesgos

- **Emails en spam** al principio, con un dominio nuevo: DMARC, un remitente estable y poco volumen al inicio lo mitigan.
- **Enlaces con la URL equivocada** si `FRONTEND_URL` no se actualiza en producción: queda en la lista del paso 3.
- **Nadie recibe las respuestas** si `MAIL_REPLY_TO` apunta a un buzón que no existe: comprar el dominio no crea casillas de correo. Cloudflare ofrece *Email Routing* gratis para reenviar `soporte@getcycles.app` a tu correo personal, sin crear una casilla nueva.
- **Límite diario del plan gratuito:** solo es un problema si se invita a muchos atletas de golpe, cosa que no pasa en un piloto chico.

---

## Paso 2 · Base de datos en Supabase

**Objetivo:** una base Postgres en internet, con las migraciones aplicadas y el catálogo de ejercicios cargado, lista para que la API de Render se conecte en el paso 3. Supabase se usa **solo como Postgres**: la autenticación, el storage y la API automática de Supabase no se usan (la API de Cycles tiene su propio auth).

### 2.1 Decisiones

| Tema | Decisión | Por qué |
|---|---|---|
| **Plan** | Gratuito | 500 MB alcanzan de sobra para un piloto con 2 o 3 coaches. |
| **Región** | **East US (North Virginia)**, la misma que la API en Render (paso 3) | Render no tiene región en Sudamérica. Cada pedido a la API hace varias consultas a la base, así que importa más que la API y la base estén juntas que cerca del usuario: una base en São Paulo con la API en EE. UU. sumaría ~120 ms por consulta. |
| **Conexión** | *Session pooler* de Supabase (puerto 5432), para la API y para las migraciones | La conexión directa de Supabase solo funciona por IPv6 y Render no sale por IPv6. El *session pooler* funciona por IPv4, acepta las consultas preparadas de Prisma y sirve también para `prisma migrate deploy`, así que alcanza **una sola** `DATABASE_URL`, sin cambios en el código. El *transaction pooler* (6543) solo conviene con muchas instancias o funciones *serverless*, que no es el caso. |
| **API automática de Supabase (Data API)** | **Desactivada** | Expone las tablas del esquema `public` por HTTP con una key que Supabase considera pública. No la usamos, y dejarla activa sería una puerta de entrada a los datos que no pasa por los permisos de la API (R5). |
| **Pausa por inactividad** | Aceptada | El plan gratuito pausa el proyecto tras 7 días sin uso. Durante el piloto no pasa: el resumen diario (paso 8) consulta la base todos los días. |
| **Backups** | Respaldo manual semanal con `pg_dump` mientras dure el piloto (ver 2.5) | El plan gratuito no incluye backups descargables ni restauración a un punto en el tiempo; el plan Pro (25 USD/mes) sí, pero se sale del presupuesto. Se reevalúa si el piloto crece. |

### 2.2 Lo que haces tú en Supabase

1. Crear la cuenta en supabase.com (con Google o GitHub) y activar la **verificación en dos pasos** (*Account → Security*).
2. **New project:**
   - **Name:** `cycles`.
   - **Database password:** *Generate a password* y guardarla **en ese momento** en el gestor de contraseñas. No se vuelve a mostrar.
   - **Region:** *East US (North Virginia)*.
   - En las opciones de seguridad, si aparecen: **desmarcar** *Enable Data API* y **marcar** *Enable automatic RLS*.
3. Si el proyecto se creó sin esas opciones: *Project Settings → Data API* y desactivarla.
4. Copiar la conexión: botón **Connect** (arriba) → *Connection string* → método **Session pooler**. Tiene esta forma (sin la contraseña real):
   `postgresql://postgres.<ref>:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
   Reemplazar `[YOUR-PASSWORD]` por la contraseña, agregar `?sslmode=require` al final y guardarla en el gestor.
5. Para que Claude aplique las migraciones: agregarla **tú** en `apps/api/.env` como una variable aparte, `SUPABASE_DATABASE_URL=…`. `DATABASE_URL` sigue apuntando a la base local, para no tocar el desarrollo. Nunca pegarla en el chat (R1).

### 2.3 Lo que hace Claude

Leyendo `SUPABASE_DATABASE_URL` del `.env` sin mostrarla en pantalla:

1. `prisma migrate deploy` contra Supabase: aplica las migraciones que ya están en el repo, en orden. Nunca `migrate dev` ni `db push` en producción.
2. El seed del catálogo de ejercicios (`prisma/seed.ts`). Solo carga ejercicios, no usuarios de prueba, y no duplica si se corre dos veces.
3. Verificar: `prisma migrate status` sin pendientes, las tablas creadas, el catálogo completo y ningún usuario.
4. Revisar el *Security Advisor* de Supabase contigo (*Advisors → Security*): no debería quedar ningún aviso crítico.
5. Segunda barrera, por migración (`20260928130000_revoke_supabase_api_roles`): quitar a los roles `anon` y `authenticated` de Supabase todo permiso sobre las tablas, también para las futuras. Así, aunque alguien activara la Data API, no tendría acceso. En la base local esos roles no existen y la migración no hace nada.

**Resultado (2026-09-28):** proyecto en North Virginia, Postgres 17.6. Nueve migraciones del repo más la de permisos, aplicadas; 18 tablas, todas con RLS activado (lo activa Supabase al crearlas, porque el proyecto tiene *automatic RLS*); `anon` y `authenticated` sin permisos; 54 ejercicios en el catálogo y ningún usuario. La API se conecta como dueña de las tablas, así que RLS no le afecta. Al crear el proyecto quedó marcada *Automatically expose new tables*; la migración de permisos lo neutraliza.

### 2.4 Qué queda para el paso 3

- En Render, `DATABASE_URL` es la misma URL del *session pooler*. Las migraciones de cada deploy se corren al construir (`prisma migrate deploy`), con la misma variable.
- Después del paso 3, `SUPABASE_DATABASE_URL` puede quedarse en el `.env` local solo para los respaldos (2.5) o borrarse.

### 2.5 Respaldos durante el piloto

- **Cada lunes por la mañana** (decisión del 2026-10-10) y antes de cada migración nueva: un `pg_dump` de la base de Supabase a un archivo local, guardado fuera del repo (por ejemplo, en una carpeta privada de Google Drive). Contiene datos de personas: nunca en el repo, que es público, ni en un chat.
- **Script de un solo comando** (hecho el 2026-10-06): `bash apps/api/scripts/respaldo-supabase.sh`. Lee `SUPABASE_DATABASE_URL` de `apps/api/.env` (nunca la imprime), respalda solo el esquema `public` (sin los esquemas internos de Supabase) en formato comprimido y guarda el archivo en `~/Respaldos-Cycles` con permisos solo para ti. Si el respaldo falla, no deja un archivo a medias.
- **Necesita `pg_dump` 17 o más nuevo** (Supabase usa Postgres 17; un `pg_dump` más viejo se niega a funcionar). En el Mac de la fundadora, macOS 14 ya no tiene soporte de Homebrew y `brew` no logró descargarlo, así que se compiló solo el cliente desde la fuente oficial (`postgresql-17.11`, suma sha256 contrastada con la de Homebrew) en `~/.local/pg17`; el script lo busca primero ahí.
- **Respaldos hechos:** 2026-10-06 y 2026-10-10 (este último ya con la migración del PR #44, que agregó `ExerciseLog.active`; esa migración no tuvo respaldo previo propio, la cubre el del 06-10). El recordatorio recurrente de los lunes lo crea la usuaria (T-024).
- **Restauración probada** (2026-10-06): se restauró en una base local descartable y los conteos de 10 tablas coincidieron con producción. Al restaurar en un Postgres anterior al 17 sale el aviso inofensivo `unrecognized configuration parameter "transaction_timeout"`. Para restaurar: `~/.local/pg17/bin/pg_restore --no-owner --no-acl -d <base> <archivo>`.

### 2.6 Listo cuando

- [x] Proyecto creado en North Virginia, con verificación en dos pasos en la cuenta y la contraseña en el gestor.
- [ ] Data API desactivada.
- [x] Migraciones aplicadas (`prisma migrate status` sin pendientes) y catálogo de ejercicios cargado.
- [x] Sin avisos críticos en el *Security Advisor* (2026-09-28: 0 errores, 0 advertencias y 18 avisos informativos *RLS Enabled No Policy*, uno por tabla, esperados: nadie debe entrar por la Data API).
- [x] Ninguna URL ni contraseña de la base en el repo, en un issue ni en el chat.

## Paso 3 · API en Render

**Objetivo:** la API corriendo en `https://api.getcycles.app`, conectada a la base de Supabase, con todas las variables de producción. La web (paso 4) todavía no existe, así que al terminar este paso la API responde pero nadie la usa.

### 3.1 Decisiones *(2026-09-28)*

| Tema | Decisión | Por qué |
|---|---|---|
| **Plan** | **Gratis por ahora**; pasar a *Starter* (7 USD/mes) antes de abrir el piloto si la espera molesta | En el plan gratis la API se duerme tras 15 min sin uso: la primera visita tarda ~50 s, y los contadores en memoria (límite de intentos, alertas de 1E) se reinician al dormirse. Para probar alcanza. |
| **Región** | Virginia (US East) | La misma que la base (paso 2). |
| **Configuración** | Archivo `render.yaml` en el repo (*Blueprint*) | Build, arranque, región y variables no secretas quedan versionados; en el panel de Render solo se cargan los secretos. |
| **Google OAuth** | Se crea **en este paso** (adelanta el paso 5) | La API no arranca en producción sin `GOOGLE_*` (validación de 1B), y las URLs definitivas ya se conocen porque el dominio está decidido. |
| **Dominio** | `api.getcycles.app` se conecta **en este paso** (adelanta parte del paso 6) | Así `GOOGLE_CALLBACK_URL` y la URL que usa el resumen diario son definitivas desde el principio. |
| **Resend** | Una **API key nueva** solo para producción, con permiso de solo envío | Si se filtra la del `.env` local, no compromete producción, y cada una se puede revocar por separado. |
| **Migraciones** | Al final del build (`prisma migrate deploy`) | El plan gratis no tiene *pre-deploy command*. Si la compilación falla, no se migra. |
| **IP real del cliente** | `CLIENT_IP_HEADER=true-client-ip` (en `render.yaml`) | Encontrado al probar P-11 en producción: con `TRUST_PROXY=1` la API veía la IP de un proxy interno de Render, no la del cliente (S-13). `True-Client-IP` lo pone Cloudflare y el cliente no puede pisarlo. |

### 3.2 Qué deja listo el repo *(hecho)*

- `render.yaml`: servicio `cycles-api`, plan gratis, Virginia, build con `npm ci --include=dev` (con `NODE_ENV=production` npm omitiría las herramientas de compilación), `prisma generate`, `nest build` y `prisma migrate deploy`; arranque con `node apps/api/dist/main.js`; se redespliega solo cuando cambia algo de la API.
- `GET /health`: responde 200 para el *health check* de Render. No consulta la base, para que una caída breve de Supabase no reinicie la API.
- Node 22 fijado en `package.json` (`engines`).
- Probado en una copia limpia del repo con `NODE_ENV=production`: compila, arranca, `/health` da 200, CORS solo acepta `app.getcycles.app` y `/auth/google` redirige a Google.

### 3.3 Lo que haces tú: Google Cloud

1. En **console.cloud.google.com**, crear un proyecto `Cycles`.
2. **Google Auth Platform → Branding** (antes *Pantalla de consentimiento*): nombre `Cycles`, email de soporte, dominio autorizado `getcycles.app`.
3. **Audience:** *External*, en modo **Testing**. Agregar como *test users* tu email y el de los coaches del piloto (hasta 100). Publicar la app se decide en el paso 7.
4. **Clients → Create client → Web application**, nombre `Cycles producción`:
   - *Authorized JavaScript origins:* `https://app.getcycles.app`
   - *Authorized redirect URIs:* `https://api.getcycles.app/auth/google/callback`
5. Guardar el **Client ID** y el **Client secret** en el gestor. El secret no se vuelve a mostrar completo.
6. *(Opcional, para probar Google en local, P-09)* un segundo cliente `Cycles local` con origen `http://localhost:5173` y redirect `http://localhost:3000/auth/google/callback`, cargado en `apps/api/.env`.

### 3.4 Lo que haces tú: secretos

En tu terminal, uno por uno: se copia al portapapeles sin mostrarse. Pegarlo en el gestor antes de generar el siguiente.

```bash
openssl rand -hex 64 | pbcopy
```

- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET`: dos valores distintos, nuevos (nunca los de desarrollo).
- `ACTIVITY_CRON_SECRET`: el tercero; va en Render y en GitHub.
- **Resend:** crear una API key nueva, `Cycles producción`, con permiso *Sending access* y dominio `mail.getcycles.app`.

### 3.5 Lo que haces tú: Render

1. Crear la cuenta en **render.com** con GitHub y activar la verificación en dos pasos.
2. **New → Blueprint**, elegir el repo `cycles` (rama `main`). Render lee `render.yaml` y pide los valores marcados como secretos:
   - `DATABASE_URL`: la misma URL del *session pooler* de Supabase (paso 2).
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACTIVITY_CRON_SECRET`: los de 3.4.
   - `RESEND_API_KEY`: la key nueva de producción.
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: los de 3.3.
   - `SLACK_SECURITY_WEBHOOK_URL`, `SLACK_ACTIVITY_WEBHOOK_URL`: los mismos webhooks del `.env` local.
3. **Apply.** El primer build tarda unos minutos. Si falta o está mal una variable, el log dice cuál y la API no arranca.

### 3.6 Lo que haces tú: dominio

1. En Render: *cycles-api → Settings → Custom Domains → Add* `api.getcycles.app`.
2. En Cloudflare, en la zona `getcycles.app`, un registro **CNAME** `api` → `cycles-api.onrender.com`, con el proxy **desactivado** (*DNS only*).
3. En Render, *Verify*. El certificado HTTPS se emite solo.

### 3.7 GitHub (resumen diario)

- Variable `CYCLES_API_URL` = `https://api.getcycles.app`: la carga Claude con `gh`, si le das el visto bueno.
- Secreto `ACTIVITY_CRON_SECRET`: lo cargas tú en *Settings → Secrets and variables → Actions*, o en tu terminal con `gh secret set ACTIVITY_CRON_SECRET`, que lo pide sin mostrarlo.

### 3.8 Qué verifica Claude

- `https://api.getcycles.app/health` da 200 con HTTPS válido.
- CORS: responde a `https://app.getcycles.app` y a ningún otro origen.
- Login con credenciales inválidas da 401; a la sexta vez con el mismo email da 429 y llega **una** alerta a `#cycles-seguridad` con la IP real, no la del proxy (**P-11** y **P-12**).
- `/auth/google` redirige a Google con el `redirect_uri` de producción.
- El workflow del resumen, ejecutado a mano, responde 200 sin duplicar (parte de **P-13**).
- Ningún secreto en el log del deploy.

### 3.9 Listo cuando

- [x] La API responde en `https://api.getcycles.app/health`, con HTTPS válido.
- [x] Todas las variables cargadas en Render y en el gestor; ningún secreto en el repo ni en el chat. `CYCLES_API_URL` y `ACTIVITY_CRON_SECRET` cargados en GitHub.
- [x] Verificaciones de 3.8 pasadas (2026-09-28): CORS solo para `app.getcycles.app`; login inválido 401 y 429 al sexto intento con el mismo email; límite por IP que no se puede esquivar con IPs inventadas; alerta a `#cycles-seguridad` con la IP pública real; `/auth/google` con el `redirect_uri` de producción; el workflow del resumen, ejecutado dos veces a mano, respondió `sent: true` y luego `sent: false`.

**Lo que salió al probar:** con `TRUST_PROXY=1` la API veía la IP de un proxy interno de Render (S-13). Se corrigió con `CLIENT_IP_HEADER` (PR #19) y se volvió a verificar.

### 3.10 Arranque en frío del plan gratuito *(2026-10-06)*

Render gratis duerme la API tras 15 minutos sin tráfico y tarda hasta un minuto en despertar. La landing no se ve afectada (carga en 0,24 s desde Vercel), pero quien ya tiene sesión veía "Cargando…" sin explicación y el primer envío del formulario de la landing esperaba igual.

- [x] **PR #38:** apenas carga la web (solo en producción) se hace un `GET /health` de calentamiento en segundo plano (`mode: "no-cors"`); la pantalla de carga explica a los 4 s que se está despertando el servidor; el formulario de la landing lo explica a los 5 s.
- [ ] **Monitor externo** que pida `https://api.getcycles.app/health` cada 10 minutos para que no se duerma (decidido: cron-job.org, con aviso por correo tras 3 fallos seguidos; un monitor con el plan gratuito de UptimeRobot no sirve para uso comercial). Lo crea la fundadora.
- [ ] **Confirmar en Render que `cycles-api` es el único servicio gratuito:** mantenerlo despierto gasta unas 744 de las 750 horas gratis del mes; con otro servicio gratuito se pasarían y Render suspendería los gratis hasta fin de mes.
- [ ] **Comprobar que funciona** (P-20): más de 15 minutos después de crear el monitor, `GET /health` debe responder en menos de 2 segundos.
- Alternativas si el monitor falla: un Worker de Cloudflare con cron cada 5 minutos, o pasar a un plan de Render sin suspensión por inactividad.

## Paso 4 · Web en Vercel

**Objetivo:** la web en `https://app.getcycles.app`, hablando con la API de producción, con las cabeceras de seguridad de 1D. Al terminar, Cycles se puede usar de punta a punta desde internet.

### 4.1 Qué deja listo el repo *(hecho)*

`apps/web/vercel.json`:
- **Build:** Vite, `npm run build`, salida `dist`. Vercel instala desde la raíz del monorepo (npm workspaces), así que `@cycles/shared` funciona igual que en local.
- **Rutas:** toda ruta que no sea un archivo cae en `index.html`, para que al recargar `/sessions/:id/registro` o cualquier otra pantalla no dé 404.
- **Solo redespliega si cambia la web** (`ignoreCommand`): cambios de la API o de docs no gastan builds.
- **Cabeceras de seguridad (1D de `docs/PLAN-Seguridad.md`):** `Content-Security-Policy` (scripts solo del propio sitio; la web solo puede llamar a `api.getcycles.app`; fuentes de Google Fonts; no se puede embeber en otro sitio), `Referrer-Policy: no-referrer`, `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy` (sin cámara, micrófono ni ubicación), `Strict-Transport-Security` y `Cross-Origin-Opener-Policy`.
- **Caché:** los archivos de `/assets` (con hash en el nombre) se cachean un año.
- Probado en local: el build de producción no tiene scripts en línea; servido con estas cabeceras, la pantalla de login carga con sus fuentes y sin errores de CSP en la consola.

### 4.2 Lo que haces tú: Vercel

1. Crear la cuenta en **vercel.com** con GitHub (acceso solo al repo `cycles`) y activar la verificación en dos pasos.
2. **Add New → Project**, importar `mariapazGomez/cycles`:
   - **Root Directory:** `apps/web`.
   - **Framework:** Vite (lo detecta; `vercel.json` manda igual).
   - **Environment Variables:** `VITE_API_URL` = `https://api.getcycles.app` (no es secreta: termina dentro del JavaScript público, R10).
3. **Deploy.** Vercel da una URL `*.vercel.app` para probar.

### 4.3 Lo que haces tú: dominio

1. En Vercel: *Project → Settings → Domains → Add* `app.getcycles.app`. **Solo ese:** si Vercel sugiere agregar también `getcycles.app` o `www.getcycles.app`, no aceptar; están reservados para la landing (paso 6).
2. En Cloudflare, zona `getcycles.app`: el registro que indique Vercel (normalmente **CNAME** `app` → `cname.vercel-dns.com`), con el proxy **desactivado** (*DNS only*).
3. Vercel verifica y emite el certificado solo.

### 4.4 Qué verifica Claude

- `https://app.getcycles.app` carga; recargar en una ruta interna no da 404.
- Las cabeceras de 4.1 están presentes (y una revisión en securityheaders.com).
- **Recorrido en producción** (con cuentas creadas para la prueba y borradas al final): registro de coach → email de verificación real → login → invitación → el atleta acepta → plan con grid → registro de una sesión → avisos en `#cycles-actividad`. Sin errores de CSP ni de CORS en la consola en ninguna pantalla.
- **Login con Google** de punta a punta con tu cuenta (usuario de prueba): **P-09**.

### 4.5 Listo cuando

- [x] La web responde en `https://app.getcycles.app` con HTTPS válido (2026-09-29).
- [x] Cabeceras de seguridad presentes (2026-09-29, PR #21) y sin errores de CSP en las pantallas públicas. Las pantallas con sesión iniciada se revisan en el recorrido.
- [ ] Recorrido de 4.4 completo, y los datos de prueba borrados.

## Paso 5 · Google OAuth en producción *(por detallar)*

- Las credenciales se crean en el paso 3 (3.3). El login de punta a punta en producción ya se probó (P-09, 2026-09-29). Queda decidir si se publica la app o se sigue con *test users* durante el piloto.
- **Para publicar la app** (que cualquier coach entre con Google sin estar en la lista de *test users*), Google exige en *Branding* una página de inicio y una **política de privacidad** públicas en `getcycles.app`. La política también hace falta para el texto legal del consentimiento de datos (pendiente en `PRD-Autenticacion`, §11).

## Paso 6 · DNS de la web y la API *(por detallar)*

- `app.` se apunta en el paso 4 y `api.` en el paso 3.
- **Cambio 2026-10-03:** la landing vive en `apps/web` y se sirve desde `app.getcycles.app` (ver Paso 9); `www.` y la raíz redirigen a `app.` y mover la landing a `www.` queda para más adelante.
- ~~**`www.` queda reservado para la landing**~~ (otro proyecto de Vercel, no el de la app). Mientras no exista, la raíz y `www.` redirigen temporalmente (302) a `app.` con una regla de Cloudflare; cuando la landing esté lista, `www.` apunta a su proyecto y la raíz redirige a `www.` (301).
- La landing es también el lugar natural para la **política de privacidad** y los términos (por ejemplo `www.getcycles.app/privacidad`), que Google pide para publicar la app (paso 5).
- Actualizar `FRONTEND_URL`, `VITE_API_URL`, CORS y los *redirect URIs* de Google con las URLs definitivas.

## Paso 7 · Prueba de punta a punta y piloto *(por detallar)*

- **Antes de abrir el piloto:** resolver los hallazgos de severidad alta de `docs/SEGURIDAD.md` (S-01 límite de intentos, S-02 tokens de Google en la URL, S-03 dependencias).
- Recorrer: registro de coach → invitación → atleta acepta → plan con grid → registro de una sesión desde el celular → avisos del coach.
- Borrar los datos de prueba y dar acceso a los coaches del piloto.

## Paso 8 · Avisos de actividad del piloto en Slack

**Objetivo:** enterarse de lo que pasa en el piloto sin consultar la base: quién se registra, quién invita, quién entrena. Son avisos informativos para el equipo, no para los usuarios, y **no son alertas de seguridad**: esas van por su propio canal (`docs/PLAN-Seguridad.md`, 1E).

**Canal:** un canal de Slack distinto al de seguridad, por ejemplo `#cycles-actividad`, con su propio *incoming webhook*.

### 8.1 Qué se avisa

| Evento | Cuándo | Ejemplo de mensaje |
|---|---|---|
| **Coach nuevo** | Al verificar el email (no al registrarse, para no avisar de cuentas abandonadas) | "Nuevo coach: Mariana R. (ma***@gmail.com)" |
| **Invitación enviada** | Cada vez | "Coach Mariana R. invitó a un atleta" |
| **Atleta nuevo** | Al aceptar la invitación | "Tomás P. aceptó la invitación de Mariana R." |
| **Primer plan de un coach** | Una sola vez por coach | "Mariana R. creó su primer plan: Bloque de fuerza (4 semanas)" |
| **Primera sesión registrada por un atleta** | Una sola vez por atleta | "Tomás P. registró su primera sesión" |
| **Resumen diario** | Todos los días a una hora fija | "Ayer: 2 coaches nuevos, 5 atletas, 14 sesiones registradas, 3 omitidas, 2 ajustes de carga aplicados" |

**Qué no se avisa:** cada serie, cada sesión (salvo la primera), los cambios de plan ni los inicios de sesión. Eso va solo en el resumen diario, para que el canal no se vuelva ruido.

### 8.2 Privacidad

- **Datos mínimos:** nombre abreviado (nombre + inicial del apellido) y email parcialmente oculto. **Nunca** datos de salud ni de rendimiento de un atleta: ni dolor, ni cargas, ni notas (regla R7). El resumen diario solo lleva totales.
- El canal es privado y solo para el equipo.
- Si un coach o atleta pide que no se use su actividad, se agrega una exclusión (anotarlo como decisión abierta si pasa).

### 8.3 Cómo se implementó *(2026-09-28)*

1. **`ActivityNotifier`** (`apps/api/src/activity/`), sobre la misma utilidad de envío a Slack que `SecurityAlertService` (`common/slack/slack.ts`): envío en segundo plano, timeout corto y, si falla, se escribe en el log sin afectar la respuesta.
2. **Puntos de enganche:**
   - `AuthService.verifyEmail` y `AuthService.completeProfile` → coach nuevo (el segundo cubre a los coaches que entran con Google);
   - `AthletesService.invite` → invitación enviada;
   - `AthletesService.acceptInvitation` → atleta nuevo;
   - `CyclesService.create` → primer plan del coach, si es el primero;
   - `ExecutionService.submitFeedback` → primera sesión **completada** del atleta (las correcciones y las omitidas no cuentan).
3. **Resumen diario: disparador externo.** La API tiene un endpoint interno, `POST /internal/activity/daily-summary`, protegido con `Authorization: Bearer <ACTIVITY_CRON_SECRET>`. Lo llama el workflow `.github/workflows/resumen-actividad.yml` (GitHub Actions, gratis). Se eligió así porque en el plan gratis de Render la API se duerme y una tarea interna no correría a la hora; la llamada externa la despierta.
   - **Hora:** 8:00 de Chile. GitHub programa en UTC y Chile cambia de horario, así que el workflow corre a las 11:05 y 12:05 UTC y solo llama si en Chile ya son las 8 o más tarde. **Ventana ampliada el 2026-09-29:** el primer día GitHub atrasó las ejecuciones programadas unas 7 horas (llegaron a las 15:33 y 16:36 de Chile), y con la ventana anterior (solo 8 a 9:59) el resumen no se envió. Ahora llega igual, aunque más tarde; la API evita el duplicado.
   - **Una sola vez por día:** la tabla `ActivityDigest` guarda los días ya enviados. Si Slack falla, se libera el día y el workflow reintenta.
   - **Qué cuenta:** el día anterior completo en hora de Chile (con el cambio de horario resuelto): coaches nuevos, invitaciones, atletas nuevos, planes creados, sesiones registradas y omitidas, ajustes de carga.
   - **El repo es público:** la respuesta del endpoint solo dice si se envió, nunca los totales, porque el log de Actions es visible para cualquiera.
   - Sin `ACTIVITY_CRON_SECRET` la ruta responde 404; con un secreto equivocado, 401.
4. **Variables nuevas** (en `.env.example` y validadas al arrancar): `SLACK_ACTIVITY_WEBHOOK_URL` (secreta y opcional) y `ACTIVITY_CRON_SECRET` (secreta, 64+ caracteres; sin ella no hay resumen). Para probar el canal en local: `SLACK_ACTIVITY_SEND_IN_DEV=true`.
5. **Solo en producción:** con `NODE_ENV` distinto de `production` los avisos quedan en el log, salvo `SLACK_ACTIVITY_SEND_IN_DEV=true`.

### 8.4 Lo que haces tú

- [x] Hora del resumen: 8:00 de Chile (decidido el 2026-09-28).
- [x] Crear el canal `#cycles-actividad` y su *incoming webhook* (hecho el 2026-09-28; el mensaje de prueba llegó).
- [ ] Al hacer el deploy (paso 3): cargar en Render `SLACK_ACTIVITY_WEBHOOK_URL` y `ACTIVITY_CRON_SECRET` (generarlo nuevo, 64+ caracteres).
- [ ] En GitHub → *Settings → Secrets and variables → Actions*: la variable `CYCLES_API_URL` (la URL pública de la API) y el secreto `ACTIVITY_CRON_SECRET` (el mismo valor que en Render).

### 8.5 Listo cuando

- [ ] Llegan al canal los avisos de 8.1 durante una prueba de punta a punta (paso 7).
- [ ] El resumen diario llega a la hora definida, con los totales correctos.
- [x] Ningún aviso incluye datos de salud o rendimiento, ni emails completos (probado en local: una sesión con dolor no lo menciona).
- [x] Sin webhook configurado, la API funciona igual (probado en local el 2026-09-28).

## Paso 9 · Landing y formulario de contacto

**Objetivo:** publicar la landing para coaches ([[PRD-LandingContacto]]) en `https://app.getcycles.app/` y recibir sus mensajes en el canal privado `#cycles-early-adopters`.

### 9.1 Decisiones *(2026-10-03)*

| Tema | Decisión |
|---|---|
| Dónde se sirve | `app.getcycles.app/` para quien no tiene sesión; sin proyecto nuevo de Vercel ni cambios de CORS (mismo origen que la app). |
| `www.` y la raíz | Redirección a `app.getcycles.app` (302 por ahora) con una regla de Cloudflare. |
| Base de datos | Tabla nueva `ContactRequest`, migración `20261003185120_contact_request`; se aplica sola al desplegar la API (`prisma migrate deploy` al final del build). |
| Slack | Canal privado `#cycles-early-adopters`, variable `SLACK_CONTACT_WEBHOOK_URL` (secreto, `sync: false` en `render.yaml`). Sin ella, los mensajes igual quedan guardados. |

### 9.2 Orden

1. **Respaldo** de Supabase (`pg_dump`, plan 2.5) antes de mezclar: es una migración nueva.
2. **Regenerar el webhook** de `#cycles-early-adopters` (el primero se pegó en una conversación) y guardarlo en el gestor de contraseñas.
3. **Cargar `SLACK_CONTACT_WEBHOOK_URL` en Render** (*cycles-api → Environment*), antes de mezclar para que el primer deploy ya la tenga.
4. **Mezclar el PR.** Render despliega la API y aplica la migración; Vercel despliega la web.
5. **Verificar en producción:** `GET /health`; la landing en `app.getcycles.app` sin sesión; el inicio de la app con sesión; un mensaje de prueba que llegue a Slack y quede en la tabla; el límite por IP con la IP real.
6. **Regla de Cloudflare:** `www.getcycles.app` y la raíz redirigen a `app.getcycles.app`.

### 9.3 Listo cuando

- [x] Respaldo hecho y guardado fuera del repo (2026-10-06, `~/Respaldos-Cycles`, restauración probada). Se hizo después del merge: la migración solo agregó una tabla.
- [ ] Webhook regenerado y `SLACK_CONTACT_WEBHOOK_URL` cargada en Render.
- [ ] Migración aplicada en producción (`prisma migrate status` sin pendientes).
- [ ] Landing visible sin sesión y la app intacta con sesión.
- [ ] Mensaje de prueba recibido en Slack y guardado en `ContactRequest`; se borra después.
- [x] `www.` y la raíz redirigen a `app.` (2026-10-06): dos registros A proxied (`@` y `www` → `192.0.2.1`) y una regla de redirección dinámica 302 en Cloudflare que conserva la ruta y los parámetros. Verificado en `https` y `http`, con ruta (`/login`, `/accept-invitation?token=…`), hasta el 200 de `app.getcycles.app`.
