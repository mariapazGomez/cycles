---
type: plan
tags: [deploy, infra]
status: draft
created: 2026-09-25
updated: 2026-09-26
---

# Plan de deploy de Cycles

> Plan **sin ejecutar**. Objetivo: tener Cycles accesible en internet para un piloto con 2 o 3 coaches reales, dentro del presupuesto acordado (tier gratuito o menos de 25 USD/mes). Las decisiones de infraestructura ya están cerradas (ver [[PRD-General]] §11 y `docs/ARCHITECTURE.md`): **Supabase** (Postgres), **Render** (API), **Vercel** (web) y **Resend** (email).

## Orden de los pasos

| # | Paso | Por qué en este orden | Estado |
|---|---|---|---|
| 0 | Definir y comprar el dominio | Resend necesita un dominio verificado para enviar a cualquier persona, y la web, la API y Google OAuth van a usar ese mismo dominio. | **Hecho** (2026-09-25) |
| 1 | Email transaccional con Resend | Sin emails nadie puede verificar su cuenta, recuperar la contraseña ni aceptar una invitación. Se puede hacer y probar en local antes de desplegar nada. | **Hecho** (2026-09-26); falta DMARC |
| 2 | Base de datos en Supabase | La API la necesita para arrancar. | **Hecho** (2026-09-28); faltan el script de respaldo (2.5, antes del piloto) y revisar el *Security Advisor* |
| 3 | API en Render | Depende de la base y de las variables de Resend. | Por detallar |
| 4 | Web en Vercel | Depende de la URL pública de la API. | Por detallar |
| 5 | Google OAuth en producción | Necesita las URLs definitivas de la API y de la web. | Por detallar |
| 6 | DNS de la web y la API | Apunta los subdominios del paso 0 a Vercel y Render. | Por detallar |
| 7 | Prueba de punta a punta y piloto | Cierra el plan. | Por detallar |
| 8 | Avisos de actividad del piloto en Slack | Para seguir el piloto sin entrar a la base: quién se suma y qué hace. Comparte la integración con las alertas de seguridad (1E). | **Hecho en código** (2026-09-28); falta probarlo en producción (P-13) |

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
| `<dominio>` (raíz) | Reservado para la landing de marketing, que se diseña aparte. Mientras tanto redirige a `app.` | Vercel |
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
| Estructura de subdominios | `app.getcycles.app` (web), `api.getcycles.app` (API), `mail.getcycles.app` (emails); la raíz `getcycles.app` redirige a `app.` hasta que exista la landing |
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

- **Cada semana** (y antes de cada migración nueva): un `pg_dump` de la base de Supabase a un archivo local, guardado fuera del repo (por ejemplo, en una carpeta privada de Google Drive). Contiene datos de personas: nunca en el repo, que es público, ni en un chat.
- Claude deja un script para hacerlo con un solo comando cuando se abra el piloto (paso 7), y se prueba restaurarlo una vez en la base local.

### 2.6 Listo cuando

- [x] Proyecto creado en North Virginia, con verificación en dos pasos en la cuenta y la contraseña en el gestor.
- [ ] Data API desactivada.
- [x] Migraciones aplicadas (`prisma migrate status` sin pendientes) y catálogo de ejercicios cargado.
- [ ] Sin avisos críticos en el *Security Advisor*.
- [x] Ninguna URL ni contraseña de la base en el repo, en un issue ni en el chat.

## Paso 3 · API en Render *(por detallar)*

- Web service desde el repo (monorepo, `apps/api`), en la región **Virginia (US East)**, la misma de la base (paso 2). Build: `prisma generate` + `prisma migrate deploy` + `nest build`.
- Variables: `NODE_ENV=production`, `DATABASE_URL`, `JWT_*` nuevos (no reutilizar los de desarrollo; 64+ caracteres y distintos), `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL`, `CORS_ORIGINS=https://app.getcycles.app`, `TRUST_PROXY=1`, `GOOGLE_*`, `PORT`, `ACTIVITY_CRON_SECRET` (resumen diario, paso 8) y, opcionales, `SLACK_SECURITY_WEBHOOK_URL` (alertas de seguridad, 1E) y `SLACK_ACTIVITY_WEBHOOK_URL` (avisos de actividad, paso 8). Si falta alguna obligatoria, la API no arranca y el log dice cuál (validación de 1B).
- CORS ya está restringido a `CORS_ORIGINS` (1B de seguridad).
- Plan gratuito: la API se duerme sin uso y tarda en despertar. Evaluar el plan pago más barato durante el piloto.

## Paso 4 · Web en Vercel *(por detallar)*

- Proyecto desde `apps/web`, con `VITE_API_URL` apuntando a la API pública.
- Reescritura de rutas a `index.html`, para que funcionen `/sessions/:id/registro` y el resto al recargar.

## Paso 5 · Google OAuth en producción *(por detallar)*

- Credenciales en Google Cloud con los *redirect URIs* de producción y la pantalla de consentimiento publicada.

## Paso 6 · DNS de la web y la API *(por detallar)*

- Apuntar `app.` a Vercel y `api.` a Render (con los subdominios del paso 0), redirigir la raíz a `app.` y verificar HTTPS en todos.
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
   - **Hora:** 8:00 de Chile. GitHub programa en UTC y Chile cambia de horario, así que el workflow corre a las 11:05 y 12:05 UTC y solo llama si en Chile son las 8 o las 9.
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

