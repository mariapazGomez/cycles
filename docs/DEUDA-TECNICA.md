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

### 4. Design tokens de mobile son un espejo a mano, no compartidos de verdad
`apps/mobile/src/theme/colors.ts` (agregado 2026-09-25) mirror-ea los valores de `apps/web/src/styles/global.css` a mano. Ya no hay hex sueltos ni paletas mezcladas en ningún cliente (resuelto 2026-09-25: ver `docs/DEUDA-TECNICA.md` en `git log` para el estado anterior), pero si `global.css` cambia, alguien tiene que acordarse de actualizar el archivo de mobile — no hay una sola fuente de verdad.
**Impacto:** bajo-medio — hoy es solo 2 clientes; crece si se agrega un tercero o cambian los tokens seguido.
**Posible salida:** mover los tokens a `packages/shared` (ej. un `theme.ts` con los mismos valores) y que ambos clientes lo importen.

## Duplicación y arquitectura

### 5. Lógica de auth/HTTP duplicada entre web y móvil
`apps/web/src/services/{httpClient,tokenStore,authApi}.ts` y `apps/mobile/src/services/{httpClient,tokenStore,authApi}.ts` son casi idénticos (mismo patrón de refresh automático, mismo manejo de errores) pero están escritos dos veces porque usan storages distintos (`localStorage` vs `AsyncStorage`). Cualquier fix futuro (como los bugs de refresh token ya corregidos una vez en la web) hay que replicarlo a mano en el otro cliente.
**Impacto:** medio — ya pasó una vez (el bug de body vacío en `/me/today` solo afectó a mobile porque el código no se comparte) y va a volver a pasar.
**Posible salida:** extraer la lógica agnóstica de storage a `packages/shared` y solo inyectar el adaptador de storage desde cada cliente.

### 6. `packages/shared` se desincroniza del backend real
Ya pasó más de una vez: los tipos de `ExerciseLog`/`SessionFeedback` quedaron con la forma vieja después de implementarse Fase 3 en el backend, se corrigieron a mano al empezar la app móvil (2026-09-25), y horas después, al mergear el frontend web de Fase 3 (hecho en paralelo), aparecieron corregidos otra vez pero con una forma distinta (`| null` en vez de opcional) — dos sesiones resolviendo el mismo desfasaje sin coordinarse. No hay ningún mecanismo (tipos generados desde el schema de Prisma, o un test de contrato) que garantice que `packages/shared` refleje la realidad del backend.
**Impacto:** medio-alto — es fácil que un tipo compartido mienta silenciosamente (TypeScript no avisa de campos de más/de menos en una respuesta JSON real), y ya causó un bug real (`ExerciseLogScreen` mostraba literalmente el texto "null" en peso/RIR vacíos por confiar en el tipo viejo).

## App móvil

### 7. El fix de Metro para evitar React duplicado es frágil
`apps/mobile/metro.config.js` usa `resolver.blockList` con rutas hardcodeadas para bloquear la copia de React de la raíz del monorepo (usada por `apps/web`, en una versión distinta a la de mobile). Si `apps/web` actualiza su versión de React, o si otra dependencia nativa duplica otro paquete, el problema puede reaparecer de otra forma y no va a estar cubierto por este blockList puntual.
**Impacto:** medio — es un workaround necesario hoy, pero quebradizo ante cambios de versiones.

### 8. Tokens de sesión en AsyncStorage plano
`apps/mobile/src/services/tokenStore.ts` guarda el access/refresh token en AsyncStorage sin cifrar, en vez de Keychain (ej. `react-native-keychain`).
**Impacto:** bajo-medio — no es información de pago, pero sí credenciales de sesión.

### 9. `API_URL` hardcodeada
`apps/mobile/src/config/env.ts` apunta siempre a `http://localhost:3000`. No hay variantes de build para staging/producción (ya señalado como decisión abierta en `docs/prds/features/PRD-AppMovilAtleta.md`).
**Impacto:** bloqueante para poder probar la app fuera de la máquina de desarrollo (TestFlight, dispositivo físico, etc.).

### 10. Expiración real del refresh token no desloguea al usuario
Si el refresh token expira de verdad (el intento de refresh falla), `httpClient` lanza un `ApiError`, pero nada conecta ese caso con `AuthContext.logout()`. El usuario queda viendo un error genérico ("No pudimos cargar tu entrenamiento") en vez de volver a la pantalla de Login para reingresar credenciales.
**Impacto:** medio — encontrado durante la revisión de manejo de errores de esta sesión, no corregido aún.
**Dónde:** `apps/mobile/src/services/httpClient.ts` (refreshSession) + `apps/mobile/src/store/AuthContext.tsx`.

### 11. Sin error boundary ni reporte de crashes
No hay un React error boundary a nivel de app ni ninguna herramienta de crash reporting (ej. Sentry). Un error de render no capturado deja la app en blanco sin ningún registro de qué pasó.
**Impacto:** medio, crece a medida que se agregan más pantallas.

## Backend

### 12. Migraciones de Prisma generadas a mano
Como el entorno de desarrollo no soporta `prisma migrate dev` (requiere terminal interactiva), todas las migraciones se generaron con `prisma migrate diff --from-url ... --to-schema-datamodel ... --script` y se aplicaron con `migrate deploy`. Es un proceso manual, sin ninguna verificación automática de que el SQL generado sea exactamente el que `migrate dev` hubiera producido.
**Impacto:** bajo-medio — funcionó bien hasta ahora, pero es un punto de error humano en cada migración nueva.
