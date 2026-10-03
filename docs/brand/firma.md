---
type: brand
parent: "[[brand]]"
status: decided
tags: [brand, arquitectura, firma]
created: 2026-10-02
updated: 2026-10-02
---

> Hijo de [[esencia]]. Decisiones de la fundadora el 2026-10-02.

# Cómo conviven InProgress Co. y Cycles

## Decisiones

- **Producto al frente, firma discreta.** El usuario conecta con Cycles; InProgress Co. firma, no protagoniza. Hoy hay un solo producto.
- **Texto de la firma:** "Hecho por InProgress Co." Elegido sobre "Un producto de…" y "Cycles, de…" por ser más cercano, coherente con la voz de compañera de entrenamiento (ver [[voz-y-tono]]).
- **InProgress Co. tendrá logo propio, pero todavía no.** Hasta entonces la firma es solo texto, sin imagen. No se diseña un logo provisional.

## Dónde aparece

| Lugar | Cómo |
|---|---|
| Pie de los correos | "Hecho por InProgress Co." junto al isotipo de Cycles |
| Pantallas de acceso (login, registro) | Una línea pequeña al final |
| Legales (privacidad, términos) | Nombre completo de la compañía |
| Navegación diaria de la app | **No aparece.** Ahí manda Cycles |

## Estado en el código (2026-10-02)

Aún no implementado. Hoy los correos cierran con "Enviado por Cycles" (`apps/api/src/mail/templates.ts`) y la web no menciona a la compañía. Aplicar esto requiere tocar plantillas de correo y pantallas de auth; queda para coordinar con el trabajo de producto en curso.

## Cuando existan más productos

La firma ya estará colocada: "Hecho por InProgress Co." pasa a acompañar a cada producto sin cambiar de forma. Ahí sí habrá que decidir si la compañía gana más presencia (logo propio, sitio).

## Pendiente

- Logo de InProgress Co. (decisión futura de la fundadora).
- Aplicar la firma en correos y pantallas de acceso.
- Texto legal con el nombre completo de la compañía (conecta con la política de privacidad pendiente en el plan de deploy).
