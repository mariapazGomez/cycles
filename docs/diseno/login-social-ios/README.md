---
type: design
parent: "[[PRD-Autenticacion]]"
status: approved
tags: [diseno, auth, ios, google, apple]
created: 2026-11-01
updated: 2026-11-01
---

# Iniciar sesión con Google y con Apple en la app de iOS (CYC-186)

> Cómo entra una persona con Google o con Apple desde el iPhone. Decisiones confirmadas el 2026-11-01 (ver el final). Etapa 1 (API y datos) construida; falta app y consolas.

## Punto de partida

| Pieza | Hoy |
|---|---|
| App móvil | Solo correo y contraseña (`LoginScreen`). Sin botones de Google ni de Apple. |
| Google en el API | Flujo web con redirección: `GET /auth/google`, el callback crea un código de un solo uso (`OAuthExchangeCode`) y la web lo canjea en `POST /auth/google/exchange`. |
| Vinculación | **Solo por correo.** `loginWithGoogle` busca al usuario por email; no se guarda el identificador de Google. |
| Apple en el API | No existe. `AuthProvider` ya tiene el valor `apple`; no hay estrategia, endpoint ni columnas. |
| Registro | Cerrado en el piloto: un correo sin cuenta recibe «registro cerrado» y no se crea nada. |
| Librerías | El API no tiene una librería para verificar tokens firmados (JWT con claves públicas rotativas). La app no tiene SDKs de Google ni de Apple. |
| Xcode | `Info.plist` sin esquemas de URL; sin la capacidad «Sign in with Apple». |

**Una precisión sobre la urgencia.** La guía 4.8 de la App Store exige ofrecer «Sign in with Apple» *si la app ofrece* inicio de sesión con otra red social. Hoy la app iOS no ofrece ninguno, así que no hay incumplimiento. Pasa a ser obligatorio en cuanto se agregue el botón de Google. Por eso van juntos.

## Decisión 1: flujo nativo o navegador del sistema

| | **A. Nativo (recomendado)** | **B. Navegador del sistema** |
|---|---|---|
| Cómo funciona | La app pide el inicio de sesión al sistema (Apple) o al SDK de Google; recibe un **token de identidad** firmado y lo manda al API, que lo verifica. | La app abre la página de Google/Apple en una hoja del navegador y vuelve por un enlace profundo (`cycles://`) con un código. |
| Apple | Botón nativo, Face ID, un toque. Es lo que la revisión espera. | Posible pero incómodo (pide un servicio web y una clave aparte). |
| Google | SDK `@react-native-google-signin/google-signin`; hoja nativa de cuentas del teléfono. | Reutiliza el flujo web actual, pero hay que permitir un destino de redirección a la app (superficie de «redirección abierta», S-02). |
| API nuevo | Un endpoint que recibe el token y lo verifica. Sin códigos intermedios. | Ampliar el callback y la validación de destinos. |
| Dependencias | 2 librerías nativas (Pods) en la app + `jose` en el API. | 1 librería de navegador de sesión + lógica de redirección. |
| Riesgo | Es código nativo que **no se puede probar aquí** (sin simulador): cada intento es una build de Xcode Cloud (~7 min) y los errores de enlace salen ahí. | Menos código nativo; más lógica de seguridad. |

**Recomendación: A para los dos.** Un solo patrón, sin redirecciones que validar, y es lo que Apple espera. Si el SDK de Google no es compatible con React Native 0.87 al probarlo, se cae a B **solo para Google**, sin tocar Apple.

## Decisión 2: cómo se reconoce a la persona

El correo solo no alcanza:

- Apple permite **«Ocultar mi correo»**: entrega una dirección de reenvío (`…@privaterelay.appleid.com`) distinta de la de la cuenta de Cycles. Buscar por correo no la encontraría.
- Un correo puede cambiar; el identificador del proveedor (`sub`) no.

**Propuesta:** una tabla `UserIdentity { userId, provider, subject, email, createdAt }` con `UNIQUE(provider, subject)`.

Orden de decisión al llegar un token válido:

1. Si existe una identidad con ese `provider + subject` → entra esa cuenta.
2. Si no, y el token trae un correo **verificado** que coincide con una cuenta existente → se crea la identidad y entra (igual que hoy con Google).
3. Si no hay cuenta y el registro está cerrado → «registro cerrado», **no se crea nada**.
4. Caso especial: Apple con «Ocultar mi correo» y cuenta existente con otro correo → no se puede enlazar solo. La persona entra con correo y contraseña y toca **Vincular Apple** en su Cuenta (con la sesión iniciada, el API sabe quién es). Se puede dejar para una segunda entrega; mientras tanto el mensaje explica qué hacer.

Los tokens se verifican en el servidor: firma contra las claves públicas del proveedor, emisor, audiencia (nuestros identificadores), caducidad y `nonce` (valor aleatorio que la app genera y el token devuelve, para impedir reutilizar un token robado).

## Decisión 3: pantalla de entrada

```
        Entra a tu cuenta

   [  Continuar con Apple   ]   <- botón negro nativo, arriba (Apple lo pide igual de visible)
   [  Continuar con Google  ]

        ───────  o  ───────

   Email
   Contraseña
   [        Entrar        ]
   Olvidé mi contraseña
```

Los botones respetan las guías de marca de cada proveedor. Errores: cuenta no encontrada con registro cerrado («Todavía no abrimos el registro. Si tu coach te invitó, usa el enlace de tu correo»), cancelación (no es un error), sin conexión.

## Lo que Apple exige además

- **Borrar la cuenta** (guía 5.1.1.v): quien entró con Apple debe poder borrarla y la app tiene que **revocar el permiso en Apple**. Eso requiere guardar un token de actualización de Apple al iniciar sesión y una clave del servidor. Ya existe el borrado en `AccountScreen`; hay que sumarle esta revocación.
- **Cuenta demo para la revisión** (CYC-50): sigue entrando con correo y contraseña; no depende de esto.

## Lo que Google exige además

La pantalla de consentimiento está en modo de prueba (CYC-44, CYC-45): solo entran los **usuarios de prueba** que agregues. Los coaches del piloto deben estar en esa lista, o publicar la app de Google.

## Plan por etapas

| Etapa | Qué | Quién |
|---|---|---|
| 1. API y datos | Migración `UserIdentity`, `jose`, `POST /auth/apple` y `POST /auth/google/token` (o uno solo con `provider`), reglas de vinculación, pruebas con claves simuladas | Claude |
| 2. Consolas | ID de cliente de iOS en Google; capacidad «Sign in with Apple» y clave en el identificador `app.getcycles.mobile`; valores a Render y a 1Password | Usuaria |
| 3. App y Xcode | Botones, librerías, esquema de URL de Google, capacidad de Apple, manejo de errores | Claude |
| 4. Prueba | Build de Xcode Cloud, prueba en TestFlight con cuentas reales | Ambas |
| 5. Después | «Vincular Apple» en Cuenta y revocación al borrar la cuenta | Claude |

La etapa 1 se puede hacer ya, sin las consolas. Las etapas 3 y 4 necesitan la 2.

## Decisiones tomadas (2026-11-01)

1. **Flujo:** nativo para Apple y Google. Si el SDK de Google no funciona con React Native 0.87, solo Google pasa al navegador.
2. **Vinculación:** tabla `UserIdentity` desde ya. «Vincular Apple» en Cuenta queda para una segunda entrega.
3. **Registro:** Apple y Google no crean cuentas mientras el registro esté cerrado.
4. **Google:** los coaches del piloto se agregan como usuarios de prueba (CYC-45); publicar la app de Google (CYC-44) queda para después.
5. **Borrado:** la revocación de Apple al borrar la cuenta se hace antes de enviar a revisión (CYC-135), en la segunda entrega.

## Etapa 1 construida

- Tabla `UserIdentity` (`UNIQUE(provider, subject)`), migración aditiva `20261101120000_identidades_de_usuario`; se borra junto con la cuenta.
- `POST /auth/apple` y `POST /auth/google/token`: reciben `{ idToken, nonce, name? }`, verifican firma, emisor, audiencia, caducidad y nonce con `jose` (v5, por compatibilidad con CommonJS) y devuelven la sesión.
- Variables nuevas en Render: `APPLE_CLIENT_ID` (`app.getcycles.mobile`) y `GOOGLE_IOS_CLIENT_ID`. Sin ellas, los endpoints rechazan todo token.
- El flujo web de Google no cambia (sigue vinculando solo por correo).
