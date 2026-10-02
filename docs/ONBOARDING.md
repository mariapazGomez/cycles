# Onboarding de Cycles

Cómo empieza a usar Cycles una persona nueva, paso a paso, tal como funciona hoy la app en `https://app.getcycles.app`. Hay dos caminos: el del **coach**, que se registra solo, y el del **atleta**, que siempre entra por invitación de su coach.

Al final hay una sección para el equipo: qué preparar antes de sumar a un coach del piloto y cómo usar este mismo recorrido como prueba de punta a punta.

---

## Parte 1 · Coach

### 1. Crear la cuenta

Hay dos formas. Las dos terminan en una cuenta de coach.

**Con email y contraseña**
1. Entrar a `app.getcycles.app/register` (o *Crea tu cuenta* desde el login).
2. Completar **Nombre**, **Email** y **Contraseña** (mínimo 8 caracteres).
3. Marcar o no el consentimiento de datos (es opcional).
4. **Crear cuenta** → aparece *Revisa tu email*.
5. Abrir el email de Cycles (remitente `hola@mail.getcycles.app`) y tocar el link. **Vence en 24 horas.** Si no llega, revisar spam o usar *Reenviar email de verificación*.
6. Con el email verificado, iniciar sesión.

**Con Google**
1. En el login, **Continuar con Google** y elegir la cuenta.
2. Pantalla *Un último paso*: la cuenta se activa como coach. Marcar o no el consentimiento de datos y **Continuar**.
3. No hace falta verificar el email: Google ya lo garantiza.

> Durante el piloto, Google solo deja entrar a los emails agregados como usuarios de prueba (ver Parte 3). Si alguien no está en la lista, que use email y contraseña.

### 2. Invitar a sus atletas

1. Menú **Atletas** → *Invitar atleta*.
2. **Nombre** y **Email** del atleta → **Invitar**.
3. El atleta aparece en *Mis atletas* como **Pendiente** hasta que acepte. El link de la invitación **vence en 7 días**.

> El email no puede tener ya una cuenta en Cycles (de coach ni de atleta).

### 3. Armar sus rutinas

Las rutinas son la base del plan: se arman una vez y se reutilizan en muchas sesiones.

1. Menú **Rutinas** → **Crear rutina**.
2. Ponerle **nombre** (por ejemplo, "Torso A").
3. Agregar ejercicios del catálogo, cada uno con **series**, **reps**, **descanso** en segundos y, si quiere, las **reps en reserva** objetivo.
4. **Crear rutina**.

### 4. Crear el plan del atleta

Se puede crear apenas el atleta **aceptó** la invitación: solo aparecen en la lista los atletas activos.

1. Menú **Planes** → **Crear plan**.
2. Elegir **Atleta**, **Tipo de plan** (microciclo, mesociclo o macrociclo), **Sesiones por semana**, **Nombre**, **Objetivo** (opcional) y las fechas de **Inicio** y **Fin**.
3. **Crear plan** → se abre el detalle con el **grid**: una fila por semana y una columna por sesión.
4. En cada celda vacía, **+ Asignar** → elegir la **Rutina** → **Asignar**. La sesión se crea con los ejercicios de esa rutina.
5. Si hace falta, abrir una sesión para ajustar ejercicios, pesos o la fecha planificada.

> **Paso que no se puede saltar: activar el plan.** Todo plan se crea como **Borrador**, y el atleta no ve nada en *Hoy* hasta que el plan está **Activo**. En el detalle del plan: **Editar plan** → **Estado: Activo** → **Guardar cambios**.

> Un macrociclo no tiene grid propio: agrupa mesociclos o microciclos, que se agregan desde su detalle (*Planes dentro de este macrociclo*).

### 5. Seguir a sus atletas

- **Inicio**: *Necesitan atención*, los atletas con algo que revisar (dolor reportado, sesiones más duras o más fáciles de lo planificado, propuestas de ajuste de carga).
- **Resumen del atleta** (tocando su nombre en **Atletas**, o *Ver resumen* desde **Inicio**): carga semanal, adherencia y fuerza estimada por ejercicio.
- En el **grid** del plan, cada celda muestra lo que el atleta registró: esfuerzo, minutos y dolor.

---

## Parte 2 · Atleta

Pensado para el celular: el atleta registra mientras entrena.

### 1. Activar la cuenta

1. Abrir el email de invitación y tocar el botón. **Vence en 7 días**; si venció, pedirle al coach que invite de nuevo.
2. Pantalla *Activa tu cuenta*: definir **Contraseña** y **Confirmar contraseña** (mínimo 8 caracteres).
3. **Activar cuenta** → entra directo a la app. No hace falta verificar el email: la invitación ya lo confirma.

> Los atletas no se registran solos ni pueden entrar con Google en esta versión.

### 2. Ver su próxima sesión

- **Hoy** muestra la próxima sesión pendiente del plan activo.
- Si dice *Todo al día*, el coach todavía no activó un plan con sesiones (ver el paso 4 del coach).
- **Mis planes** muestra los planes que le asignaron.

### 3. Registrar la sesión

1. En **Hoy**, **Empezar sesión**.
2. Por cada serie: ajustar **reps** y **peso** con los botones − / + y registrar. Después de cada serie, responder **¿Cuántas reps más podías hacer?** (0 = ninguna más).
3. Entre series corre el **descanso**, con −15 s / +15 s. La pantalla no se apaga mientras corre y el celular vibra al terminar.
4. **Siguiente ejercicio** hasta terminar → **Pasar al cierre**.
5. Cierre: **qué tan dura fue la sesión** (0 a 10), **duración en minutos** (viene calculada), **si sintió dolor** (y dónde) y una **nota para el coach** (opcional) → **Terminar sesión**.

**Si no puede entrenar**: en **Hoy**, *Marcar como omitida*, con el motivo si quiere.

---

## Parte 3 · Para el equipo

### Antes de sumar a un coach del piloto

- [ ] Si va a entrar con Google: agregar su email como **usuario de prueba** en Google Cloud (*Google Auth Platform → Audience → Test users*). Con email y contraseña no hace falta.
- [ ] Avisarle que el email de verificación puede caer en spam los primeros días (dominio nuevo).
- [ ] Mientras la API esté en el plan gratis de Render: la **primera visita después de 15 minutos sin uso tarda unos 50 segundos**. Avisarle, o pasar a *Starter* antes del piloto (`docs/deploy/PLAN-Deploy.md`, paso 3).
- [ ] Mandarle el link `https://app.getcycles.app/register` y este documento (partes 1 y 2).

### Qué ve el equipo en Slack

En `#cycles-actividad`: coach nuevo, invitación enviada, atleta que acepta, primer plan de cada coach, primera sesión de cada atleta, y un resumen diario (hoy llega cerca del mediodía por el atraso de GitHub). Solo nombre abreviado y email oculto; nunca datos de salud ni de rendimiento.

### Recorrido de prueba de punta a punta

El mismo onboarding sirve como prueba del paso 4 del deploy. Con alias de Gmail todo llega al mismo buzón:

| # | Paso | Cuenta | Qué se comprueba |
|---|---|---|---|
| 1 | Registro con email y verificación | `…+coach@gmail.com` | P-02 (email de verificación), aviso "Nuevo coach" |
| 2 | *¿Olvidaste tu contraseña?* y cambio de contraseña | `…+coach@gmail.com` | P-03 |
| 3 | Invitar atleta | `…+atleta@gmail.com` | Aviso "Invitación enviada" |
| 4 | Aceptar la invitación **desde el celular** | `…+atleta@gmail.com` | P-01, aviso "Atleta nuevo" |
| 5 | Atleta sin planes: *Hoy* y *Mis planes* | atleta | P-08 |
| 6 | Crear rutina, plan, asignar rutinas en el grid y **activar el plan** | coach | Aviso "Primer plan" |
| 7 | Registrar una sesión completa en el celular, con descanso y pantalla bloqueada | atleta | P-06, P-07, P-10, aviso "Primera sesión" |
| 8 | Ver el resultado como coach: grid, *Inicio* y resumen del atleta | coach | Seguimiento |
| 9 | Revisar cómo se ven los tres emails | — | P-04 |

Al terminar: sin errores en la consola del navegador (CSP y CORS, 1D) y, al día siguiente, el resumen con los totales del recorrido (P-13). Los datos de prueba se borran después desde el editor SQL de Supabase.
