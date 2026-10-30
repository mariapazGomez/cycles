import type { Equipment } from "@prisma/client";

// Implementos de cada ejercicio del catálogo global (los 54 de prisma/seed.ts),
// revisados a mano. Cada lista es lo que el ejercicio necesita **todo junto**:
// la búsqueda «con lo que tengo» muestra un ejercicio solo si el coach marcó
// todos sus implementos. «bodyweight» va solo.
//
// null = ningún implemento de la lista cerrada lo describe todavía. Esos
// ejercicios quedan sin implementos (y fuera de la búsqueda) hasta que se
// amplíe la lista. Diseño en docs/diseno/crear-ejercicio.
export const CATALOG_EQUIPMENT: Record<string, Equipment[] | null> = {
  // Pecho
  "Press de banca con barra": ["barbell", "plates", "bench", "rack"],
  "Press de banca con mancuernas": ["dumbbells", "bench"],
  "Press inclinado con mancuernas": ["dumbbells", "bench"],
  "Aperturas con mancuernas": ["dumbbells", "bench"],
  "Fondos en paralelas": ["dip_bars"],
  "Cruce de poleas": ["cable"],
  // Espalda
  Dominadas: ["pullup_bar"],
  "Remo con barra": ["barbell", "plates"],
  "Remo con mancuerna a un brazo": ["dumbbells", "bench"],
  "Jalón al pecho": ["cable"],
  "Remo sentado en polea": ["cable"],
  "Peso muerto": ["barbell", "plates"],
  "Hiperextensión lumbar": ["machine"],
  "Remo en máquina": ["machine"],
  // Piernas
  "Sentadilla con barra": ["barbell", "plates", "rack"],
  "Sentadilla búlgara": ["dumbbells", "bench"],
  "Sentadilla goblet": ["kettlebell"],
  "Prensa de piernas": ["machine"],
  "Zancadas con mancuernas": ["dumbbells"],
  "Extensión de cuádriceps": ["machine"],
  "Curl femoral tumbado": ["machine"],
  "Elevación de talones de pie": ["machine"],
  "Peso muerto rumano": ["barbell", "plates"],
  // Glúteos
  "Empuje de cadera con barra": ["barbell", "plates", "bench"],
  "Puente de glúteos": ["bodyweight"],
  "Patada de glúteo en polea": ["cable"],
  // Hombros
  "Press militar con barra": ["barbell", "plates", "rack"],
  "Press militar con mancuernas": ["dumbbells", "bench"],
  "Elevaciones laterales con mancuernas": ["dumbbells"],
  "Elevaciones frontales con mancuernas": ["dumbbells"],
  "Pájaros con mancuernas": ["dumbbells"],
  "Encogimientos de hombros con barra": ["barbell", "plates"],
  // Brazos
  "Curl de bíceps con barra": ["barbell", "plates"],
  "Curl de bíceps con mancuernas": ["dumbbells"],
  "Curl martillo": ["dumbbells"],
  "Curl en banco Scott": ["barbell", "plates", "bench"],
  "Press francés": ["barbell", "plates", "bench"],
  "Extensión de tríceps en polea": ["cable"],
  "Fondos de tríceps en banco": ["bench"],
  "Curl de muñeca con barra": ["barbell", "plates", "bench"],
  // Core
  "Plancha abdominal": ["bodyweight"],
  "Crunch abdominal": ["bodyweight"],
  "Elevación de piernas colgado": ["pullup_bar"],
  "Giro ruso": ["bodyweight"],
  "Rueda abdominal": null,
  "Encogimiento abdominal en polea": ["cable"],
  // Cardio
  "Salto de cuerda": null,
  Burpees: ["bodyweight"],
  Escalador: ["bodyweight"],
  "Remo en ergómetro": ["machine"],
  "Sprint en cinta": ["machine"],
  // Otros
  "Peso muerto sumo": ["barbell", "plates"],
  "Balanceo con pesa rusa": ["kettlebell"],
  "Levantamiento turco": ["kettlebell"],
};
