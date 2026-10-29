# Manual para grabar demos de Cycles

Esta guía es para grabar videos y capturas de Cycles (landing, redes, presentaciones a coaches) **sin tocar datos reales**. Todo se graba contra una base aparte, `cycles_demo`, con un coach y ocho atletas ficticios.

> **La regla de oro:** las fechas de la demo se calculan al momento de correr la seed. Pasados unos días la demo queda atrasada (el plan «de esta semana» ya no lo es). **Antes de cada tanda de grabaciones, regenera la demo** (sección 2).

Tarea de origen: CYC-116. El script es `apps/api/scripts/seed-demo.ts`.

---

## 1. Qué hay en la demo

| Cuenta | Correo | Para qué sirve |
|---|---|---|
| Coach | `coach.demo@example.com` (Camila Reyes) | Todo lo del coach: Atletas, Biblioteca, calendario del ciclo |
| 8 atletas | `valentina.soto@`, `matias.fuentes@`, `javiera.munoz@`, `diego.paredes@`, `renata.aguirre@`, `tomas.villalobos@`, `antonia.cardenas@`, `sebastian.rojas@` (todos `@example.com`) | La app del atleta |

- **Contraseña:** una sola para las nueve cuentas, guardada **fuera del repo** en `~/.cycles-secretos/demo/DEMO_PASSWORD` (permisos 600). Nunca la escribas en el repo, en un chat, en Linear ni en Notion, y cuida que no salga a cuadro al grabar.
- **Qué lleva cada atleta:** un ciclo «Fuerza base» (mesociclo de 6 semanas, 3 sesiones por semana: **Piernas**, **Empuje** y **Tirón**) que empezó hace 3 semanas, con la ejecución de las semanas 1 a 4 registrada.
- **Casos que activan «Necesitan atención»:**

| Atleta | Qué pasa |
|---|---|
| Javiera Muñoz | Reporta dolor de rodilla en la semana actual |
| Matías Fuentes | Sentadilla al límite (0 reps en reserva) en las dos últimas sesiones de piernas: carga alta |
| Renata Aguirre | Press de banca con mucho margen (4 reps en reserva): carga baja |
| Diego Paredes | Omitió las dos primeras sesiones de esta semana (viaje, falta de energía) y dejó una sin hacer en la semana 3: poca adherencia |
| Valentina, Tomás, Antonia, Sebastián | Constantes, sin avisos |

---

## 2. Regenerar la demo (hazlo antes de grabar)

**Por qué hay que rehacerla y no solo «correr la seed otra vez»:** la seed ancla el plan al lunes de la semana en que se corre (empieza 3 semanas antes, y la semana 4 es «esta semana»). Si la corres sobre una base que ya tiene datos, no actualiza nada: crea la cuenta del coach solo si no existe (no cambia su contraseña) y falla al volver a crear a los atletas, que ya existen. Por eso se **borra y se recrea** la base.

Desde `apps/api`:

```bash
dropdb cycles_demo && createdb cycles_demo
```

```bash
export DATABASE_URL=postgresql://$USER@localhost:5432/cycles_demo
npx prisma migrate deploy
npx prisma db seed
DEMO_PASSWORD="$(cat ~/.cycles-secretos/demo/DEMO_PASSWORD)" npx tsx scripts/seed-demo.ts
```

Debe terminar con `Demo lista: 1 coach, 8 atletas, 8 planes.` El script se niega a correr si el nombre de la base no contiene `cycles_demo`, para que nunca toque la de desarrollo ni la de producción.

Notas:

- `prisma migrate deploy` deja la base al día con el esquema actual. Hazlo siempre: la demo debe grabarse con la misma versión de la app que estás mostrando.
- Si no existe el archivo de contraseña, genera uno nuevo (16 caracteres o más) y guárdalo ahí con `chmod 600`:
  ```bash
  mkdir -p ~/.cycles-secretos/demo && umask 077 && openssl rand -base64 18 | tr -d '/+=' | cut -c1-16 > ~/.cycles-secretos/demo/DEMO_PASSWORD
  ```
- Si un `pg_dump` falla por «server version mismatch», usa el de Postgres 15: `/opt/homebrew/opt/postgresql@15/bin/pg_dump`.
- La limpieza de datos de prueba **no debe tocar** `cycles_demo`.

---

## 3. Levantar la API y la web contra la demo

La app móvil en desarrollo siempre llama a `http://localhost:3000` (`apps/mobile/src/config/env.ts`). Por eso la forma más simple es **correr la API de la demo en el puerto 3000**, en lugar de tu API de desarrollo. Así la web y el celular funcionan sin cambiar nada.

1. **Apaga tu API de desarrollo** (solo ese proceso, no uses `pkill` amplios: puede haber otra cosa corriendo).
2. **Arranca la API con la base de la demo y sin envíos reales.** Desde 2026-10-28 tu `apps/api/.env` trae vacías las claves de Resend (correo) y de Slack, así que nada se envía. Si alguna vez las vuelves a poner, una invitación o un aviso grabado **enviaría correos o mensajes de verdad**: vacíalas solo para este proceso, como en este comando (no hace daño dejarlas):
   ```bash
   cd apps/api
   DATABASE_URL=postgresql://$USER@localhost:5432/cycles_demo \
   RESEND_API_KEY= SLACK_SECURITY_WEBHOOK_URL= SLACK_ACTIVITY_WEBHOOK_URL= SLACK_CONTACT_WEBHOOK_URL= \
   npm run start:dev
   ```
   Sin `RESEND_API_KEY` los correos se escriben en el log en vez de enviarse; sin las URLs de Slack, los avisos también quedan en el log.
3. **Web:** `npm run dev --workspace apps/web` (usa `http://localhost:3000` por defecto). Confirma que `apps/web/.env` **no** tiene `VITE_POSTHOG_KEY`: así la analítica queda apagada y la grabación no ensucia las métricas del piloto.
4. **App iOS:** ábrela en el simulador (Metro, modo desarrollo). Apunta sola a `localhost:3000`.
5. **Compruébalo antes de grabar:** inicia sesión con `coach.demo@example.com` y mira que aparezcan 8 atletas.

Al terminar de grabar: detén la API de la demo y vuelve a levantar la de desarrollo.

---

## 4. Qué día y a qué hora grabar

La seed deja la **semana 4** como la actual, con sesiones los lunes, miércoles y viernes a las 18:30 (hora de Chile, verano). Marca como hechas las dos primeras sesiones de esa semana (omitidas en el caso de Diego), sin mirar qué día es hoy, y la tercera (viernes) queda pendiente salvo en los atletas «constantes».

- **Lo ideal es grabar un jueves o un viernes antes de las 18:30.** Las sesiones del lunes y del miércoles ya pasaron y el viernes sigue pendiente, como en una semana real. Si grabas un lunes, el calendario mostrará sesiones del miércoles ya «completadas» en una fecha futura.
- **Para grabar el registro de una sesión en el celular**, usa un atleta que tenga la del viernes pendiente (por ejemplo Matías, Javiera o Diego). Los atletas constantes (Valentina, Tomás, Antonia, Sebastián) ya cerraron la semana 4 completa: su próxima sesión pendiente es la de la semana 5.
- **Para mostrar historial y progreso**, usa a Valentina: tiene la ejecución más limpia.
- **Regenera la demo el mismo día que grabas.** Si grabas en dos días distintos, la demo del segundo día seguirá anclada al lunes de la semana en que se corrió la seed; regenerar entre un día y otro cambiaría los números y las fechas entre videos.

### Fechas de las sesiones

Desde 2026-10-28 la seed fija la fecha (`scheduledDate`) de cada sesión: lunes, miércoles y viernes de cada semana, a medianoche UTC, como las que fija la web. Por eso el calendario del coach las ubica en su día y no las marca como «Día tentativo». Si ves esa marca, la base se creó con una versión antigua de la seed: regenérala (sección 2).

---

## 5. Especificaciones para grabar

**Web (coach)**

- Ventana de **1440 × 900** para escritorio y de **390 × 844** para vista celular. Navegador a pantalla completa, sin barras de extensiones ni marcadores.
- **Modo claro.** El modo oscuro está desactivado por ahora.
- Idioma de la interfaz: español (tuteo).
- Cierra otras pestañas y silencia las notificaciones del sistema antes de grabar.

**App iOS (atleta)**

- Simulador **iPhone 15 Pro** (o el que uses de referencia), con modo claro y texto de tamaño estándar.
- Barra de estado limpia: hora 9:41, batería llena y señal completa:
  ```bash
  xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularMode active --cellularBars 4 --wifiBars 3
  ```
  Para quitarla después: `xcrun simctl status_bar booted clear`.
- Zona horaria del equipo en **America/Santiago**, para que las horas de las sesiones (18:30) y «hoy» coincidan.

**Datos y privacidad**

- Solo cuentas `@example.com`. **Nunca grabes contra producción ni con cuentas reales.**
- Cuida que a cuadro no salgan: la contraseña, tu gestor de contraseñas, tu correo real ni los archivos de `.env`.
- No invites atletas con correos reales desde la demo.
- Los nombres que se ven en la demo son ficticios; no los uses como si fueran testimonios o clientes.

---

## 6. Checklist rápido

- [ ] Hoy es el día de grabar (jueves o viernes antes de las 18:30 es lo ideal).
- [ ] Regeneré la demo hoy (sección 2) y dijo `Demo lista: 1 coach, 8 atletas, 8 planes.`
- [ ] Mi API de desarrollo está apagada y la de la demo corre en el puerto 3000, **sin** claves de Resend ni de Slack (sección 3).
- [ ] La web no tiene `VITE_POSTHOG_KEY`.
- [ ] Probé el inicio de sesión del coach y del atleta que voy a usar.
- [ ] Ventana y simulador con el tamaño indicado, modo claro, barra de estado limpia y notificaciones silenciadas.
- [ ] La contraseña no queda a cuadro.
- [ ] Al terminar: apagué la API de la demo y volví a levantar la de desarrollo.

---

## 6. Demo en vivo en producción

Para hacer demos en vivo sin levantar nada, la demo vive **en la base de producción**, en https://app.getcycles.app, con las mismas cuentas de la sección 1. Las cuentas llevan `User.isDemo = true`: el resumen diario de Slack las deja fuera, así que no cuentan como coaches ni atletas reales. Cualquier análisis nuevo que consulte la base debe filtrar `isDemo = false`.

**Crear o reiniciar la demo** (hazlo el día antes de cada demo: las fechas quedan ancladas a la semana en que corre). Solo borra y recrea cuentas de demostración; nunca toca las reales:

```bash
cd apps/api
DATABASE_URL="$(cat <donde guardas la URL de producción>)" \
DEMO_EN_PRODUCCION=si \
DEMO_PASSWORD="$(cat ~/.cycles-secretos/demo/DEMO_PASSWORD)" \
npx tsx scripts/seed-demo.ts
```

Debe terminar con `Demo lista: 1 coach, 8 atletas, 8 planes.`

Ten presente:

- Las cuentas usan `@example.com`: no recibirán correos. No invites desde la demo a correos reales sin querer; los correos sí salen de verdad.
- La API del plan gratis se duerme a los 15 minutos: abre la app unos minutos antes para despertarla.
- Si cambias la versión de los textos legales (`POLICY_VERSION`), reinicia la demo para que las cuentas tengan la aceptación vigente.
