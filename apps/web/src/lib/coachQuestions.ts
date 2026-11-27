// Las siete preguntas del perfil del coach (CYC-295, docs/diseno/invitacion-onboarding/registro.md),
// con lo que muestra la web. Las claves y las reglas son las de la API, que es quien manda (una prueba
// compara las dos listas). Sin datos de salud.
export type QuestionId = "places" | "modes" | "sports" | "athleteRange" | "tools" | "pains" | "trainingTypes";
export type Answers = Record<QuestionId, string[]>;

export const OTHER = "otro";
export const MAX_OTHER_LENGTH = 60;

export interface Option {
  key: string;
  label: string;
  // Cómo se lee en la tarjeta del perfil, si el texto completo no cabe.
  short?: string;
  emoji?: string;
  // Otras formas de escribirlo en el buscador.
  aliases?: string[];
}

export interface Question {
  id: QuestionId;
  title: string;
  // La fila de «Tu perfil de coach».
  row: string;
  options: Option[];
  max?: number;
  // Una sola respuesta (se ve como opciones redondas).
  single?: boolean;
  exclusive?: string;
  otherPlaceholder?: string;
}

const o = (key: string, label: string, extra: Partial<Option> = {}): Option => ({ key, label, ...extra });
const sport = (key: string, label: string, emoji: string, aliases?: string[]) => o(key, label, { emoji, aliases });

export const QUESTIONS: Question[] = [
  { id: "places", title: "¿Dónde entrenas?", row: "Dónde", otherPlaceholder: "¿Dónde? (opcional)", options: [o("gimnasio", "Gimnasio"), o("online", "Online"), o("cancha", "Cancha"), o(OTHER, "Otro")] },
  { id: "modes", title: "¿Cómo entrenas?", row: "Cómo", otherPlaceholder: "¿Cómo? (opcional)", options: [o("uno-a-uno", "1:1"), o("grupos", "Grupos"), o("equipos", "Equipos"), o(OTHER, "Otro")] },
  {
    id: "sports",
    title: "¿Qué deportes hacen tus deportistas? Elige todos los que conozcas",
    row: "Deportes",
    exclusive: "sin-deporte-especifico",
    otherPlaceholder: "¿Cuál? (opcional)",
    options: [
      sport("voleibol", "Vóleibol", "🏐", ["voley", "volley", "volei"]),
      sport("futbol", "Fútbol", "⚽", ["football", "soccer"]),
      sport("futsal", "Futsal", "🥅", ["futbolito", "futbol sala"]),
      sport("basquetbol", "Básquetbol", "🏀", ["basquet", "basket"]),
      sport("handball", "Handball", "🤾", ["balonmano"]),
      sport("rugby", "Rugby", "🏉"),
      sport("hockey", "Hockey", "🏑"),
      sport("natacion", "Natación", "🏊", ["nadar"]),
      sport("atletismo", "Atletismo", "🏃"),
      sport("running", "Running", "👟", ["correr", "trote"]),
      sport("ciclismo", "Ciclismo", "🚴", ["bici"]),
      sport("triatlon", "Triatlón", "⏱️"),
      sport("tenis", "Tenis", "🎾"),
      sport("padel", "Pádel", "🏓", ["paddle"]),
      sport("karate", "Karate", "🥋"),
      sport("judo", "Judo", "🥋"),
      sport("taekwondo", "Taekwondo", "🥋"),
      sport("boxeo", "Boxeo", "🥊", ["box"]),
      sport("gimnasia", "Gimnasia", "🤸"),
      sport("halterofilia", "Halterofilia", "🏋️", ["levantamiento olimpico", "pesas"]),
      sport("powerlifting", "Powerlifting", "💪"),
      sport("escalada", "Escalada", "🧗"),
      sport(OTHER, "Otro deporte", "➕"),
      o("sin-deporte-especifico", "No hacen un deporte específico", { short: "Sin deporte específico" }),
    ],
  },
  {
    id: "athleteRange",
    title: "¿A cuántas personas entrenas hoy?",
    row: "Personas",
    max: 1,
    single: true,
    options: [o("ninguna", "Todavía a ninguna", { short: "Ninguna aún" }), o("1-5", "De 1 a 5"), o("6-15", "De 6 a 15"), o("16-40", "De 16 a 40"), o("mas-de-40", "Más de 40")],
  },
  {
    id: "tools",
    title: "¿Con qué planificas y haces seguimiento hoy?",
    row: "Hoy usas",
    exclusive: "sin-registro",
    otherPlaceholder: "¿Cuál? (opcional)",
    options: [
      o("planillas", "Excel o Google Sheets", { short: "Planillas" }),
      o("papel", "Papel o cuaderno", { short: "Papel" }),
      o("mensajes", "WhatsApp u otros mensajes", { short: "Mensajes" }),
      o("otra-app", "Otra app de entrenamiento", { short: "Otra app" }),
      o("sin-registro", "Todavía no llevo registro", { short: "Sin registro" }),
      o(OTHER, "Otro"),
    ],
  },
  {
    id: "pains",
    title: "¿Qué es lo que más te cuesta hoy? Elige hasta dos",
    row: "Te cuesta",
    max: 2,
    otherPlaceholder: "¿Qué? (opcional)",
    options: [
      o("armar-planes", "Armar los planes"),
      o("ajustar", "Ajustar según cómo responde cada persona", { short: "Ajustar planes" }),
      o("seguimiento", "Saber quién entrenó y cómo le fue", { short: "Seguimiento" }),
      o("organizar", "Organizar a muchas personas o equipos", { short: "Organizar" }),
      o("mostrar-avance", "Mostrarles su avance", { short: "Mostrar avance" }),
      o(OTHER, "Otro"),
    ],
  },
  {
    id: "trainingTypes",
    title: "¿Qué tipo de entrenamiento haces? Elige todos los que apliquen",
    row: "Entrenan",
    otherPlaceholder: "¿Cuál? (opcional)",
    options: [
      o("fuerza", "Fuerza"),
      o("hipertrofia", "Hipertrofia"),
      o("potencia", "Potencia y saltos", { short: "Potencia" }),
      o("velocidad", "Velocidad y agilidad", { short: "Velocidad" }),
      o("resistencia", "Resistencia"),
      o("funcional", "Funcional"),
      o("tecnico-tactico", "Técnico y táctico", { short: "Técnico-táctico" }),
      o("movilidad", "Movilidad"),
      o("readaptacion", "Readaptación y prevención", { short: "Readaptación" }),
      o("acondicionamiento", "Acondicionamiento general", { short: "Acondicionamiento" }),
      o(OTHER, "Otro"),
    ],
  },
];

export const emptyAnswers = (): Answers => ({ places: [], modes: [], sports: [], athleteRange: [], tools: [], pains: [], trainingTypes: [] });

// En el registro el avance cuenta la cuenta y las siete preguntas: ocho pasos. `step` 0 es la
// cuenta, 1 a 7 las preguntas y 8 el final.
export const FINAL_STEP = QUESTIONS.length + 1;
export const progressOf = (step: number) => (step >= FINAL_STEP ? 100 : Math.round((step / FINAL_STEP) * 100));

// En la encuesta a cuentas anteriores no hay paso de cuenta: el avance cuenta solo las preguntas.
export const surveyProgressOf = (step: number) => (step >= FINAL_STEP ? 100 : Math.max(0, Math.round(((step - 1) / QUESTIONS.length) * 100)));

// Dónde retomar con lo ya respondido.
export const resumeAt = (lastStep: number) => Math.min(Math.max(lastStep, 0) + 1, FINAL_STEP);

// Marcar o desmarcar una opción, con las reglas de la pregunta.
export function toggle(question: Question, values: string[], key: string): string[] {
  if (question.single) return [key];
  if (values.includes(key)) return values.filter((v) => v !== key);
  if (key === question.exclusive) return [key];
  const next = values.filter((v) => v !== question.exclusive);
  return question.max !== undefined && next.length >= question.max ? values : [...next, key];
}

// Con el máximo elegido, las demás se desactivan.
export const isBlocked = (question: Question, values: string[], key: string) =>
  !question.single && question.max !== undefined && values.length >= question.max && !values.includes(key);

const plain = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// El buscador de deportes, sin tildes y con otras formas de escribirlos. «Otro deporte» y «No hacen un
// deporte específico» van aparte y no se filtran.
export function searchSports(question: Question, text: string): Option[] {
  const needle = plain(text);
  return question.options
    .filter((x) => x.key !== OTHER && x.key !== question.exclusive)
    .filter((x) => !needle || [x.label, ...(x.aliases ?? [])].some((name) => plain(name).includes(needle)));
}

// Las etiquetas de una fila del perfil: hasta tres; con más, dos y «+n».
export function profileTags(question: Question, values: string[]): { shown: Option[]; more: number } {
  const options = values.map((v) => question.options.find((x) => x.key === v)).filter((x): x is Option => Boolean(x));
  return options.length > 3 ? { shown: options.slice(0, 2), more: options.length - 2 } : { shown: options, more: 0 };
}
