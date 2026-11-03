---
type: design
parent: "[[PRD-General]]"
status: proposed
tags: [diseno, admin, web, seguridad]
created: 2026-11-03
updated: 2026-11-03
---

# Panel de administración de Cycles (CYC-212)

> Diseño previo de CYC-193. Solo web, solo para la fundadora. Bloquea CYC-193. **Contrastado con `origin/main` de25ad6.** Estado: propuesto, pendiente de aprobación de la usuaria. Se ve en [`propuestas.html`](propuestas.html): pestañas, estados y anchos conmutables.

## Verificado contra origin/main de25ad6

| Archivo | Qué hay hoy y cómo lo usa el diseño |
|---|---|
| `apps/api/prisma/schema.prisma` `User` | Ya tiene `role`, `emailVerifiedAt`, `dataConsentAt/Version`, `isDemo`, `phonePlatform`, `tourStatus` y `createdAt`. **No tiene `lastLoginAt`** (decisión propuesta: campo nuevo). La política aceptada sale de `common/policy.ts` (`POLICY_VERSION`) y su aceptación por usuario. |
| `components/ProtectedRoute.tsx`, `App.tsx` | Rutas protegidas por sesión y rol (`CoachOnly`). `/admin` entra como ruta hermana, con su propia guarda. |
| `components/UserMenu.tsx` | Menú con Mi cuenta y Cerrar sesión. «Administración» entra entre ambos **solo para la administradora**. |
| `lib/analytics.ts`, `docs/deploy/POSTHOG.md` | PostHog en la UE, sin cookies, **solo web** (la app iOS no se mide). La persona se identifica por **ID interno y rol, nunca por nombre o correo**. Eventos: `$pageview` (ruta limpia, `/cycles/:id`), `login_succeeded`, `coach_registered`, `athlete_invited`, `athlete_joined`, `routine_created`, `cycle_created`, `routine_assigned`, `session_closed`. |
| `styles/global.css` | Tokens `--radius-xs/sm/md/lg/xl/pill` (4/6/8/10/12/999) ya en `main` desde CYC-206/207. El panel los usa tal cual. |
| `docs/enlaces.md` | Lista manual de enlaces; el panel la reemplaza para servicios externos. |

**Consecuencia de diseño:** como PostHog guarda solo el ID interno, el panel **cruza en el servidor** el ID con la base para mostrar nombre y correo. El nombre y el correo nunca viajan a PostHog.

## Decisiones asumidas (propuestas por planificación; la usuaria las confirma)

| # | Decisión | Cómo se refleja en el diseño |
|---|---|---|
| S1 | **Marca de administradora** por lista de correos en variable de entorno del servidor (`ADMIN_EMAILS`), validada en la API. Sin rol nuevo en la base. | `/auth/me` devuelve solo un booleano `isAdmin`, nunca la lista. La interfaz usa ese booleano para mostrar la entrada del menú; la API lo vuelve a validar en cada ruta `/admin/*`. |
| S2 | **Último ingreso:** campo nuevo `lastLoginAt` (migración aditiva con respaldo previo). | Columna «Último ingreso». Las cuentas existentes salen **«Sin dato»** hasta su próximo ingreso. |
| S3 | **PostHog:** clave de **solo lectura** en el servidor; nunca en el cliente. | La web pide a la API `/admin/usage`; el estado «PostHog no conectado» no revela nada de la clave. |
| S4 | **Directorio de correos** en la base de datos, editable desde el panel (decisión del 2-11). | Pestaña «Correos» con edición dentro del panel y datos iniciales cargados por el desarrollo. |

## Cómo entra la administradora

- **Entrada discreta:** ítem **Administración** en el menú de usuario, entre **Mi cuenta** y **Cerrar sesión**, separado por una línea. Aparece **solo** si `isAdmin` es verdadero; para coach y atleta el menú no cambia.
- **Ruta:** `/admin` (con subrutas `/admin/usuarios`, `/admin/uso`, `/admin/correos`, `/admin/enlaces`). Va protegida por sesión **y** por `isAdmin`.
- **Quien intenta entrar sin ser administradora** (coach, atleta o URL escrita a mano): la pantalla es **la misma «No encontramos esta página»** de las rutas que no existen, con **Ir a Inicio**. La API responde 403 y **no registra ningún dato**. Así la interfaz no confirma que existe un panel.
- **Sin sesión:** va a `/login`, como cualquier ruta protegida.
- Cada consulta de datos de usuarios queda registrada con quién, cuándo y qué vista (R de privacidad y GDPR). La administradora ve ese registro al final de «Usuarios».

## Pantallas

Cabecera común: título **Administración** y cuatro pestañas (`role="tablist"`): **Usuarios · Uso · Correos · Enlaces y versiones**. Sin subtítulos grises bajo los títulos.

### 1. Usuarios

- **Totales distintos y arriba:** «Cuentas reales 43» (coaches 12, atletas 31) y, aparte y visualmente más discreta, «Demo 6». Las demo **no suman** en ninguna cifra real.
- **Resumen** (solo reales): registros de la semana (barra por día), coaches con atletas invitados (9 de 12), atletas con al menos una sesión (18 de 31).
- **Dos listas separadas** con un selector: **Reales** y **Demo**. La lista Demo lleva un aviso «Cuentas ficticias. No cuentan en ninguna métrica» y cada fila la etiqueta de texto **Demo**; no basta con el color.
- **Columnas:** Nombre y correo · Rol · Registro · Correo verificado (Sí/No) · Política (versión aceptada o «Pendiente») · Último ingreso («hoy», «hace 3 días», «Sin dato») con la fecha exacta en el `title`.
- **Búsqueda** por nombre o correo y filtros por **Rol** y **Verificación**. **Paginación** de 25 por página (anterior/siguiente y «1–25 de 43»).
- **Detalle** al abrir una fila (panel lateral): solo lo necesario (rol, plataforma de teléfono, estado del tour, relación coach–atleta). **Nunca** contraseñas, tokens ni datos de entrenamiento o salud. Enlace «Ver uso» que abre la pestaña Uso filtrada por esa persona.
- **Registro de consultas** (plegado, al final): quién y cuándo consultó esta vista.
- **Estados:** cargando (esqueletos de fila), vacío («Aún no hay cuentas reales»), sin resultados de búsqueda, error («No pudimos cargar los usuarios. Inténtalo de nuevo.») y muchos usuarios (paginación).

### 2. Uso (PostHog)

- **Periodo:** 7 o 30 días. **Sin demo ni tráfico interno** (se dice en la propia pantalla).
- **Por usuario:** tabla con Usuario (nombre cruzado en el servidor) · Rol · Visitas · Ingresos · Rutinas · Ciclos · Sesiones · Último evento. Orden por columna con `aria-sort`.
- **Por pantalla:** lista de rutas limpias (`/`, `/athletes`, `/biblioteca`, `/cycles/:id`…) con visitas, personas distintas y una barra **acompañada de su número**.
- **Aviso fijo:** «Solo web. La app iOS aún no se mide.»
- **Enlace al panel de PostHog** (CYC-137) para el detalle.
- **Estados:** cargando, vacío («Aún no hay interacciones en este periodo»), **error de PostHog** («No pudimos leer PostHog. Las demás pestañas siguen funcionando.» con **Reintentar**) y **no conectado** («PostHog no está conectado. Falta la clave en el servidor.» sin mostrar valores).

### 3. Correos

- **Tabla del directorio:** Dirección · Para qué sirve · Cómo funciona (**Solo recepción**, **Solo envío**, **Envío y recepción**) · Servicio (Cloudflare Email Routing, Resend…).
- **Editar sin tocar el código:** botón **Editar** por fila y **Agregar correo**; ambos abren el mismo panel lateral con Dirección, Para qué sirve, Cómo funciona y Servicio. **Guardar** confirma con un aviso; **Quitar** pide confirmación.
- **Datos iniciales** (los carga el desarrollo): `redes@` (redes sociales, solo recepción por Cloudflare Email Routing), `privacidad@` (consultas de privacidad), el remitente transaccional de Resend y el correo de contacto.
- **Estados:** vacío («Aún no hay correos. Agrega el primero.»), guardando, error al guardar con el motivo y validación de formato.

### 4. Enlaces y versiones

- **Enlaces rápidos** (tarjetas con nombre del servicio, se abren en otra pestaña): PostHog, Linear, Resend, Supabase, Render, Vercel, App Store Connect y **1Password, que muestra solo el nombre de la bóveda** («Bóveda: Cycles»), nunca un enlace a un secreto ni una contraseña.
- **Versiones y entornos:** tabla con Servicio · Entorno · Versión · Estado: Web (Vercel), API (Render), Base (Supabase, última migración), App iOS (TestFlight o App Store) y **versión vigente de la política de privacidad**. El estado de la última compilación se dice con **texto e ícono** («Correcta», «Falló»), no solo con color.
- **Estados:** cargando y «No pudimos leer la versión de {servicio}» por fila, sin bloquear el resto.

## Armonía visual

- Tokens vigentes: `#1f2228` y `#3080fc` (este solo como estado/selección; los botones usan `#1a66dd`), tipografía Bricolage Grotesque en títulos e Inter en el resto.
- **Radios de CYC-206:** tarjetas y paneles 10, botones y campos 8, celdas y filas 6, marcas internas 4; la cápsula solo para etiquetas pequeñas (rol, «Demo», contador).
- Sin sombras nuevas: líneas finas de `--color-gray-border` y la sombra suave de tarjeta del Inicio.
- Ancho: contenido a 1280 px máximo (es un panel de lectura densa); por debajo de **900 px** las tablas pasan a **filas apiladas** (cada celda con su etiqueta), sin barra horizontal. Las pestañas se desplazan en horizontal si no caben.

## Accesibilidad

- **Teclado:** pestañas con flechas (`role="tablist"`/`tab`/`tabpanel`), orden de tabulación lógico, panel lateral con foco atrapado, Esc para cerrar y foco devuelto al disparador.
- **Tablas:** `caption`, `th scope`, orden con `aria-sort` y botones de columna de ≥ 40 px.
- **Estado que no depende del color:** verificado = ✓ «Sí», pendiente = «No» o «Pendiente»; demo = etiqueta de texto «Demo»; compilación = «Correcta» o «Falló» con ícono; error de PostHog = texto en un banner con rol `alert`.
- **Contraste:** textos `#1f2228` y `#5c6068` sobre blanco (≥ 4,5:1); estados `#1e6b32`, `#9a4a00`, `#a3282c` sobre sus fondos claros.
- **Destinos táctiles:** ≥ 40 px en botones y filas clicables.
- **Anuncios:** cambios de pestaña, resultados de búsqueda («12 resultados») y guardado en una región `aria-live="polite"`.

## Seguridad y privacidad (contra `docs/SEGURIDAD.md`)

- La API valida `isAdmin` en **cada** ruta `/admin/*`; la interfaz solo oculta.
- `/auth/me` expone el booleano, no `ADMIN_EMAILS`.
- La clave de PostHog nunca llega al navegador.
- Se muestra lo mínimo de cada persona; sin contraseñas, tokens ni datos de entrenamiento.
- Las consultas quedan registradas (quién, cuándo, qué vista).
- Las demo se excluyen de totales y de PostHog.

## Preguntas para la usuaria

1. ¿Confirmas S1–S4 (administradora por correo en el servidor, `lastLoginAt`, clave de PostHog solo en el servidor, directorio en la base)?
2. ¿Prefieres que quien intente entrar vea «No encontramos esta página» (recomendado, no revela que el panel existe) o «No tienes acceso»?
3. ¿Las versiones de la app iOS se ingresan a mano (TestFlight/App Store no se leen solos)? Recomendado: un campo editable simple.
4. ¿Las cuentas demo van en una lista aparte dentro de Usuarios (recomendado) o en una pestaña propia?

## Para CYC-193 (implementación)

- API: `GET /admin/users`, `GET /admin/usage`, `GET/PUT/POST/DELETE /admin/emails`, `GET /admin/versions`, todas con `isAdmin` y registro de consulta.
- Base: `lastLoginAt` en `User`, tabla del directorio de correos y tabla de registro de consultas (migraciones aditivas con respaldo).
- Web: ruta `/admin` con guarda propia, entrada en `UserMenu` y las cuatro pestañas.
- Pruebas: un coach y un atleta reciben 403 en la API y la pantalla «No encontramos esta página»; las demo no aparecen en totales ni en Uso.
