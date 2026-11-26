# Textos de «Eliminar mi cuenta» (CYC-295)

**Propuesta pendiente de aprobación de la usuaria. Sin revisión legal.** Contrastada el 26-11 con `origin/main` (a9d46b4) y con el PR #285, que está abierto.

## Decidido por la usuaria (26-11, trasladado por Organización)

Se conserva un historial de correos registrados aunque se elimine la cuenta: solo una huella no legible del correo con las fechas del primer registro y del último borrado, mientras existan el plan gratuito o las ofertas, con revisión anual.

## Atleta (web y app, el mismo texto)

Se eliminan tu cuenta, tus entrenamientos registrados, tus RM, tus actividades fuera del plan y tus avisos. No se puede deshacer.

Tu coach puede conservar en su Biblioteca datos generales de los planes que creó para ti, como el nombre y el objetivo, sin vincularlos con tu cuenta.

Para no repetir beneficios, como un mes gratis u ofertas, guardamos una huella de tu correo y las fechas de tu primer registro y de la última vez que eliminaste tu cuenta. La huella no permite leer tu correo, pero sí reconocerlo si vuelve a registrarse. La conservamos mientras exista el plan gratuito o haya ofertas, y cada año revisamos si todavía hace falta.

Las copias de respaldo se eliminan en un máximo de 90 días. Más en la política de privacidad.

## Coach (solo web)

Se eliminan tu acceso, tu nombre y tu correo de la cuenta, tu perfil de coach, tus equipos con sus eventos, tus rutinas y tus plantillas. No se puede deshacer.

Tus atletas quedan desvinculados de ti y conservan sus planes y su historial, donde apareces como «Coach eliminado». También se conserva lo que escribiste en esos planes. Los ejercicios que creaste dejan de mostrarse, pero no se borran.

*(Los dos últimos párrafos son iguales a los del atleta.)*

La app es solo para atletas (`AuthContext.startSession` rechaza otros roles): no necesita texto de coach.

## Por qué cambia más que el historial

| Texto actual | Lo que hace el código |
|---|---|
| Atleta: los planes quedan «sin tu nombre» | La plantilla copia el nombre y el objetivo que escribió el coach. Si incluyen el nombre del atleta, queda. No todos los planes se copian: los que venían de una plantilla y los macrociclos no. |
| Atleta: «series, cierres de sesión y avisos» | También se eliminan los RM y las actividades paralelas. |
| Coach: «tus datos personales» | La fila de la cuenta se conserva anonimizada. Quedan datos sin nombre ni correo, como fechas, unidad de peso y estado de la guía. |
| Coach: no menciona equipos ni ejercicios | Se eliminan sus equipos. **Todos** sus ejercicios propios se ocultan y se conservan, los use o no un atleta. |

El perfil de coach se elimina solo con el PR #285. La eliminación de la invitación, que también trae ese PR, sigue **por confirmar** y no se menciona en los textos.

## Fuera de la tarjeta, para `/privacidad`

- Los mensajes del formulario de la página no se borran al eliminar la cuenta; la política publicada (1.5) dice que se guardan hasta 12 meses o hasta que se pida borrarlos.
- La política dice que ante un pedido de eliminación se borran los datos personales en un máximo de 30 días. Debe explicar la excepción de la huella.
- La huella sigue siendo un dato personal seudonimizado: **no presentarla como anónima**.
- La revisión anual es un compromiso manual: el PR #285 no purga el historial. Falta definir quién la hace.
- Hoy el plan gratuito y las ofertas no están definidos; confirmar que esa finalidad y ese plazo resisten la revisión legal.

## Cuándo publicarlos

Junto con `/privacidad` y **antes** de encender `EMAIL_HISTORY_ENABLED`. Mientras esté apagado, los párrafos de la huella no se deben mostrar. Las demás correcciones se pueden publicar antes. La app instalada tiene el texto en su código: necesita una versión nueva.

El estilo de las tarjetas no cambia. En la web y la app, el texto pasa de un párrafo a varios.

## Novedad

No lleva ficha: es un cambio de texto legal en Cuenta.
