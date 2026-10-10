import { BadRequestException, ValidationError, ValidationPipe } from "@nestjs/common";

// Los mensajes por defecto de class-validator vienen en inglés ("email must be
// an email"). Aquí se traducen, con el nombre del campo en español, para que la
// persona vea algo entendible. Los DTOs que ya traen su propio mensaje en
// español (`{ message: "…" }`) no se tocan: solo se traduce el texto por
// defecto de la librería.

// Nombre legible de cada campo, con su artículo, para armar "El email …".
const FIELD_LABELS: Record<string, string> = {
  email: "El email",
  name: "El nombre",
  password: "La contraseña",
  newPassword: "La nueva contraseña",
  token: "El enlace",
  code: "El código",
  refreshToken: "La sesión",
  message: "El mensaje",
  role: "El rol",
  objective: "El objetivo",
  description: "La descripción",
  notes: "Las notas",
  painNotes: "Las notas de dolor",
  reason: "El motivo",
  status: "El estado",
  outcome: "El resultado",
  startDate: "La fecha de inicio",
  endDate: "La fecha de fin",
  scheduledDate: "La fecha",
  date: "La fecha",
  weeks: "Las semanas",
  weekNumber: "El número de semana",
  slotNumber: "El número de sesión",
  sessionsPerWeek: "Las sesiones por semana",
  cycleType: "El tipo de plan",
  exerciseId: "El ejercicio",
  exercises: "Los ejercicios",
  routineId: "La rutina",
  athleteId: "El atleta",
  cycleId: "El plan",
  sessionId: "La sesión",
  parentCycleId: "El plan contenedor",
  supersedesId: "El registro a corregir",
  setNumber: "El número de serie",
  actualReps: "Las repeticiones",
  actualWeight: "El peso",
  rir: "Las repeticiones en reserva",
  srpe: "El esfuerzo",
  durationMinutes: "La duración",
  pain: "El dolor",
  targetSets: "Las series objetivo",
  targetReps: "Las repeticiones objetivo",
  targetWeight: "El peso objetivo",
  targetRir: "Las repeticiones en reserva objetivo",
  targetRestSeconds: "El descanso objetivo",
  defaultSets: "Las series por defecto",
  defaultReps: "Las repeticiones por defecto",
  defaultWeight: "El peso por defecto",
  defaultRir: "Las repeticiones en reserva por defecto",
  defaultRestSeconds: "El descanso por defecto",
  muscleGroup: "El grupo muscular",
  videoUrl: "El enlace del video",
  percentChange: "El porcentaje de cambio",
  fromWeek: "La semana de inicio",
  dataConsent: "El consentimiento",
};

// Concordancia con el nombre del campo ("La contraseña es obligatoria", "Las
// notas deben ser texto").
const plural = (l: string) => /^(Los|Las) /.test(l);
const femenino = (l: string) => /^(La|Las) /.test(l);
const verbo = (l: string, singular: string, plural_: string) => (plural(l) ? plural_ : singular);
const adjetivo = (l: string, raiz: string) => `${raiz}${femenino(l) ? "a" : "o"}${plural(l) ? "s" : ""}`;
const esObligatorio = (l: string) => `${l} ${verbo(l, "es", "son")} ${adjetivo(l, "obligatori")}.`;

// Cada regla reconoce el mensaje por defecto de la librería (en inglés) y lo
// reemplaza. Si el mensaje no coincide, es uno propio del DTO y se deja igual.
const RULES: Record<string, { match: RegExp; text: (label: string, n?: string) => string }> = {
  isEmail: { match: /must be an email/, text: l => `${l} no es un email válido.` },
  isNotEmpty: { match: /should not be empty/, text: esObligatorio },
  isDefined: { match: /should not be null or undefined/, text: esObligatorio },
  isString: { match: /must be a string/, text: l => `${l} ${verbo(l, "debe", "deben")} ser texto.` },
  minLength: {
    match: /longer than or equal to (\d+) characters/,
    text: (l, n) => (n === "1" ? esObligatorio(l) : `${l} ${verbo(l, "debe", "deben")} tener al menos ${n} caracteres.`),
  },
  maxLength: { match: /shorter than or equal to (\d+) characters/, text: (l, n) => `${l} ${verbo(l, "puede", "pueden")} tener hasta ${n} caracteres.` },
  isInt: { match: /must be an integer number/, text: l => `${l} ${verbo(l, "debe", "deben")} ser un número entero.` },
  isNumber: { match: /must be a number/, text: l => `${l} ${verbo(l, "debe", "deben")} ser un número.` },
  isPositive: { match: /must be a positive number/, text: l => `${l} ${verbo(l, "debe", "deben")} ser mayor que cero.` },
  min: { match: /must not be less than (-?[\d.]+)/, text: (l, n) => `${l} no ${verbo(l, "puede", "pueden")} ser menor que ${n}.` },
  max: { match: /must not be greater than (-?[\d.]+)/, text: (l, n) => `${l} no ${verbo(l, "puede", "pueden")} ser mayor que ${n}.` },
  isBoolean: { match: /must be a boolean value/, text: l => `${l} ${verbo(l, "debe", "deben")} ser sí o no.` },
  isEnum: { match: /must be one of the following values/, text: l => `${l} no ${verbo(l, "tiene", "tienen")} un valor permitido.` },
  isIn: { match: /must be one of the following values/, text: l => `${l} no ${verbo(l, "tiene", "tienen")} un valor permitido.` },
  isUuid: { match: /must be a UUID/, text: l => `${l} no ${verbo(l, "es", "son")} ${adjetivo(l, "válid")}.` },
  isDateString: { match: /must be a valid ISO 8601 date string/, text: l => `${l} no ${verbo(l, "tiene", "tienen")} un formato de fecha válido.` },
  isUrl: { match: /must be a URL address/, text: l => `${l} no ${verbo(l, "es", "son")} una dirección web válida.` },
  isArray: { match: /must be an array/, text: l => `${l} ${verbo(l, "debe", "deben")} ser una lista.` },
  arrayMinSize: { match: /must contain at least (\d+) elements/, text: (l, n) => `${l} ${verbo(l, "debe", "deben")} tener al menos ${n} ${n === "1" ? "elemento" : "elementos"}.` },
  matches: { match: /must match .* regular expression/, text: l => `${l} no ${verbo(l, "tiene", "tienen")} un formato válido.` },
};

function labelOf(property: string): string {
  return FIELD_LABELS[property] ?? `El campo "${property}"`;
}

export function translateConstraint(property: string, constraint: string, message: string): string {
  const rule = RULES[constraint];
  const found = rule?.match.exec(message);
  if (!rule || !found) {
    return message;
  }
  return rule.text(labelOf(property), found[1]);
}

// Aplana los errores (incluidos los de objetos anidados) en una lista de
// mensajes en español, sin repetir. Si el campo falta o viene vacío y todos sus
// mensajes eran los de la librería, se dice una sola cosa: "es obligatorio"
// (y no "debe ser texto" más "debe tener al menos 1 caracteres").
export function translateValidationErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  const walk = (error: ValidationError) => {
    const entries = Object.entries(error.constraints ?? {});
    if (entries.length > 0) {
      const translated = entries.map(([constraint, message]) => translateConstraint(error.property, constraint, message));
      const allDefault = entries.every(([constraint, message], i) => translated[i] !== message || !RULES[constraint]);
      const allLibrary = entries.every(([constraint, message]) => RULES[constraint]?.match.test(message));
      const empty = error.value === undefined || error.value === null || error.value === "";
      if (empty && allLibrary && allDefault) {
        messages.push(esObligatorio(labelOf(error.property)));
      } else {
        messages.push(...translated);
      }
    }
    (error.children ?? []).forEach(walk);
  };
  errors.forEach(walk);
  return [...new Set(messages)];
}

// ValidationPipe global de la API, con los mensajes en español.
export function spanishValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: errors => new BadRequestException(translateValidationErrors(errors)),
  });
}
