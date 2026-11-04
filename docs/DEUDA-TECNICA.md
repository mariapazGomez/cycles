# Deuda técnica — Cycles

Lista de deuda técnica conocida, para atacar cuando haya espacio. No es un PRD ni bloquea nada: es un registro de atajos y huecos conocidos para no perderlos de vista. Cada ítem indica impacto y, cuando aplica, dónde está.

Última actualización: 2026-11-01 (CYC-106: se revisó cada ítem contra el código; los resueltos quedan tachados con su fecha).

## Testing y calidad

### 1. Tests automatizados incompletos (`apps/web` no tiene ninguno)
Hoy hay pruebas en dos de los tres workspaces: `apps/api` (Jest, Prisma simulado, sin base de datos: 7 archivos `*.spec.ts` en `main` al 2026-11-01 — ciclos y plantillas, sesiones, ejercicios, acceso y roles) y `apps/mobile` (Jest, 19 archivos en `__tests__`: auth, cliente HTTP, Keychain, pantallas, isla de pestañas, temporizador). **`apps/web` sigue sin ningún test ni ejecutor de pruebas**, y la API no cubre auth, ejecución, seguimiento ni avisos.
**Impacto:** medio-alto — la web (el cliente más grande) se verifica solo con `tsc` y a mano; auth y ejecución son los candidatos críticos para sumar pruebas.
**Avance:** 2026-10-27, Jest en `apps/api`; la app móvil trae Jest desde su scaffold (2026-09-25), con pruebas desde octubre. Ver también CYC-90 (tests de autorización) y CYC-98 (tests de flujos).

### ~~2. ESLint no está realmente instalado en `apps/web` ni `apps/api`~~ **Resuelto** (2026-11-01, CYC-97)
Los scripts `lint` de web y API no funcionaban: ESLint solo estaba instalado de forma anidada en `apps/mobile`, no en la raíz. Ahora cada workspace declara `eslint` 8, `@typescript-eslint` y su `.eslintrc.cjs` (la web suma `eslint-plugin-react-hooks`). Resultado inicial: **0 errores**; 2 avisos de `no-explicit-any` en `throttle.ts`. Se corrigieron 4 `useMemo` de la web cuyo arreglo (`data ?? []`) cambiaba en cada render y 1 expresión regular de caracteres de control intencional. `npm run lint` corre los tres workspaces. Ya corre en el CI (job «ESLint»).

### 3. CI de calidad: hecho en parte (CYC-91, 2026-11-01)
`.github/workflows/ci.yml` corre en cada PR y en cada push a `main`: tipos y pruebas de la API (con `prisma generate`), tipos y compilación de la web, tipos y pruebas de la app móvil, y `npm audit` de producción. `android.yml` compila la app de Android y `resumen-actividad.yml` manda el aviso diario a Slack.
**Queda:** (1) ~~ESLint~~ ya corre en el CI (job «ESLint»); (2) la **auditoría solo avisa** (el paso usa `continue-on-error`) porque hay avisos altos que exigen migrar NestJS (CYC-94): al migrar, quitar `continue-on-error`; (3) hay que **exigir el CI en la protección de la rama `main`** (Settings → Branches), que solo la fundadora puede configurar.
**Impacto:** medio — la red existe, pero no bloquea la mezcla hasta activar la protección de rama.

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

### ~~8. Tokens de sesión en AsyncStorage plano~~ **Resuelto** (2026-10-02, verificado 2026-11-01)
`apps/mobile/src/services/tokenStore.ts` usa `react-native-keychain` (Keychain de iOS, Keystore de Android), migra la sesión antigua y descarta el Keychain heredado de una instalación anterior. Ver `docs/SEGURIDAD.md`, hallazgo S-09. Falta confirmarlo en un dispositivo con TestFlight.

### ~~9. `API_URL` hardcodeada~~ **Resuelto** (2026-10-02, verificado 2026-11-01)
`apps/mobile/src/config/env.ts` distingue el modo: en desarrollo (`__DEV__`) usa la API local (`10.0.2.2` en el emulador de Android) y las compilaciones Release usan `https://api.getcycles.app`. **Queda:** no hay una variante de staging; si hace falta probar contra otra API hay que cambiar el archivo. CYC-13 se cerró por esto.

### ~~10. Expiración real del refresh token no desloguea al usuario~~ **Resuelto** (2026-11-01, CYC-103, PR #118)
`httpClient` expone `onSessionExpired` y `AuthContext` lo usa para pasar a «sin sesión» cuando el servidor rechaza el refresh o ya no hay refresh token; un fallo de red no cierra la sesión. Pruebas en `apps/mobile/__tests__/httpClient.test.ts` y `AuthContext.test.tsx`.

### 11. Sin error boundary ni reporte de crashes — resuelto (CYC-104, 2026-11-04)
La app móvil tiene un error boundary de toda la app (`AppErrorBoundary`: aviso «Algo salió mal» con «Reintentar» en vez de pantalla en blanco) y reporte de caídas con Sentry, sin datos personales (ver [`SEGURIDAD.md`](SEGURIDAD.md), «Reporte de caídas»). **Queda:** subir los mapas de código fuente a Sentry para que las trazas de JavaScript sean legibles (requiere un token de Sentry en Xcode Cloud y en GitHub), y el reporte de la web (no incluido).

## Backend

### 12. Migraciones de Prisma generadas a mano
Como el entorno de desarrollo no soporta `prisma migrate dev` (requiere terminal interactiva), las migraciones se generan con `prisma migrate diff` y se aplican con `migrate deploy`. El procedimiento ya está escrito y probado en [`docs/MIGRACIONES.md`](MIGRACIONES.md) (CYC-105). **Queda:** no hay verificación automática de que el esquema y las migraciones coincidan; se podría agregar al CI un paso que aplique las migraciones a una base vacía y compruebe que `migrate diff` sale vacío.
**Impacto:** bajo — es un punto de error humano en cada migración nueva, ahora con receta.

### 13. El diagrama HTML del modelo de datos está desactualizado
`docs/diagrams/modelo-relacional.html` no tiene `Routine`, `RoutineExercise`, `SessionFeedback`, `LoadAdjustment`, `Notification` ni `PolicyAcceptance`. El diagrama de [[PRD-General]] §6 sí está al día (se generó del `schema.prisma` el 2026-11-01), pero el HTML es un dibujo hecho a mano.
**Impacto:** bajo — confunde a quien lo abra. **Posible salida:** generarlo igual que el de PRD-General, o quitarlo y dejar solo el de Mermaid.
