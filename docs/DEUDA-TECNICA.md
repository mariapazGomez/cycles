# Deuda técnica — Cycles

Lista de deuda técnica conocida, para atacar cuando haya espacio. No es un PRD ni bloquea nada: es un registro de atajos y huecos conocidos para no perderlos de vista. Cada ítem indica impacto y, cuando aplica, dónde está.

Última actualización: 2026-09-25.

## Testing y calidad

### 1. No hay tests automatizados en ningún workspace
`apps/api`, `apps/web` y `apps/mobile` no tienen un solo test (ni siquiera los specs por defecto que genera NestJS). Todo el desarrollo hasta ahora se verificó a mano: probando el flujo en el navegador/simulador y, para el backend, con `curl` directo.
**Impacto:** alto — cualquier cambio puede romper algo silenciosamente; el auth (con su historial de bugs de refresh token) y el motor de ejecución (Fase 3) son los candidatos más críticos para empezar.

### 2. ESLint no está realmente instalado en `apps/web` ni `apps/api`
Ambos tienen un script `"lint": "eslint src"` en su `package.json`, pero **ninguno de los dos declara `eslint` como dependencia ni tiene un archivo de configuración** (`.eslintrc*` / `eslint.config.*`). El comando "funciona" hoy solo porque `apps/mobile` sí trae ESLint (heredado del template de React Native) y npm workspaces lo hoistea al `node_modules` raíz — es decir, funciona de pura casualidad de instalación, no por diseño.
**Impacto:** medio — no hay ninguna verificación de estilo/calidad real corriendo sobre el código de mayor tamaño del repo (api + web).
**Dónde:** `apps/web/package.json`, `apps/api/package.json`.

### 3. No hay CI
No existe `.github/workflows` ni ningún pipeline equivalente. Nada corre automáticamente typecheck, lint o tests en cada push/PR.
**Impacto:** medio-alto — combinado con los dos puntos anteriores, significa que hoy no hay ninguna red de seguridad automatizada antes de mergear a `main`.

## Diseño y consistencia visual

### 4. Pantallas de auth en la web todavía usan subtítulos
La convención vigente es no usar líneas grises de subtítulo bajo los títulos. Seis pantallas de auth siguen usando la prop `subtitle` de `AuthCard`:
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/pages/RegisterPage.tsx`
- `apps/web/src/pages/ForgotPasswordPage.tsx`
- `apps/web/src/pages/CompleteProfilePage.tsx`
- `apps/web/src/pages/CheckEmailPage.tsx` (título "Revisa tu email")
- `apps/web/src/pages/AcceptInvitationPage.tsx`

**Impacto:** bajo, pero es la inconsistencia más visible del producto respecto a una decisión ya tomada.

### 5. Dos paletas de marca compitiendo sin resolver
`apps/web/src/styles/global.css` aplica `--color-blue: #0066ee` (decisión inspirada en MyFitnessPal). Pero después se midieron los colores reales del logo (`#3080fc` / `#1f2228`, documentados en `docs/brand/identidad-visual.md`) y quedaron **registrados pero nunca aplicados**. La app móvil nueva mezcla ambas paletas sin criterio (usa `#0066ee` de la web y `#1f2228` de la otra paleta a la vez, ver `apps/mobile/src/screens/*.tsx`).
**Impacto:** medio — hay que decidir una sola paleta de una vez y aplicarla consistente en los dos clientes.

### 6. No hay design tokens compartidos entre web y móvil
Cada cliente hardcodea sus propios valores hex de color en vez de tomarlos de una fuente común (ej. un archivo de tokens en `packages/shared`).
**Impacto:** bajo hoy (solo 2 clientes), pero crece con cada pantalla nueva.

## Duplicación y arquitectura

### 7. Lógica de auth/HTTP duplicada entre web y móvil
`apps/web/src/services/{httpClient,tokenStore,authApi}.ts` y `apps/mobile/src/services/{httpClient,tokenStore,authApi}.ts` son casi idénticos (mismo patrón de refresh automático, mismo manejo de errores) pero están escritos dos veces porque usan storages distintos (`localStorage` vs `AsyncStorage`). Cualquier fix futuro (como los bugs de refresh token ya corregidos una vez en la web) hay que replicarlo a mano en el otro cliente.
**Impacto:** medio — ya pasó una vez (el bug de body vacío en `/me/today` solo afectó a mobile porque el código no se comparte) y va a volver a pasar.
**Posible salida:** extraer la lógica agnóstica de storage a `packages/shared` y solo inyectar el adaptador de storage desde cada cliente.

### 8. `packages/shared` se desincroniza del backend real
Ya pasó dos veces: los tipos de `ExerciseLog`/`SessionFeedback` quedaron con la forma vieja después de implementarse Fase 3 en el backend, y tuvieron que corregirse manualmente en esta sesión al empezar la app móvil. No hay ningún mecanismo (tipos generados desde el schema de Prisma, o un test de contrato) que garantice que `packages/shared` refleje la realidad del backend.
**Impacto:** medio-alto — es fácil que un tipo compartido mienta silenciosamente (TypeScript no avisa de campos de más/de menos en una respuesta JSON real).

## App móvil

### 9. El fix de Metro para evitar React duplicado es frágil
`apps/mobile/metro.config.js` usa `resolver.blockList` con rutas hardcodeadas para bloquear la copia de React de la raíz del monorepo (usada por `apps/web`, en una versión distinta a la de mobile). Si `apps/web` actualiza su versión de React, o si otra dependencia nativa duplica otro paquete, el problema puede reaparecer de otra forma y no va a estar cubierto por este blockList puntual.
**Impacto:** medio — es un workaround necesario hoy, pero quebradizo ante cambios de versiones.

### 10. Tokens de sesión en AsyncStorage plano
`apps/mobile/src/services/tokenStore.ts` guarda el access/refresh token en AsyncStorage sin cifrar, en vez de Keychain (ej. `react-native-keychain`).
**Impacto:** bajo-medio — no es información de pago, pero sí credenciales de sesión.

### 11. `API_URL` hardcodeada
`apps/mobile/src/config/env.ts` apunta siempre a `http://localhost:3000`. No hay variantes de build para staging/producción (ya señalado como decisión abierta en `docs/prds/features/PRD-AppMovilAtleta.md`).
**Impacto:** bloqueante para poder probar la app fuera de la máquina de desarrollo (TestFlight, dispositivo físico, etc.).

### 12. Expiración real del refresh token no desloguea al usuario
Si el refresh token expira de verdad (el intento de refresh falla), `httpClient` lanza un `ApiError`, pero nada conecta ese caso con `AuthContext.logout()`. El usuario queda viendo un error genérico ("No pudimos cargar tu entrenamiento") en vez de volver a la pantalla de Login para reingresar credenciales.
**Impacto:** medio — encontrado durante la revisión de manejo de errores de esta sesión, no corregido aún.
**Dónde:** `apps/mobile/src/services/httpClient.ts` (refreshSession) + `apps/mobile/src/store/AuthContext.tsx`.

### 13. Sin error boundary ni reporte de crashes
No hay un React error boundary a nivel de app ni ninguna herramienta de crash reporting (ej. Sentry). Un error de render no capturado deja la app en blanco sin ningún registro de qué pasó.
**Impacto:** medio, crece a medida que se agregan más pantallas.

## Copy / idioma

### 14. Resabios de voseo en el código
La decisión vigente es tutear en español latino neutro en toda la UI, pero partes del código todavía tienen textos en voseo.
**Impacto:** bajo, cosmético, pero inconsistente cara al usuario.

## Backend

### 15. Migraciones de Prisma generadas a mano
Como el entorno de desarrollo no soporta `prisma migrate dev` (requiere terminal interactiva), todas las migraciones se generaron con `prisma migrate diff --from-url ... --to-schema-datamodel ... --script` y se aplicaron con `migrate deploy`. Es un proceso manual, sin ninguna verificación automática de que el SQL generado sea exactamente el que `migrate dev` hubiera producido.
**Impacto:** bajo-medio — funcionó bien hasta ahora, pero es un punto de error humano en cada migración nueva.
