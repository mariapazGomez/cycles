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
| 1 | Email transaccional con Resend | Sin emails nadie puede verificar su cuenta, recuperar la contraseña ni aceptar una invitación. Se puede hacer y probar en local antes de desplegar nada. | Código listo; falta la cuenta y el DNS (1.3) |
| 2 | Base de datos en Supabase | La API la necesita para arrancar. | Por detallar |
| 3 | API en Render | Depende de la base y de las variables de Resend. | Por detallar |
| 4 | Web en Vercel | Depende de la URL pública de la API. | Por detallar |
| 5 | Google OAuth en producción | Necesita las URLs definitivas de la API y de la web. | Por detallar |
| 6 | DNS de la web y la API | Apunta los subdominios del paso 0 a Vercel y Render. | Por detallar |
| 7 | Prueba de punta a punta y piloto | Cierra el plan. | Por detallar |

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

- [ ] Dominio verificado en Resend, con DKIM y SPF en verde y DMARC cargado.
- [ ] API keys de desarrollo y de producción guardadas en el gestor de contraseñas.
- [x] `MailService` enviando por Resend, con el modo de desarrollo intacto sin key (2026-09-26, rama `feat/email-resend`).
- [x] Las 3 plantillas en HTML y texto, con "tú" y colores de marca (`apps/api/src/mail/templates.ts`).
- [x] La invitación ya no deja el email tomado si falla el envío (probado con una key inválida: responde 503 y no queda el usuario).
- [x] `.env.example` documenta `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` y `FRONTEND_URL`.
- [ ] Probado de punta a punta con emails reales (1.6).

### 1.8 Riesgos

- **Emails en spam** al principio, con un dominio nuevo: DMARC, un remitente estable y poco volumen al inicio lo mitigan.
- **Enlaces con la URL equivocada** si `FRONTEND_URL` no se actualiza en producción: queda en la lista del paso 3.
- **Nadie recibe las respuestas** si `MAIL_REPLY_TO` apunta a un buzón que no existe: comprar el dominio no crea casillas de correo. Cloudflare ofrece *Email Routing* gratis para reenviar `soporte@getcycles.app` a tu correo personal, sin crear una casilla nueva.
- **Límite diario del plan gratuito:** solo es un problema si se invita a muchos atletas de golpe, cosa que no pasa en un piloto chico.

---

## Paso 2 · Base de datos en Supabase *(por detallar)*

- Crear el proyecto en la región más cercana y guardar la contraseña de la base en el gestor.
- Connection string con *pooler* para la API y conexión directa para migraciones (`prisma migrate deploy`).
- Aplicar las migraciones, cargar el catálogo de ejercicios (seed) y definir los backups.

## Paso 3 · API en Render *(por detallar)*

- Web service desde el repo (monorepo, `apps/api`), con build `prisma generate` + `nest build` y migraciones al desplegar.
- Variables: `DATABASE_URL`, `JWT_*` nuevos (no reutilizar los de desarrollo), `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL`, `GOOGLE_*`, `PORT`.
- Restringir CORS al dominio de la web (hoy `enableCors()` acepta cualquier origen).
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
