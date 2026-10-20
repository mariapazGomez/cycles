---
type: prd
level: feature
parent: "[[PRD-General]]"
status: draft
phase: "Fase 3.5 — Piloto"
created: 2026-10-12
updated: 2026-10-12
tags: [prd, feature/legal, privacidad]
related: ["[[PRD-Autenticacion]]", "[[PRD-LandingContacto]]", "[[PRD-AppMovilAtleta]]"]
---

# PRD — Política de privacidad y términos de uso

## 1. Qué es y por qué ahora

Dos páginas públicas, `https://app.getcycles.app/privacidad` y `/terminos`, que describen cómo se tratan los datos y las reglas de uso. Las piden **Google** (para publicar el inicio de sesión), **Apple** (App Store y TestFlight externo) y la propia confianza del producto: Cycles guarda datos de salud (notas de dolor). Cierra además un pendiente de [[PRD-Autenticacion]]: el texto legal del consentimiento.

Cada versión lleva número y fecha en su primer párrafo (hoy, versión 1.0, 12 de octubre de 2026).

## 2. Decisiones

- **HTML estático** en `apps/web/public/privacidad/`, `terminos/` y `legal/legal.css`, no pantallas de React: se leen sin JavaScript (lo que piden los revisores), no dependen del bundle y no pasan por la ruta comodín de la app. `vercel.json` los reescribe de forma explícita antes del comodín.
- Mismos colores y tipografías de la marca, lenguaje claro y de "tú", resumen "En pocas palabras" al inicio y tabla de contenido. Sin scripts en línea (la política de seguridad de la web los bloquea).
- **Enlaces con anclas normales** (`<a href>`), no con `<Link>`: así el navegador pide la página estática real.
- Dónde aparecen los enlaces: pie de la landing y nota del formulario de contacto; pie de todas las pantallas de acceso (`AuthCard`); y un aviso de aceptación en el registro del coach, en el perfil con Google y al **aceptar una invitación**. En este último se avisa al atleta de que su coach verá sus entrenamientos y las notas de dolor.
- El tratamiento de los datos de salud se explica aparte (sección 3 de la política): opcionales, solo los ven el atleta y su coach, solo para el seguimiento, y nunca van a los avisos internos.

## 3. Lo que la política afirma (y de dónde sale)

Cada afirmación se respalda en el código o en una decisión previa; si cambia el producto, hay que cambiar el texto:

| Afirmación | Respaldo |
|---|---|
| Contraseñas con hash, enlaces de un solo uso, relación activa para que el coach vea datos | R2 y R5 de `docs/SEGURIDAD.md` |
| No se guarda la IP (ni en `ContactRequest`); se usa en memoria para limitar intentos | `apps/api/src/common/throttle`, `contact.service.ts` |
| Los avisos internos no llevan datos de salud ni de rendimiento; las alertas de seguridad llevan la IP y el correo parcialmente oculto | `activity-notifier.service.ts`, `security-alert.service.ts` |
| Sesión móvil en el llavero del dispositivo | `apps/mobile/src/services/tokenStore.ts` |
| Al terminar la relación el coach pierde acceso y el atleta conserva su historial | PRD-General, "Fin de relación" |
| Estadísticas agregadas y anónimas solo con consentimiento; análisis cruzados futuros pedirán un nuevo consentimiento | VISION, "Principios de diseño de datos" |
| Proveedores y ubicación (Supabase y Render en EE. UU., Vercel, Cloudflare, Resend, Slack, Google, Apple) | `docs/deploy/PLAN-Deploy.md` |
| Sin analítica ni publicidad; el almacenamiento local solo guarda la sesión | `apps/web` (no hay SDK de analítica) |

## 4. Compromisos que hay que poder cumplir (confirmar antes de publicar)

Son plazos y reglas que la política promete y que hoy dependen de personas, no de la app:

1. **Correo `privacidad@getcycles.app`:** debe existir y recibir (por ejemplo, con Cloudflare Email Routing hacia el correo de la fundadora). Hoy `hola@mail.getcycles.app` solo envía.
2. **Responder pedidos de derechos en un máximo de 30 días** y **borrar los datos personales en ese plazo** a pedido. Hoy no hay función de eliminar cuenta en la API: se hace con SQL.
3. **Copias de respaldo conservadas hasta 90 días.** Los respaldos de `~/Respaldos-Cycles` hay que rotarlos.
4. **Mensajes del formulario de contacto: hasta 12 meses** después de la conversación.
5. **Menores:** la política dice "18 años o más, o con autorización de madre, padre o tutor".
6. **Responsable e identificación:** "InProgress Co. (Chile)". Falta el nombre legal completo y la dirección si se quieren incluir; y la ley chilena aplicable (los términos se rigen por las leyes de Chile).
7. **Acceso anticipado gratis y aviso de 30 días antes de cualquier cobro** (términos, sección 2).

## 5. Riesgos y deuda conocida

- **Revisión legal:** el texto lo redactó Claude sobre los datos reales del producto y no ha sido revisado por una persona abogada. Conviene hacerlo antes de abrir el piloto, sobre todo por los **datos de salud** (categoría especial en el RGPD, que aplica con usuarios en España) y la ley chilena de protección de datos personales.
- ~~**El consentimiento sigue siendo un aviso, no un registro**~~ **Resuelto (T-147, 2026-10-20):** la aceptación de los Términos y la Política es explícita (casilla sin marcar) y versionada. Ver §7.
- **Retirar el consentimiento de estadísticas** y **pedir la eliminación o la copia de los datos** hoy son trámites por correo; lo ideal es hacerlos desde la app.
- **App móvil:** ~~falta el enlace a la política y a los términos~~ **resuelto (T-149, 2026-10-20):** la pantalla de inicio de sesión y el menú del perfil enlazan `/privacidad` y `/terminos`. Falta declarar los datos en las "etiquetas de privacidad" de App Store Connect (T-121).
- **Google OAuth:** al publicar la app, cargar `/privacidad` como política y `/terminos` como términos en *Branding*.

## 6. Fuera de alcance

Banner de cookies (no hay cookies no esenciales) y versión en inglés.

## 7. Aceptación explícita y versionada (T-147, 2026-10-20)

- **Qué se guarda:** una fila `PolicyAcceptance` por persona y por versión (`userId`, `version`, `source`, `acceptedAt`). No se borra ni se sobrescribe: es la evidencia de qué texto aceptó y cuándo. Es distinta del consentimiento **opcional** de estadísticas (`User.dataConsentAt`).
- **Versión vigente:** `POLICY_VERSION` en `apps/api/src/common/policy.ts` (hoy `"1.0"`). Debe coincidir con la que dice el primer párrafo de `/privacidad` y `/terminos`. Al cambiar los textos de forma importante, se sube y todas las personas vuelven a ver la pantalla de aceptar.
- **Dónde se acepta** (casilla sin marcar, el formulario no avanza sin ella y la API responde 400 si falta `acceptPolicy`):
  | Flujo | `source` |
  |---|---|
  | Registro del coach | `register` |
  | Aceptar la invitación (atleta) | `invitation` |
  | Perfil con Google | `google_profile` |
  | Pantalla «Antes de seguir» | `reaccept` |
- **Cuentas anteriores o versión nueva:** `GET /users/me` trae `needsPolicyAcceptance`. En la web, `ProtectedRoute` lleva a `/accept-policy` hasta que acepte (`POST /users/me/policy-acceptance`, idempotente).
- **App iOS (T-149):** `PolicyAcceptanceScreen` frena el acceso hasta aceptar la versión vigente, con la misma casilla sin marcar y el aviso de que el coach verá las notas de dolor. Escrita y tipada, **sin probar en un dispositivo ni simulador** (ver P-23). Los atletas nuevos aceptan en la web al activar su cuenta.
