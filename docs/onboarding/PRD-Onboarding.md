---
type: prd
level: feature
parent: "[[PRD-General]]"
status: draft
phase: "Fase 3.5 — Piloto"
version: 0.3
created: 2026-10-06
updated: 2026-10-06
tags: [prd, feature/onboarding]
related: ["[[PRD-Autenticacion]]", "[[PRD-InvitacionAtletas]]", "[[PRD-AppMovilAtleta]]", "[[voz-y-tono]]"]
---

# PRD — Onboarding

> Hijo de [[PRD-General]]. Este documento se itera en la consola de diseño; cuando llegue a `status: ready`, se ejecuta en la consola de desarrollo. **No describe cómo funciona hoy la app** (eso está en `docs/ONBOARDING.md`), sino cómo debería sentirse la primera vez de cada rol.

## 0. Cómo usar este documento

- Cada versión se anota en el [historial](#12-historial-de-versiones). No se reescribe en silencio.
- Lo marcado como **[hipótesis]** no está validado; lo marcado como **[decidido]** sí.
- Las preguntas abiertas (§10) se cierran antes de pasar a `ready`.
- El plan de ejecución (§11) es lo único que lee la consola de desarrollo; el resto es el porqué.

## 1. Resumen

Hoy una persona nueva llega, crea su cuenta y cae en una app vacía sin que nadie le diga qué hacer primero. El onboarding de Cycles es el recorrido que lleva a cada rol desde "tengo una cuenta" hasta su **primer momento de valor**: para la coach, un plan activo con un atleta; para el atleta, su primera sesión registrada.

## 2. Problema y motivación

Brechas observadas en el recorrido actual (`docs/ONBOARDING.md`, `apps/web/src/pages`, `apps/mobile/src/screens`):

| # | Brecha | Rol | Consecuencia |
|---|---|---|---|
| B1 | Tras verificar el email, la coach cae en una pantalla sin guía de siguiente paso | Coach | No sabe si empezar por rutinas, atletas o planes |
| B2 | El orden correcto (rutinas → invitar → plan → **activar**) vive solo en un documento | Coach | Se salta pasos; el orden no es evidente |
| B3 | El plan se crea como Borrador y el atleta no ve nada hasta que se activa | Coach y atleta | La atleta ve *Todo al día* y cree que algo falló |
| B4 | Un atleta que acepta la invitación y aún no tiene plan ve *Hoy* vacío | Atleta | Primera impresión de "app rota" |
| B5 | La invitación se acepta en la web pero la atleta entrena en la app móvil | Atleta | Falta puente entre aceptar y abrir la app |
| B6 | La primera visita tras 15 min sin uso tarda ~50 s (API en plan gratis) | Todos | Ya se avisa en pantalla; falta decidir si es parte del onboarding |
| B7 | No hay forma de saber en qué paso va cada coach/atleta del piloto | Equipo | Solo se ve en Slack, sin estado por persona |

## 3. Principios

1. **Un solo siguiente paso.** En cada momento, una acción principal visible. [decidido]
2. **Primer valor rápido.** El recorrido se mide hasta el primer plan activo (coach) y la primera sesión registrada (atleta), no hasta "cuenta creada". [decidido]
3. **Voz de compañera de entrenamiento** ([[voz-y-tono]]): tuteo, frases cortas, sin dramatizar, sin culpar. [decidido]
4. **Lo vacío orienta.** Ningún estado vacío es solo "no hay nada"; dice qué hacer o qué se espera. [hipótesis]
5. **Se puede saltar y volver.** Nada del onboarding bloquea usar la app. [hipótesis]

## 4. Alcance

### Dentro de alcance (v0.1, a validar)

- Recorrido del **coach** en web: de cuenta verificada a primer plan activo.
- Recorrido del **atleta**: de invitación a primera sesión registrada (web para aceptar, móvil para entrenar).
- Estados vacíos clave de ambos roles.
- Correos que forman parte del recorrido (verificación, invitación, y los que se agreguen).
- Vista mínima del **equipo** para saber en qué paso va cada persona del piloto.

### Fuera de alcance

- Onboarding comercial (landing, contacto, ventas): ver [[PRD-LandingContacto]].
- Tutoriales en video o contenido educativo largo.
- Cambios al modelo de roles (coach o atleta, nunca ambos; R4).
- Importación masiva de planes (existe `apps/api/scripts/importar-plan.ts` como herramienta interna).

## 5. Roles y recorridos

Cada rol tiene su recorrido con **punto de partida, primer valor, pasos, estados vacíos y señales de éxito**. Los pasos son una propuesta, no el estado actual.

### 5.1 Coach (web)

**Parte de:** cuenta verificada, sin atletas, rutinas ni planes.
**Primer valor:** un plan **activo** asignado a un atleta que ya aceptó.

| Paso | Qué hace | Qué ve hoy | Qué debería ver [hipótesis] |
|---|---|---|---|
| C1 | Crea cuenta y verifica | Pantalla *Revisa tu email*, luego login | Igual, pero al entrar llega a una bienvenida con el recorrido |
| C2 | Crea su primera rutina | Menú **Rutinas** vacío | Estado vacío con acción *Crea tu primera rutina* |
| C3 | Invita a su primer atleta | Menú **Atletas** | Estado vacío con acción *Invita a tu primera atleta* |
| C4 | Crea el plan | Menú **Planes**, solo atletas activos en la lista | Si no hay atletas activos, explicar que hay que esperar la aceptación |
| C5 | Asigna la primera sesión | Hay que ir además a *Editar plan → Estado: Activo* | Al asignar la primera sesión el plan se activa solo, con aviso (§5.4) |
| C6 | Ve el primer registro de la atleta | Inicio → *Necesitan atención*, resumen | Mensaje que celebra el primer registro y apunta al resumen |

**Pieza [decidido 2026-10-06]:** un **asistente paso a paso**, no una checklist. Detalle en §5.1.1.

**Señales de éxito:** tiempo desde registro hasta plan activo; % de coaches con plan activo en 7 días.

#### 5.1.1 Asistente de la coach

**Problema de diseño:** la atleta acepta la invitación cuando puede (hasta 7 días). Un asistente lineal se quedaría bloqueado. Por eso el asistente **se pausa** en ese punto y se retoma solo. Son **cuatro pasos** (W1–W4).

**Pasos [hipótesis, a aprobar]**

| # | Paso | Acción principal | Se completa cuando | Se puede saltar |
|---|---|---|---|---|
| W1 | Tu primera rutina | Crear rutina con 2–3 ejercicios del catálogo | Existe ≥1 rutina | Sí |
| W2 | Invita a tu primera atleta | Nombre y email, *Invitar* | Existe ≥1 invitación | Sí |
| W3 | Esperando a tu atleta | Nada que hacer; muestra estado *Pendiente* y opción de reenviar | Una atleta acepta | Sí (pasa a W4 si ya hay otra activa) |
| W4 | Crea su plan y asigna la primera sesión | Datos del plan (atleta, nombre, fechas, sesiones por semana) y asignar una rutina a la primera celda del grid | El plan tiene ≥1 sesión asignada (**el plan pasa a Activo solo**, ver §5.4) | Sí |

El antiguo paso "Activar el plan" **desaparece** (decisión 2026-10-06): activar deja de ser una acción aparte.

**Reglas de comportamiento**

1. **El progreso se deriva de los datos**, no de un contador aparte: cada paso está completo si existe lo que produce. Así no se desincroniza si la coach hace cosas por fuera del asistente.
2. **Sale y vuelve.** Cada paso tiene *Salir*. Mientras queden pasos sin completar, **Inicio** muestra una tarjeta *Sigue donde quedaste* que reabre el asistente en el primer paso pendiente.
3. **W3 es una pausa, no una pantalla de espera.** La coach sale a la app normal; cuando la atleta acepta, la tarjeta de Inicio cambia a *Tu atleta ya está lista: crea su plan* (y se evalúa un correo, ver §10).
4. **Se descarta una sola vez.** *No quiero la guía* oculta el asistente y la tarjeta; se puede reabrir desde el menú de ayuda. Se guarda por usuaria en el servidor (campo a definir en el plan de ejecución).
5. **Aparece solo a coaches nuevas**: sin rutinas, sin atletas ni planes. Una coach con datos previos no lo ve.
6. **Una acción por pantalla**, indicador de progreso (*Paso 2 de 5*) y texto en voz de compañera ([[voz-y-tono]]).

**Estados a diseñar:** primera vez; paso completado (avanza solo); paso saltado; pausa en W3; retorno cuando la atleta aceptó; asistente completo (cierre que lleva a Inicio); asistente descartado.

**Cierre:** al asignar la primera sesión, pantalla final que dice con claridad que **el plan ya está activo y la atleta lo verá en Hoy** (*Tu atleta ya puede entrenar*), y apunta al siguiente paso real (seguimiento en Inicio). Como la activación es implícita, este aviso es lo que evita que la coach no sepa que la atleta ya lo ve.

### 5.2 Atleta (acepta en el navegador, entrena en la app iOS)

**Hecho [decidido 2026-10-06]:** la atleta entrena con la **app iOS**. La invitación se acepta en el navegador del celular (el correo abre un link web; la app móvil hoy solo tiene login, no pantalla de aceptación). El onboarding de la atleta es entonces un **traspaso web → app**, y ese traspaso es el punto más frágil.

**Parte de:** correo de invitación de su coach, leído en el iPhone.
**Primer valor:** primera sesión registrada de principio a fin en la app.

| Paso | Qué hace | Dónde | Qué ve hoy | Qué debería ver [hipótesis] |
|---|---|---|---|---|
| A1 | Abre el correo y toca el botón | Correo → Safari | Correo de invitación | Correo que nombra a su coach, dice que **entrenará desde la app** y qué pasará después |
| A2 | Define contraseña | Web | Pantalla *Activa tu cuenta* | Igual, con el nombre de su coach visible |
| A3 | Cuenta activa | Web | Entra a la versión web | **Pantalla de traspaso**: cuenta lista, botón para instalar/abrir la app, y recordatorio del email con el que entra |
| A4 | Instala la app y entra | App | Login (email y contraseña) | Login con el email ya conocido; sin pedir volver a crear nada |
| A5 | Aún no tiene plan | App | *Todo al día* | *Tu coach está preparando tu plan*, con el nombre de la coach (no *Todo al día*) |
| A6 | Tiene plan activo | App | *Hoy* con la próxima sesión | Igual; primera sesión con una guía mínima de cómo registrar una serie |
| A7 | Termina su primera sesión | App | Cierre y listo | Cierre que reconoce que es su primera sesión |

**Riesgos del traspaso:** la atleta acepta y nunca instala la app; instala pero olvida con qué email entra; la web que ve tras aceptar parece "la app" y no vuelve. A3 existe para cerrar las tres.

**Señales de éxito:** % de atletas invitados que aceptan en 7 días; tiempo desde aceptar hasta primera sesión registrada.

### 5.3 Equipo (piloto)

**Parte de:** un coach del piloto que acaba de ser agregado.
**Primer valor:** saber en qué paso está cada persona y poder ayudarla a tiempo.

- Hoy: `docs/ONBOARDING.md` Parte 3 (lista previa + recorrido de prueba) y avisos en `#cycles-actividad`.
- Propuesta [hipótesis]: una vista simple (o resumen) del embudo por coach: registrada → verificada → atleta invitada → atleta activa → plan activo → primera sesión. Sin datos de salud ni rendimiento (regla vigente del canal de Slack).

### 5.4 Activación automática del plan [decidido 2026-10-06]

**Regla:** un plan en **Borrador** pasa a **Activo** cuando se le asigna su **primera sesión**. Resuelve B3.

Se interpreta "activar al asignar la primera sesión" así; si la intención era otra, corregir aquí antes de ejecutar.

**Consecuencias a resolver en el plan de ejecución:**

| Tema | Pregunta o decisión |
|---|---|
| Atleta ve un plan a medias | Con solo la primera sesión asignada, la atleta ya ve su plan en *Hoy*. Aceptado: la coach puede ir completando el grid después. |
| Volver a Borrador | ¿La coach puede pausar o volver un plan a Borrador? Hoy sí, vía *Editar plan*; se mantiene como control manual. |
| Qué cuenta como "asignar" | Solo asignar rutina a una celda del grid crea una sesión. Crear un plan sin sesiones lo deja en Borrador. |
| Planes ya existentes | La regla aplica solo hacia adelante; no cambia el estado de planes actuales. |
| Macrociclos | No tienen grid propio (agrupan otros planes). Definir si un macrociclo se activa al activarse uno de sus hijos o sigue siendo manual. |
| Un solo plan activo | Verificar si hay regla de un único plan activo por atleta (afecta a la segunda vez que una coach crea un plan). |
| Aviso a la coach | Siempre un aviso claro al activarse: *Tu atleta ya puede verlo en Hoy*. |

Cambio técnico previsto: regla en el backend (módulo de sesiones/ciclos), no en el asistente, para que valga también fuera de él.

## 6. Estados vacíos

Pantalla por pantalla, a completar con textos en la iteración v0.2.

| Pantalla | Rol | Estado vacío hoy | Propuesta |
|---|---|---|---|
| Inicio | Coach | Por definir (revisar `HomePage.tsx`) | Tarjeta *Sigue donde quedaste* del asistente |
| Rutinas | Coach | Por definir (`RoutinesPage.tsx`) | Acción para crear la primera |
| Atletas | Coach | Por definir (`AthletesPage.tsx`) | Acción para invitar |
| Planes | Coach | Por definir (`CyclesPage.tsx`) | Explica el requisito de atleta activo |
| Hoy | Atleta | *Todo al día* (`TodayScreen.tsx`, `TodayPage.tsx`) | Distinguir "sin plan" de "al día" |
| Mis planes | Atleta | Por definir | Mensaje con el nombre de la coach |

## 7. Correos del recorrido

| Correo | Cuándo | Estado | Pendiente |
|---|---|---|---|
| Verificación de email | Registro de coach | En producción | Revisar si sugiere el siguiente paso |
| Invitación de atleta | Coach invita | En producción | Nombrar a la coach y anticipar el paso del móvil |
| Recuperación de contraseña | *¿Olvidaste tu contraseña?* | Con falla abierta (P-03) | Fuera de este PRD, depende de su arreglo |
| Bienvenida a la coach [hipótesis] | Primera vez que entra | No existe | Decidir si hace falta (§10) |
| Recordatorio de invitación sin aceptar [hipótesis] | A los 3 días | No existe | Decidir si hace falta (§10) |

Todos usan la plantilla con el motivo de la cadena de proteína (`docs/brand/identidad-visual.md`).

## 8. Diseño

A producir en la iteración v0.2 en adelante. Cada pieza se aprueba antes de ir al plan de ejecución.

- [ ] Asistente de la coach, web: 5 pasos (W1–W5) + bienvenida + cierre
- [ ] Tarjeta *Sigue donde quedaste* en Inicio (pausa en W3 y retorno)
- [ ] Punto de reapertura del asistente en el menú de ayuda
- [ ] Estados vacíos de coach (4 pantallas)
- [ ] Pantalla de traspaso web → app (A3), según resuelva 2b y 2c
- [ ] Estados vacíos del atleta (*Hoy*, *Mis planes*)
- [ ] Cierre de la primera sesión
- [ ] Ajustes a los correos de verificación e invitación

Referencias: `docs/brand/identidad-visual.md`, `docs/brand/especificaciones-diseno.md`, design system vigente (v8), rediseño mobile (isla flotante de 3 pestañas).

## 9. Medición

Los eventos a medir se definen junto con el plan de ejecución, respetando las reglas de seguridad y privacidad (`docs/SEGURIDAD.md`, R1–R12): **nada de datos de salud ni de rendimiento** en métricas o avisos.

Embudo propuesto: `coach_registrada → email_verificado → atleta_invitada → atleta_activa → plan_activo → primera_sesion_registrada`.

## 10. Preguntas abiertas

1. ~~¿Checklist o asistente para la coach?~~ **Cerrada 2026-10-06: asistente paso a paso** (§5.1.1).
1b. ¿W1 y W4 usan los formularios existentes embebidos, o versiones reducidas propias del asistente? Las reducidas son más simples pero duplican lógica. [bloquea el plan de ejecución]
1c. ¿La rutina de W1 parte vacía o con una plantilla sugerida (p. ej. "Torso A")? Se relaciona con la pregunta 7.
2. ~~¿App o navegador?~~ **Cerrada: app iOS** (§5.2).
2b. **¿Cómo se instala la app iOS?** TestFlight (invitación por correo, límites y caducidad de builds) o App Store. Define el botón de A3 y el texto del correo. [bloquea §5.2 A1, A3]
2c. ¿Se puede abrir la app desde el navegador tras aceptar (enlace universal o esquema propio)? Hoy no se ve ninguno configurado en `apps/mobile`. Sin eso, A3 solo puede *indicar* abrir la app, no hacerlo por ella.
2d. ¿La atleta puede entrar en la app sin pasar por la web, por ejemplo aceptando la invitación dentro de la app? Es un cambio mayor; hoy se descarta.
3. ~~¿Activación automática?~~ **Cerrada: se activa al asignar la primera sesión** (§5.4). Quedan los detalles de esa tabla.
4. ¿Hace falta un correo de bienvenida y/o recordatorio de invitación pendiente?
5. ¿Qué nivel de seguimiento por persona quiere el equipo durante el piloto: Slack, una vista interna, o ninguno más?
6. ¿Se mide con eventos propios o alcanza con consultas a la base de datos?
7. ¿El onboarding de la coach incluye una rutina o plan de ejemplo precargado?

## 11. Plan de ejecución (para la consola de desarrollo)

> Vacío en v0.1. Se completa cuando §10 esté cerrado y §8 aprobado. Formato previsto: lista ordenada de tareas pequeñas, cada una con archivos a tocar, criterio de aceptación y PR sugerido, en línea con el checklist de cierre de fase (PRD-General §10.1).

## 12. Historial de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-10-06 | Esqueleto, brechas observadas B1–B7, recorridos propuestos por rol, preguntas abiertas |
| 0.3 | 2026-10-06 | Decidido: la atleta usa la app iOS y el plan se activa al asignar su primera sesión. Asistente de la coach pasa a 4 pasos (sin paso de activar). Recorrido de la atleta rehecho como traspaso web → app (A1–A7). Nueva §5.4. Preguntas 2b–2d |
| 0.2 | 2026-10-06 | Decidido: la coach usa un asistente paso a paso (no checklist). Se define W1–W5, pausa en W3, progreso derivado de los datos y reglas de comportamiento. Nuevas preguntas 1b y 1c |
