# Textos de «Eliminar mi cuenta» (CYC-295)

**Propuesta pendiente de aprobación de la usuaria. Sin revisión legal.**

**Solo vale cuando el PR #286 esté publicado.** Hoy está abierto. Antes de eso estos textos prometerían borrados que no ocurren. Contrastada el 26-11 con su código y con el PR #285, también abierto, sobre `origin/main` (a9d46b4).

## Decidido por la usuaria (26-11, trasladado por Organización y descrito en el PR #286)

- Se borran los avisos de otras personas que nombran a la cuenta eliminada.
- La plantilla que queda al eliminar un atleta se llama «Plantilla de un ciclo anterior» y no tiene objetivo. El nombre genérico lo propuso Desarrollo general.
- Al eliminar un coach se borran sus ejercicios que nada usa; los demás se ocultan y se conservan.
- Se conserva un historial de correos registrados: una huella no legible del correo con las fechas del primer registro y del último borrado, mientras existan el plan gratuito o las ofertas, con revisión anual.

## Atleta (web y app, el mismo texto)

Se eliminan tu cuenta, tus entrenamientos registrados, tus RM, tus actividades fuera del plan, tus avisos y los avisos de tus coaches que te nombran. No se puede deshacer.

De los planes que tu coach creó para ti, puede quedarle una plantilla con un nombre genérico, sin objetivo ni vínculo con tu cuenta. Lo que ya tenía guardado en su Biblioteca no cambia.

**[Huella]** Para no repetir beneficios, como un mes gratis u ofertas, guardamos una huella de tu correo y las fechas de tu primer registro y de la última vez que eliminaste tu cuenta. La huella no permite leer tu correo, pero sí reconocerlo si vuelve a registrarse. La conservamos mientras exista el plan gratuito o haya ofertas, y cada año revisamos si todavía hace falta.

Las copias de respaldo se eliminan en un máximo de 90 días. Más en la política de privacidad.

## Coach (solo web)

Se eliminan tu acceso, tus equipos con sus eventos, tus rutinas, tus plantillas, tus avisos y los avisos de tus atletas sobre los planes que les hiciste. Tu nombre y tu correo se quitan de la cuenta, y se elimina tu perfil de coach. No se puede deshacer.

Tus atletas quedan desvinculados de ti y conservan sus planes y su historial, donde apareces como «Coach eliminado». También se conserva lo que escribiste en esos planes.

Se borran los ejercicios que creaste y que nada usa. Los demás dejan de mostrarse y se conservan con su nombre, descripción, video, músculos e implementos.

De tu cuenta quedan algunos datos sin tu nombre ni tu correo, como las fechas de creación y de último ingreso y la unidad de peso.

**[Huella]** *(El mismo párrafo del atleta.)*

Las copias de respaldo se eliminan en un máximo de 90 días. Más en la política de privacidad.

La app es solo para atletas (`AuthContext.startSession` rechaza otros roles): no necesita texto de coach.

## Qué se puede mostrar y cuándo

| Parte | Condición |
|---|---|
| Todo el texto | PR #286 publicado |
| «y se elimina tu perfil de coach» | PR #285 publicado; antes se quita la frase |
| Párrafo **[Huella]** (la marca no se muestra) | Historial encendido, y `/privacidad` actualizada **antes** de encenderlo. Con el historial apagado no se muestra |

La app instalada tiene el texto en su código («sin tu nombre»): necesita una versión nueva.

## Límites que el texto no debe ocultar

- **No es retroactivo.** Lo que dejaron las cuentas eliminadas antes del PR #286 sigue igual.
- **No promete «sin tu nombre» ni que se borra toda la Biblioteca del coach.** La plantilla nueva es genérica, pero lo que el coach ya tenía guardado o escribió en otros lugares puede nombrar al atleta.
- El PR #285 también elimina la invitación de la persona; está por confirmar y los textos no la mencionan.

## Fuera de la tarjeta, para `/privacidad` 1.6

- Los mensajes del formulario de la página no se borran al eliminar la cuenta; la política publicada (1.5) dice que se guardan hasta 12 meses o hasta que se pida borrarlos.
- La política dice que ante un pedido de eliminación se borran los datos personales en un máximo de 30 días. Debe explicar lo que se conserva.
- La huella sigue siendo un dato personal seudonimizado: **no presentarla como anónima**.
- La revisión anual es un compromiso manual: el PR #285 no purga el historial. Falta definir quién la hace.
- El plan gratuito y las ofertas no están definidos; confirmar que esa finalidad y ese plazo resisten la revisión legal.

## Estilo

El estilo de las tarjetas no cambia. En la web y la app, el texto pasa de un párrafo a varios.

## Novedad

No lleva ficha: es un cambio de texto legal en Cuenta.
