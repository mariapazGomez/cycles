# Analítica de uso con PostHog (T-179)

Sirve para ver cómo usan Cycles los coaches del piloto. **Está apagada hasta que cargues la clave en Vercel**: sin `VITE_POSTHOG_KEY` la web no envía nada.

## Decisiones (2026-10-20)

| | |
|---|---|
| Dónde se mide | La **web** (`app.getcycles.app`) y la **landing**. La app iOS no, por ahora (pediría un SDK nativo y declararlo en App Store Connect, T-121) |
| Región | **Estados Unidos** (`https://us.i.posthog.com`). Se evaluó la UE (mejor para GDPR) y se eligió EE. UU., igual que el resto de los proveedores (Supabase, Render) |
| Grabación de pantalla | **No** |
| Cookies | **Ninguna**: no guarda nada en el navegador (`persistence: "memory"`) |

## Cómo activarlo (tareas tuyas)

1. **Crea el proyecto:** entra a `us.posthog.com`, crea la cuenta (plan gratuito) y un proyecto llamado `Cycles`. La región es **EE. UU.**: no se puede cambiar después sin crear otro proyecto.
2. **Ajustes del proyecto** (*Project settings*):
   - **Discard client IP data**: activado (no guardar IP).
   - **Autocapture**, **Session replay**, **Surveys**, **Heatmaps** y **Web vitals**: apagados (el código ya los desactiva, esto es un seguro doble).
   - **Person profiles**: dejar «identified only».
3. **Copia la *Project API key*** (empieza con `phc_`). Es una clave de solo escritura que viaja en el navegador, pero no la pegues en el repo ni en un chat: guárdala en el gestor de contraseñas.
4. **Vercel** → proyecto de la web → *Settings → Environment Variables* → Production: `VITE_POSTHOG_KEY` = la clave, y `VITE_POSTHOG_HOST` = `https://us.i.posthog.com`. Redespliega (la variable se incorpora al construir).
5. **Antes de redesplegar, mergea el PR de esta tarea**: sube la versión de privacidad a 1.1 (menciona PostHog) y todas las personas verán **«Antes de seguir»** para aceptarla.

## Qué se mide

Solo eventos explícitos, con conteos y categorías. **Nunca** datos de salud ni de entrenamiento (dolor, notas, cargas, RIR, esfuerzo, comentarios), nombres ni correos.

| Evento | Cuándo | Propiedades |
|---|---|---|
| `$pageview` | Cada cambio de pantalla | `$current_url` limpio (`/cycles/:id`, sin query), `area` (`public` o `app`) |
| `contact_requested` | Se envía el formulario de acceso anticipado de la landing | — |
| `coach_registered` | Un coach crea su cuenta | — |
| `login_succeeded` | Ingresa a la web | `method` (`password` o `google`) |
| `athlete_invited` | El coach invita a un atleta | — |
| `athlete_joined` | El atleta activa su cuenta | — |
| `routine_created` | El coach crea una rutina | `exercises` (cuántos) |
| `cycle_created` | El coach crea un ciclo | `type`, `inMacrocycle` |
| `routine_assigned` | El coach asigna una rutina | `weeks` (a cuántas semanas) |
| `session_closed` | El atleta termina u omite una sesión en la web | `outcome` (`completed` o `skipped`) |

**Identidad:** el ID interno de la cuenta (un UUID) y `role`. Al cerrar sesión se reinicia.

**Lo que se limpia antes de enviar:** cualquier dirección pierde su query y su hash (llevan claves de enlaces) y los UUID pasan a `:id`. Si algo falla al limpiar, el evento no sale.

## Panel sugerido (se arma en PostHog)

1. **Coaches activos por semana:** *Trends*, evento `login_succeeded`, «Unique users», filtro `role = coach`, por semana.
2. **Embudo de activación del coach:** `coach_registered` → `routine_created` → `athlete_invited` → `cycle_created` → `routine_assigned`.
3. **Embudo del atleta:** `athlete_invited` → `athlete_joined` → `session_closed` (primera).
4. **Atletas invitados por coach:** *Trends*, `athlete_invited`, total, desglosado por usuario.
5. **Sesiones cerradas por semana:** *Trends*, `session_closed`, desglosado por `outcome`.
6. **Landing:** `$pageview` con `area = public` y `$current_url = /`, y `contact_requested` (conversión).

## Cómo apagarlo

Borra `VITE_POSTHOG_KEY` en Vercel y redespliega: la web deja de enviar todo. Para borrar lo ya enviado, elimina el proyecto o las personas desde PostHog.

## Límites conocidos

- Un bloqueador de anuncios puede impedir que algunos eventos lleguen: los números son una estimación, no un conteo exacto. Para hechos exactos están los avisos de actividad en Slack.
- Los eventos de la web no incluyen lo que hace un atleta en la app iOS.
- Si cambia lo que se mide, hay que actualizar la política de privacidad (sección 2, «Uso de Cycles») y subir `POLICY_VERSION`.
