---
type: legal
status: pendiente-de-revision
tags: [legal, privacidad, terminos, T-026]
created: 2026-10-12
---

# Revisión de la política de privacidad y los términos de uso

Documento de traspaso para revisar el **PR #58** (`feat/privacidad-y-terminos`) antes de mezclarlo. Tarea de Notion: **T-026**. Las páginas son un **borrador sin revisión legal**.

## Qué se entrega

| Pieza | Dónde |
|---|---|
| Política de privacidad v1.0 | `apps/web/public/privacidad/index.html` → `/privacidad` |
| Términos de uso v1.0 | `apps/web/public/terminos/index.html` → `/terminos` |
| Estilos | `apps/web/public/legal/legal.css` |
| Rutas | `apps/web/vercel.json` (rewrites explícitos) |
| Enlaces | pie de la landing, `AuthCard` (login/registro), avisos de aceptación en registro, perfil con Google e invitación |
| PRD | `docs/prds/features/PRD-PrivacidadYTerminos.md` |
| Prueba | P-21 en `docs/PRUEBAS-PENDIENTES.md` |

Son HTML estático (no React) para que lo lea cualquiera sin JavaScript, incluidos los revisores de Google y Apple.

## 1. Compromisos que debes confirmar (a nombre de InProgress Co.)

Cada uno está escrito en las páginas como promesa pública. Si alguno no es real, hay que cambiar el texto o el producto.

1. **Correo `privacidad@getcycles.app` existe y se lee** (Cloudflare Email Routing). Hoy no está creado.
2. **Plazo de respuesta a pedidos de datos: 30 días.**
3. **Eliminación de cuenta: datos personales borrados en máximo 30 días.**
4. **Respaldos: se conservan hasta 90 días.** Verifica contra la política real de Supabase y el respaldo manual semanal.
5. **Formulario de contacto: se conserva hasta 12 meses** tras la conversación.
6. **Cycles es para mayores de 18** (o con autorización de madre, padre o tutor).
7. **"InProgress Co. (Chile)" y ley chilena** como responsable y ley aplicable.
8. **Acceso gratis en acceso anticipado, con aviso de 30 días** antes de cualquier cobro.

Además: la página promete que los avisos internos a Slack no incluyen datos de salud ni de rendimiento, y que no se guarda la IP en la base de datos. Ambas cosas se verificaron en el código el 2026-10-12.

## 2. Qué se promete que hoy el producto NO hace

Estas brechas son las más importantes. La política dice que se resuelven **por correo**, a mano:

- **No hay eliminar cuenta ni exportar datos** en la API ni en la app. Se haría con scripts manuales.
- **No hay retiro de consentimiento** de estadísticas desde la app (solo por correo).
- ~~**El atleta no consiente nada al aceptar la invitación**~~ **Resuelto (T-147, 2026-10-20):** ahora hay una casilla explícita al registrarse, al aceptar la invitación y en el perfil con Google, y la aceptación se guarda con su versión y fecha (`PolicyAcceptance`). Quien ya tenía cuenta ve la pantalla «Antes de seguir». Falta la misma pantalla en la app iOS. Detalle en `docs/prds/features/PRD-PrivacidadYTerminos.md` §7.
- **La app móvil no enlaza** a la política ni a los términos.

## 3. Inventario de datos (resumen)

| Dato | Dónde vive | Sensible |
|---|---|---|
| Nombre, correo, rol, unidad de peso | Supabase (Postgres, EE. UU.) | No |
| Hash de contraseña | Supabase | No legible |
| Relación coach–atleta, invitaciones | Supabase | No |
| Planes, rutinas, sesiones | Supabase | No |
| Series (reps, peso, RIR), esfuerzo, duración, motivo de omisión | Supabase | Rendimiento |
| **Dolor y notas libres** | Supabase | **Salud** |
| IP | Solo en memoria (límites) y registros de proveedores; no en la base | No |
| Formulario de contacto (correo + mensaje) | Supabase + Slack privado | No |
| Sesión móvil | Llavero del dispositivo | No |

Proveedores que tocan datos: Supabase, Render, Vercel, Cloudflare, Resend, Slack, Google (OAuth y Fonts), Apple (TestFlight/App Store). Todos fuera de Chile y de España.

## 4. Encargo para un abogado

Qué pedirle (idealmente alguien con experiencia en datos personales y en SaaS):

1. ¿La política y los términos son suficientes para operar en **Chile**? Considerar la Ley 19.628 y la **Ley 21.719** (nueva ley de protección de datos, con entrada en vigencia diferida) y la autoridad que crea.
2. ¿Hay usuarios en **España/UE**? Si sí, aplica el **RGPD**: base legal, **datos de salud (categoría especial, art. 9)**, transferencias a EE. UU. (cláusulas contractuales / Data Privacy Framework), representante en la UE y delegado si corresponde.
3. **Datos de salud** (dolor y notas): ¿basta con la información actual o se necesita consentimiento explícito aparte, y de quién (atleta, coach)?
4. **Rol del coach:** ¿es responsable independiente o encargado? Hoy el texto dice que el coach decide cómo usa lo que ve. ¿Hace falta un contrato o cláusula para coaches?
5. **Aceptación:** ¿basta el aviso con enlaces ("al continuar aceptas") o se exige un clic de aceptación para el atleta invitado?
6. **Cláusula de limitación de responsabilidad** (sección 11 de los términos) y exclusión por lesiones: ¿es oponible frente a consumidores?
7. **Menores:** la regla de 18 años y la autorización de tutor.
8. Plazos de conservación y eliminación comprometidos.

Entregar: las dos páginas, este documento y el inventario de la sección 3.

## 5. Tareas derivadas (para proponer al chat de planificación)

1. Crear `privacidad@getcycles.app` (Cloudflare Email Routing) y probar que llega.
2. Revisión legal (sección 4).
3. Aceptación versionada de términos y política para atletas en la API (guardar versión y fecha al aceptar la invitación).
4. Eliminar cuenta, exportar datos y retirar el consentimiento de estadísticas (API + web + móvil).
5. Enlace a política y términos en la app móvil, y **etiquetas de privacidad de App Store** coherentes con el inventario.
6. Cargar las URLs en **Google Cloud → OAuth → Branding** (política y términos).
7. Ejecutar P-21 en producción tras el deploy (`/privacidad` y `/terminos`, con y sin barra final).
8. Actualizar `docs/SEGURIDAD.md` con `/contact` (T-064).

## 6. Cómo revisar el PR

1. Leer las dos páginas completas en el navegador (escritorio y móvil).
2. Confirmar o corregir los 8 compromisos de la sección 1.
3. Decidir si se mezcla ya (como borrador, con el correo creado) o después de la revisión legal.
4. Cuando digas "mezcla el PR", lo mezclo y corro P-21 en producción.
