import ActivityKit
import Foundation

// Datos de la Live Activity del descanso. Este archivo lo compilan tanto la app
// (que inicia y actualiza la actividad) como la extensión RestTimerWidget (que
// la dibuja en la isla dinámica y en la pantalla de bloqueo).
@available(iOS 16.1, *)
struct RestTimerAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    // Inicio y fin del descanso. La cuenta regresiva la dibuja el sistema con
    // estas dos fechas, así sigue corriendo sin que la app esté activa.
    var startedAt: Date
    var endsAt: Date
  }
}
