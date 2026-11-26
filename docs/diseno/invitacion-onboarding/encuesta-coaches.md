# Encuesta para los coaches que ya tienen cuenta (CYC-295)

Solo diseño. **Maqueta aprobada.** La usuaria escribió «apruebo las maquetas» en el chat de Organización (26-11), que lo trasladó a diseño. Se aprueba lo que muestran las maquetas y capturas. Las reglas que no se ven en ellas siguen como se indica en este documento. Maqueta que se puede recorrer en [encuesta-coaches.html](encuesta-coaches.html); capturas `capturas/encuesta-*.png`. Es solo la web.

## Decidido por la usuaria (26-11)

Los coaches que ya tienen cuenta deben responder la encuesta cuando entren, con un mensaje de mejora continua que explique por qué. **Obligatoria** (confirmado en el chat de diseño, 26-11); la maqueta la muestra sin forma de saltarla.

## Textos

| Pieza | Texto |
|---|---|
| Título | Ayúdanos a mejorar Cycles |
| Motivo | Mejoramos la plataforma de forma continua y queremos que cada cambio responda a cómo entrenas. Por eso te pedimos responder 7 preguntas, una sola vez. |
| Aviso de uso | Con estas respuestas adaptamos Cycles a tu forma de entrenar, te ofrecemos lo que te sirva y preparamos mejor nuestras conversaciones contigo. |
| Botón | Empezar |
| Final | Gracias por ayudarnos. Con tus respuestas seguimos mejorando Cycles. |
| Botón final | Volver a Cycles |
| Error al guardar | No pudimos guardar tu respuesta. Revisa tu conexión y toca «Siguiente» otra vez. |

El texto no promete cuánto demora: no se ha medido.

**Por revisar:** el aviso de uso es el aprobado para el registro y dice «te ofrecemos lo que te sirva». La usuaria indicó que por ahora no se envían ofertas. Propuesta: mantenerlo, porque declara un uso futuro, y revisar legalmente si enviar ofertas pedirá una autorización aparte.

## Igual que el registro

Las mismas siete preguntas, opciones, reglas de selección, emojis, perfil que se va llenando, transiciones y «reducir movimiento» ([registro.md](registro.md)). Si cambia una pregunta, cambia en los dos.

## Lo que cambia

- No hay paso de cuenta. Hay una bienvenida con el motivo y el aviso de uso, que en el registro va en la primera pregunta.
- El % cuenta solo las siete preguntas: 0, 14, 29, 43, 57, 71, 86 y 100.
- «Atrás» desde la primera pregunta vuelve a la bienvenida.
- El final no lleva a «Así se arma un ciclo».
- El fondo es la propia app, borrosa, como en las novedades.

## Cuándo aparece

1. Solo a cuentas de coach de la web sin la encuesta completa. Nunca a atletas. Las cuentas demo no la ven (propuesta, para no frenar demostraciones).
2. Al cargar la app, después de aceptar Términos y Política si estaban pendientes.
3. Mientras esté pendiente no aparecen la guía de primer uso ni las novedades. Al terminar, la guía sigue donde estaba; las novedades esperan a la próxima vez que se cargue la app, para no encadenar ventanas (propuesta).
4. Cada respuesta se guarda al avanzar. Si la persona sale, retoma donde quedó.
5. Quien completó el registro nuevo no la ve. Quien lo dejó a medias retoma sus preguntas en el registro.

## Obligatoria, sin dejar a nadie encerrado

No tiene «×» ni «Saltar», y no se cierra con Escape ni tocando afuera. Aun así (propuestas):

- **«Mi cuenta»** abre la página de cuenta sin la encuesta encima, para poder descargar sus datos o eliminar la cuenta sin tener que responder. La encuesta vuelve al salir de esa página.
- **«Cerrar sesión»** siempre visible.
- Si no se puede saber si la encuesta está pendiente (falla la consulta), el coach entra normal y se le pide la próxima vez.
- Si falla el guardado, se avisa en la tarjeta y se conserva lo elegido. Los dos enlaces de arriba siguen disponibles.

Es una ventana con foco atrapado: el foco empieza en el título de cada paso y el avance se anuncia a los lectores de pantalla.

## Alcance y datos

- La app móvil no muestra la encuesta. Un coach que solo use la app no la verá hasta entrar a la web.
- Usa el mismo perfil de coach del modelo del registro: pendiente mientras no tenga fecha de término. No requiere otro cambio en la base.
- `/privacidad` debe actualizarse antes de publicarla, porque se pide a cuentas que ya aceptaron la versión actual. Desarrollo debe definir si esto exige una versión nueva de la política y volver a aceptarla.

## Para después

El resumen general de respuestas y la descarga de un archivo para el equipo quedan para después. No se envían ofertas por ahora.

## Qué pasa con las respuestas

Decidido por la usuaria (26-11): se guardan; el equipo las ve en [el detalle de cada coach en admin](admin-respuestas.md); el coach no tiene por ahora una pantalla para verlas o cambiarlas; se incluyen en «Descargar mis datos» y se borran al eliminar la cuenta.

## Novedad

No lleva ficha: la encuesta es en sí la ventana que ve el coach y explica el motivo.
