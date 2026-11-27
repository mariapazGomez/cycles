// Las siete preguntas del perfil del coach (CYC-295, docs/diseno/invitacion-onboarding/registro.md).
// Se guardan las claves, no los textos. Una opción que se retire se deja aquí marcada
// `retired`, para seguir mostrando lo que la persona eligió. Sin datos de salud.
export const QUESTION_IDS = ["places", "modes", "sports", "athleteRange", "tools", "pains", "trainingTypes"] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

export const OTHER = "otro";
export const NO_SPORT = "sin-deporte-especifico";
export const MAX_OTHER_LENGTH = 60;

export interface Option {
  key: string;
  label: string;
  emoji?: string;
  retired?: boolean;
}

export interface Question {
  id: QuestionId;
  // La etiqueta corta con que se lee en admin.
  adminLabel: string;
  options: Option[];
  // Cuántas se pueden elegir (sin valor: todas).
  max?: number;
  // Opción que excluye a las demás.
  exclusive?: string;
}

const list = (pairs: [string, string, string?][]): Option[] => pairs.map(([key, label, emoji]) => ({ key, label, ...(emoji ? { emoji } : {}) }));

export const QUESTIONS: Question[] = [
  { id: "places", adminLabel: "Dónde entrena", options: list([["gimnasio", "Gimnasio"], ["online", "Online"], ["cancha", "Cancha"], [OTHER, "Otro"]]) },
  { id: "modes", adminLabel: "Cómo entrena", options: list([["uno-a-uno", "1:1"], ["grupos", "Grupos"], ["equipos", "Equipos"], [OTHER, "Otro"]]) },
  {
    id: "sports",
    adminLabel: "Deportes de sus deportistas",
    exclusive: NO_SPORT,
    options: list([
      ["voleibol", "Vóleibol", "🏐"], ["futbol", "Fútbol", "⚽"], ["futsal", "Futsal", "🥅"], ["basquetbol", "Básquetbol", "🏀"],
      ["handball", "Handball", "🤾"], ["rugby", "Rugby", "🏉"], ["hockey", "Hockey", "🏑"], ["natacion", "Natación", "🏊"],
      ["atletismo", "Atletismo", "🏃"], ["running", "Running", "👟"], ["ciclismo", "Ciclismo", "🚴"], ["triatlon", "Triatlón", "⏱️"],
      ["tenis", "Tenis", "🎾"], ["padel", "Pádel", "🏓"], ["karate", "Karate", "🥋"], ["judo", "Judo", "🥋"], ["taekwondo", "Taekwondo", "🥋"],
      ["boxeo", "Boxeo", "🥊"], ["gimnasia", "Gimnasia", "🤸"], ["halterofilia", "Halterofilia", "🏋️"], ["powerlifting", "Powerlifting", "💪"],
      ["escalada", "Escalada", "🧗"], [OTHER, "Otro deporte", "➕"], [NO_SPORT, "No hacen un deporte específico"],
    ]),
  },
  {
    id: "athleteRange",
    adminLabel: "Personas que entrena hoy",
    max: 1,
    options: list([["ninguna", "Todavía a ninguna"], ["1-5", "De 1 a 5"], ["6-15", "De 6 a 15"], ["16-40", "De 16 a 40"], ["mas-de-40", "Más de 40"]]),
  },
  {
    id: "tools",
    adminLabel: "Planifica y hace seguimiento con",
    exclusive: "sin-registro",
    options: list([
      ["planillas", "Excel o Google Sheets"], ["papel", "Papel o cuaderno"], ["mensajes", "WhatsApp u otros mensajes"],
      ["otra-app", "Otra app de entrenamiento"], ["sin-registro", "Todavía no llevo registro"], [OTHER, "Otro"],
    ]),
  },
  {
    id: "pains",
    adminLabel: "Lo que más le cuesta",
    max: 2,
    options: list([
      ["armar-planes", "Armar los planes"], ["ajustar", "Ajustar según cómo responde cada persona"], ["seguimiento", "Saber quién entrenó y cómo le fue"],
      ["organizar", "Organizar a muchas personas o equipos"], ["mostrar-avance", "Mostrarles su avance"], [OTHER, "Otro"],
    ]),
  },
  {
    id: "trainingTypes",
    adminLabel: "Tipo de entrenamiento",
    options: list([
      ["fuerza", "Fuerza"], ["hipertrofia", "Hipertrofia"], ["potencia", "Potencia y saltos"], ["velocidad", "Velocidad y agilidad"],
      ["resistencia", "Resistencia"], ["funcional", "Funcional"], ["tecnico-tactico", "Técnico y táctico"], ["movilidad", "Movilidad"],
      ["readaptacion", "Readaptación y prevención"], ["acondicionamiento", "Acondicionamiento general"], [OTHER, "Otro"],
    ]),
  },
];

export const questionById = (id: QuestionId): Question => QUESTIONS.find((q) => q.id === id)!;
