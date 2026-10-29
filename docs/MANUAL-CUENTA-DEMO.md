# Manual de la cuenta demo (coach y atletas)

Guía para hacer una demo en vivo de Cycles en https://app.getcycles.app sin levantar nada. Complementa a [MANUAL-DEMOS.md](MANUAL-DEMOS.md), que explica cómo crear y reiniciar la demo (sección 6).

## 0. De dónde sale la contraseña

Las nueve cuentas (el coach y los ocho atletas) comparten **una sola contraseña**. No está en el repo ni en ningún servicio: se la elige quien crea la demo y se guarda en un archivo del computador de quien la creó.

- **Dónde está:** en el archivo `~/.cycles-secretos/demo/DEMO_PASSWORD` del Mac donde se creó la demo (carpeta de usuario → `.cycles-secretos` → `demo`). Es una carpeta oculta; en el Finder se ven con `Cmd + Shift + .`.
- **Para copiarla sin verla** (queda en el portapapeles, lista para pegar en el login):

  ```bash
  pbcopy < ~/.cycles-secretos/demo/DEMO_PASSWORD
  ```

- **Para verla** (solo si estás a solas, nunca a cuadro ni compartiendo pantalla):

  ```bash
  cat ~/.cycles-secretos/demo/DEMO_PASSWORD
  ```

- **Si el archivo no existe** (computador nuevo, carpeta borrada): la contraseña se perdió. Genera una nueva y vuelve a crear la demo para que las cuentas queden con ella (sección 6 de [MANUAL-DEMOS.md](MANUAL-DEMOS.md)):

  ```bash
  mkdir -p ~/.cycles-secretos/demo && umask 077 && openssl rand -base64 18 | tr -d '/+=' | cut -c1-16 > ~/.cycles-secretos/demo/DEMO_PASSWORD
  ```

- **Respaldo:** guárdala también en tu gestor de contraseñas, con el nombre «Cycles demo». Así no depende de un solo computador.
- **Regla:** nunca la escribas en el repo, en un chat, en Linear ni en Notion, y cuida que no salga a cuadro. El repo es público.

Si le pasas la demo a otra persona, entrégale la contraseña por tu gestor de contraseñas, no por mensaje.

---

## 1. Antes de la demo (10 minutos antes)

- [ ] **Reinicia la demo** si pasaron más de unos días desde la última vez (sección 6 de MANUAL-DEMOS.md). La demo ancla el plan a la semana en que se creó: si no, «esta semana» queda atrasada.
- [ ] **Despierta la API.** En el plan gratis de Render se duerme a los 15 minutos. Abre https://app.getcycles.app y entra con el coach; el primer ingreso puede tardar.
- [ ] Prueba el ingreso del coach y de un atleta antes de conectar el proyector.
- [ ] Cierra el gestor de contraseñas y otras pestañas con datos reales; usa una ventana de incógnito.
- [ ] Si vas a mostrar el atleta en paralelo, usa otra ventana (o el navegador del teléfono) con una sesión distinta.

---

## 2. Cuentas

| Rol | Correo | Qué muestra |
|---|---|---|
| Coach | `coach.demo@example.com` (Camila Reyes) | Atletas, Biblioteca, calendario y ciclos |
| Atleta | `valentina.soto@example.com` | Constante: sin avisos |
| Atleta | `tomas.villalobos@example.com` | Constante |
| Atleta | `antonia.cardenas@example.com` | Constante |
| Atleta | `sebastian.rojas@example.com` | Constante |
| Atleta | `javiera.munoz@example.com` | Reporta **dolor de rodilla** esta semana |
| Atleta | `matias.fuentes@example.com` | **Carga alta**: sentadilla al límite en las dos últimas sesiones de piernas |
| Atleta | `renata.aguirre@example.com` | **Carga baja**: press de banca con mucho margen |
| Atleta | `diego.paredes@example.com` | **Poca adherencia**: omitió sesiones esta semana |

Todos tienen el ciclo **Fuerza base** (6 semanas, 3 sesiones por semana: Piernas, Empuje y Tirón), con la ejecución de las semanas 1 a 4 registrada.

---

## 3. Recorrido como coach (5–7 minutos)

Entra en https://app.getcycles.app → **Iniciar sesión** con `coach.demo@example.com`.

1. **Atletas.** La lista muestra a los ocho. Arriba aparece **«Necesitan atención»**: Javiera (dolor), Matías (carga alta), Renata (carga baja) y Diego (adherencia). Idea para contar: *«en vez de abrir ocho planillas, Cycles te dice a quién mirar primero»*.
2. **Ficha de un atleta.** Abre a Javiera: ve el dolor reportado y la nota. Abre a Matías: ve las cargas y la sugerencia de ajuste.
3. **Ajuste de carga.** Con Matías o Renata, muestra la sugerencia de ajuste y **acéptala o descártala**. Es la parte que mejor muestra el «gemelo digital»: el sistema entiende cómo responde cada atleta.
4. **Ciclo.** Entra al ciclo **Fuerza base** (pizarra): semanas, sesiones y ejercicios; el calendario del ciclo con lo ya ejecutado.
5. **Calendario.** Vista general de las sesiones de la semana.
6. **Biblioteca.** Rutinas y ejercicios. Puedes abrir el creador de rutinas para mostrar lo rápido que se arma una.

Si te quedan minutos: crear un ciclo nuevo desde la ficha de un atleta.

---

## 4. Recorrido como atleta (3–5 minutos)

Entra con `valentina.soto@example.com` (o con Javiera si quieres mostrar el dolor).

1. **Hoy.** Qué le toca entrenar.
2. **Sesión.** Ejercicios con series, repeticiones, carga y descanso objetivo.
3. **Registro.** Serie por serie: repeticiones, peso y reservas (RIR).
4. **Cierre.** Cómo se sintió (esfuerzo percibido), duración, dolor y nota.
5. **Vuelta al coach.** Con otra ventana, muestra cómo el coach ve lo que acaba de registrar el atleta.

> La app del atleta está pensada para el teléfono. En la web puedes mostrarla en una ventana angosta o con el modo móvil del navegador.

---

## 5. Frases que funcionan

- *«El coach diseña el plan; el atleta solo registra lo que hizo. Nadie rearma planillas.»*
- *«Cycles te dice quién necesita tu atención hoy.»*
- *«Esto es lo que existe hoy. La visión es un gemelo digital del atleta que te ayude a planificar.»* (no prometas lo que no está)

---

## 6. Lo que no debes hacer

- **No invites desde la demo a correos reales** a menos que sea a propósito: los correos de invitación salen de verdad.
- **No cambies la contraseña** de las cuentas demo desde la app: el reinicio las restablece, pero te quedarías sin acceso a la mitad de la demo.
- **No muestres la URL de la base ni las variables de entorno.**
- Las cuentas demo no cuentan en las métricas ni en el resumen de Slack (llevan la marca `isDemo`).

---

## 7. Si algo sale mal

| Síntoma | Qué hacer |
|---|---|
| La app tarda mucho en entrar | La API estaba dormida; espera 30–60 segundos y vuelve a intentar. |
| «Esta semana» muestra fechas viejas | Reinicia la demo (sección 6 de MANUAL-DEMOS.md). |
| Contraseña rechazada | Usa la de la sección 0. Si el archivo cambió después de crear la demo, la demo quedó con otra: reiníciala para que use la actual. |
| Falta un atleta o cambió algo | Reinicia la demo: borra y recrea las nueve cuentas. |
| Aparece la pantalla de aceptar términos | Se subió la versión de los textos legales; reinicia la demo. |
