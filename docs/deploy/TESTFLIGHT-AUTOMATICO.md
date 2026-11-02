---
type: guide
status: active
created: 2026-11-02
updated: 2026-11-02
tags: [testflight, ios, registro, apple]
---

# Invitación automática a TestFlight (CYC-194)

Cuando un atleta se registra y dice que usa **iPhone**, Cycles lo agrega solo al grupo externo **Piloto** de TestFlight y Apple le envía la invitación con la descarga. Si usa **Android**, recibe un correo con el acceso por la web del celular.

## Cómo funciona

1. En el registro del atleta (solo el registro propio, no la invitación de un coach ni Google) se pregunta «¿Qué teléfono usas?». Con iPhone se pide el correo del Apple ID, precargado con el de la cuenta.
2. Al registrarse queda anotado en `BetaInvite` (estado `pending`). **No se invita todavía:** se espera a que verifique el correo de su cuenta de Cycles, para que nadie dispare invitaciones de Apple a correos ajenos.
3. Al verificar, la API llama a la App Store Connect API: crea el tester y lo suma al grupo. Si el tester ya existía en Apple, solo lo suma al grupo.
4. Si Apple falla, el registro **no se bloquea**: queda `failed` con el motivo (sin el correo) y llega un aviso a Slack (canal de actividad). Se reintenta con el endpoint de abajo.
5. Un mismo correo de Apple nunca se invita dos veces (índice único). Las cuentas demo nunca se invitan.

Sin las variables de Apple la integración está **apagada**: el registro funciona igual y las invitaciones quedan `pending` hasta que se configure.

## Variables de entorno (solo en Render)

| Variable | Qué es |
|---|---|
| `APP_STORE_CONNECT_KEY_ID` | ID de la llave (10 caracteres) |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID de la cuenta |
| `APP_STORE_CONNECT_PRIVATE_KEY` | El contenido del archivo `.p8`, completo |
| `TESTFLIGHT_GROUP_ID` | ID del grupo externo «Piloto» |

Van las cuatro juntas o ninguna (la API no arranca con algunas). **Nunca** en el repo, en el chat ni en el cliente; la copia de respaldo va en 1Password.

## Crear la llave (una sola vez, la hace quien administra la cuenta de Apple)

1. App Store Connect → **Usuarios y acceso** → **Integraciones** → **App Store Connect API** → **Generar llave de API**.
2. Nombre «Cycles TestFlight». **Acceso: «App Manager»** (el rol más bajo que puede administrar testers de TestFlight; no uses Admin).
3. Descarga el `.p8` **una sola vez** (Apple no lo muestra de nuevo) y guárdalo en 1Password. Anota el **ID de la llave** y el **Issuer ID** que aparece arriba en la misma página.
4. **ID del grupo Piloto:** App Store Connect → Mi app → **TestFlight** → grupo externo **Piloto**; el ID está al final de la dirección de la página del grupo (`.../testflight/groups/<ID>`).
5. En Render → servicio de la API → **Environment**: pega las cuatro variables. El `.p8` se puede pegar tal cual (con saltos de línea) o en una línea con `\n`.
6. El grupo necesita una compilación **aprobada por Beta App Review** para que la invitación sirva.

## Reintentar las pendientes y las fallidas

Después de cargar las variables (o si Apple estuvo caído):

```bash
curl -X POST https://api.getcycles.app/internal/testflight/retry -H "Authorization: Bearer $ACTIVITY_CRON_SECRET"
```

Responde solo conteos (`{ "enabled": true, "invited": 2, "failed": 0 }`). Máximo 10 intentos por invitación. Cuando exista el panel de administración (CYC-193) se verá y reintentará desde ahí.

## Prueba de punta a punta

Con un Apple ID real de prueba: registrar un atleta con iPhone, verificar el correo, y comprobar que llega la invitación de TestFlight. Las pruebas automáticas (`apps/api/test/testflight.e2e-spec.ts`) simulan a Apple y no la reemplazan.

## Privacidad

El correo del Apple ID y el teléfono son datos nuevos. Están en la política de privacidad (**versión 1.2**, 2026-11-02), se borran con la cuenta (`ON DELETE CASCADE`) y salen en la exportación de datos. Subir `POLICY_VERSION` hace que todas las personas vuelvan a aceptar la política en su próximo ingreso; hay que **recargar la demo** (`MANUAL-DEMOS.md`).
