---
type: prd
level: feature
parent: "[[PRD-General]]"
status: complete
phase: "Fase 3.5 — Piloto"
created: 2026-10-03
updated: 2026-10-03
tags: [prd, feature/landing]
related: ["[[landing]]", "[[speech]]", "[[PRD-Autenticacion]]"]
---

# PRD — Landing y formulario de contacto

## 1. Qué es

Una página para coaches que ve quien entra a `/` sin sesión (quien tiene sesión va al inicio de la app). Su único llamado a la acción es **conversar con la fundadora**, no registrarse: sirve para encontrar coaches con quienes validar el producto. Textos y diseño en [[landing]] y [[speech]].

## 2. Decisiones

- Vive dentro de `apps/web`, en la ruta `/` para visitantes (2026-10-03). En producción se sirve desde `app.getcycles.app`; la raíz y `www` redirigen allí. Mover la landing a `www` o a un proyecto aparte queda para más adelante.
- Estructura al estilo de myfitnesspal.com con la marca de Cycles; botones en píldora, como los de la app, con animación.
- Las capturas web son de una base de demostración con personas ficticias (`apps/api/scripts/seed-demo.ts`); las pantallas del teléfono son maquetas, no capturas del simulador.

## 3. Formulario de contacto

Dos campos: correo y "Cuéntanos quién eres". `POST /contact`, público:

| Defensa | Comportamiento |
|---|---|
| Campo señuelo lleno, o formulario enviado en menos de 3 s | 201 sin guardar ni avisar (el bot no se entera) |
| Más de 2 enlaces | 400 |
| Mismo correo en 24 h | 201 sin guardar |
| Límite por IP (3/hora) y por correo (2/día) | 429 |
| Tope de 40 mensajes al día en total | 429 con mensaje propio |

Cada mensaje se guarda en `ContactRequest` (sin IP) y se avisa al canal privado de Slack `#cycles-early-adopters` con el texto escapado (`&`, `<`, `>`). Si Slack falla, el mensaje no se pierde: queda con `slackSentAt` nulo.

## 4. Fuera de alcance (por ahora)

- Reintentar el aviso a Slack de los mensajes con `slackSentAt` nulo.
- Política de privacidad y términos (pendientes en el plan de deploy; el formulario solo dice que el correo se usa para responder).
- Testimonios, precios y versión para inversionistas.
