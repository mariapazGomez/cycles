import type { EventIntensity, EventSport, EventType, PrismaClient } from "@prisma/client";

// Actividades paralelas y campeonatos de los atletas de la demo (CYC-273): cada atleta practica un
// deporte y se ven sus entrenamientos y partidos en paralelo a las sesiones del coach, para mostrar los
// calendarios del coach (Inicio y perfil, CYC-253) y la app. Las fechas son relativas a HOY.
//
// SOLO INSERTA y solo en cuentas de demostración (isDemo = true, @example.com): no borra ni cambia
// nada. Es idempotente: cada fila lleva un id fijo y, si ya existe, se omite. Lo usan el script
// aparte `seed-demo-eventos.ts` (para producción, sin recargar la demo) y `seed-demo.ts`.

const DAY = 24 * 60 * 60 * 1000;
const WEEKDAY = { lun: 0, mar: 1, mie: 2, jue: 3, vie: 4, sab: 5, dom: 6 } as const;

interface Entrenamiento {
  title: string;
  days: number[];
  time: string;
  min: number;
  intensity: EventIntensity;
}
interface Perfil {
  email: string;
  sport: EventSport;
  // Los atletas con choque de carga tienen más series en sus próximas sesiones de «Piernas» y sus partidos
  // caen el domingo (el día antes) o el martes (el día después).
  choque?: boolean;
  entrenamientos: Entrenamiento[];
  liga?: { title: string; day: number; time: string; min: number };
  campeonatos: Array<{ title: string; semanas: number; day: number }>;
  extras?: Array<{ key: string; type: EventType; sport: EventSport | null; title: string; semanas: number; day: number; time?: string; min?: number; intensity: EventIntensity | null; allDay?: boolean }>;
}

export const PERFILES: Perfil[] = [
  {
    email: "valentina.soto@example.com", sport: "volleyball", choque: true,
    entrenamientos: [{ title: "Voleibol", days: [WEEKDAY.mar, WEEKDAY.jue], time: "19:30", min: 90, intensity: "high" }],
    liga: { title: "Liga de voleibol", day: WEEKDAY.dom, time: "10:00", min: 120 },
    campeonatos: [{ title: "Copa Primavera", semanas: -2, day: WEEKDAY.sab }, { title: "Campeonato regional", semanas: 3, day: WEEKDAY.sab }],
  },
  {
    email: "matias.fuentes@example.com", sport: "soccer", choque: true,
    entrenamientos: [{ title: "Fútbol", days: [WEEKDAY.mar, WEEKDAY.jue], time: "20:00", min: 90, intensity: "medium" }],
    liga: { title: "Liga de fútbol amateur", day: WEEKDAY.dom, time: "11:00", min: 120 },
    campeonatos: [{ title: "Copa Barrio", semanas: -2, day: WEEKDAY.dom }, { title: "Campeonato regional", semanas: 3, day: WEEKDAY.sab }],
  },
  {
    email: "javiera.munoz@example.com", sport: "yoga",
    entrenamientos: [
      { title: "Yoga", days: [WEEKDAY.mie], time: "07:30", min: 60, intensity: "low" },
      { title: "Yoga de fin de semana", days: [WEEKDAY.sab], time: "09:00", min: 60, intensity: "low" },
    ],
    campeonatos: [{ title: "Copa de yoga", semanas: -3, day: WEEKDAY.sab }, { title: "Campeonato regional de yoga", semanas: 2, day: WEEKDAY.sab }],
    extras: [{ key: "caminata", type: "rest", sport: null, title: "Caminata", semanas: 0, day: WEEKDAY.dom, time: "10:00", min: 40, intensity: "low" }],
  },
  {
    email: "diego.paredes@example.com", sport: "cycling",
    entrenamientos: [
      { title: "Ciclismo", days: [WEEKDAY.mar], time: "07:00", min: 60, intensity: "low" },
      { title: "Salida larga en bici", days: [WEEKDAY.sab], time: "08:00", min: 150, intensity: "medium" },
    ],
    liga: { title: "Fecha del campeonato de ciclismo", day: WEEKDAY.sab, time: "16:00", min: 90 },
    campeonatos: [{ title: "Vuelta del Valle", semanas: -2, day: WEEKDAY.dom }, { title: "Campeonato regional", semanas: 3, day: WEEKDAY.dom }],
  },
  {
    email: "renata.aguirre@example.com", sport: "running",
    entrenamientos: [
      { title: "Correr", days: [WEEKDAY.mie], time: "07:00", min: 45, intensity: "low" },
      { title: "Fondo largo", days: [WEEKDAY.sab], time: "08:00", min: 90, intensity: "medium" },
    ],
    campeonatos: [{ title: "10K de primavera", semanas: -2, day: WEEKDAY.dom }, { title: "Maratón de la ciudad", semanas: 4, day: WEEKDAY.dom }],
    // Un día con 3 actividades (con su corrida del miércoles): para mostrar el «+N».
    extras: [
      { key: "yoga-mie", type: "training", sport: "yoga", title: "Yoga", semanas: 0, day: WEEKDAY.mie, time: "13:00", min: 45, intensity: "low" },
      { key: "pesas-mie", type: "training", sport: "weights", title: "Pesas", semanas: 0, day: WEEKDAY.mie, time: "20:00", min: 60, intensity: "medium" },
    ],
  },
  {
    email: "tomas.villalobos@example.com", sport: "basketball", choque: true,
    entrenamientos: [{ title: "Básquetbol", days: [WEEKDAY.mar, WEEKDAY.jue], time: "19:00", min: 90, intensity: "high" }],
    liga: { title: "Liga de básquetbol", day: WEEKDAY.dom, time: "18:00", min: 120 },
    campeonatos: [{ title: "Torneo de verano", semanas: -2, day: WEEKDAY.sab }, { title: "Campeonato regional", semanas: 2, day: WEEKDAY.sab }],
  },
  {
    email: "antonia.cardenas@example.com", sport: "swimming",
    entrenamientos: [{ title: "Natación", days: [WEEKDAY.lun, WEEKDAY.jue], time: "07:00", min: 60, intensity: "medium" }],
    liga: { title: "Liga de natación", day: WEEKDAY.sab, time: "15:00", min: 120 },
    campeonatos: [{ title: "Copa de natación", semanas: -3, day: WEEKDAY.sab }, { title: "Campeonato regional", semanas: 2, day: WEEKDAY.sab }],
  },
  {
    email: "sebastian.rojas@example.com", sport: "weights",
    entrenamientos: [{ title: "Pesas", days: [WEEKDAY.mar, WEEKDAY.jue], time: "18:00", min: 75, intensity: "medium" }],
    liga: { title: "Fecha de la liga de powerlifting", day: WEEKDAY.sab, time: "10:00", min: 180 },
    campeonatos: [{ title: "Torneo de fuerza", semanas: -2, day: WEEKDAY.sab }, { title: "Campeonato de powerlifting", semanas: 4, day: WEEKDAY.sab }],
    extras: [{ key: "viaje", type: "travel", sport: null, title: "Viaje a Valdivia", semanas: 1, day: WEEKDAY.jue, intensity: null, allDay: true }],
  },
];

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const at = (day: string) => new Date(`${day}T00:00:00Z`);

// Lunes (AAAA-MM-DD) de la semana de `now`, a medianoche UTC.
export function lunesDe(now: Date): string {
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return iso(d - ((new Date(d).getUTCDay() + 6) % 7) * DAY);
}

const addDays = (day: string, n: number) => iso(at(day).getTime() + n * DAY);

// Primer día desde `desde` que cae en uno de los días de la semana.
function primerDia(desde: string, days: number[]): string {
  for (let i = 0; i < 7; i++) {
    const d = addDays(desde, i);
    if (days.includes((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7)) return d;
  }
  return desde;
}

const slug = (email: string) => email.split("@")[0].replace(/[^a-z]/g, "");

export interface FilaEvento {
  id: string;
  athleteEmail: string;
  type: EventType;
  sport: EventSport | null;
  title: string;
  date: string;
  startTime: string | null;
  durationMin: number | null;
  allDay: boolean;
  intensity: EventIntensity | null;
  repeatDays: number[];
  repeatUntil: string | null;
}

// Las filas que se cargarían para una fecha de hoy dada (sin tocar la base): para probar y revisar.
export function filasDeEventos(hoy: Date): FilaEvento[] {
  const lunes = lunesDe(hoy);
  const desde = addDays(lunes, -21);
  const hasta = addDays(lunes, 42);
  const filas: FilaEvento[] = [];
  for (const p of PERFILES) {
    const id = (key: string) => `demo-ev-${slug(p.email)}-${key}`;
    p.entrenamientos.forEach((t, i) =>
      filas.push({
        id: id(`entrena${i}`), athleteEmail: p.email, type: "training", sport: p.sport, title: t.title,
        date: primerDia(desde, t.days), startTime: t.time, durationMin: t.min, allDay: false, intensity: t.intensity,
        repeatDays: [...t.days].sort((a, b) => a - b), repeatUntil: hasta,
      }),
    );
    if (p.liga) {
      filas.push({
        id: id("liga"), athleteEmail: p.email, type: "match", sport: p.sport, title: p.liga.title,
        date: primerDia(desde, [p.liga.day]), startTime: p.liga.time, durationMin: p.liga.min, allDay: false, intensity: "high",
        repeatDays: [p.liga.day], repeatUntil: hasta,
      });
    }
    p.campeonatos.forEach((c, i) =>
      filas.push({
        id: id(`campeonato${i}`), athleteEmail: p.email, type: "match", sport: p.sport, title: c.title,
        date: addDays(lunes, c.semanas * 7 + c.day), startTime: null, durationMin: null, allDay: true, intensity: "high",
        repeatDays: [], repeatUntil: null,
      }),
    );
    for (const x of p.extras ?? []) {
      filas.push({
        id: id(x.key), athleteEmail: p.email, type: x.type, sport: x.sport, title: x.title,
        date: addDays(lunes, x.semanas * 7 + x.day), startTime: x.allDay ? null : (x.time ?? null), durationMin: x.allDay ? null : (x.min ?? null),
        allDay: Boolean(x.allDay), intensity: x.intensity, repeatDays: [], repeatUntil: null,
      });
    }
  }
  return filas;
}

export interface ResultadoEventos {
  atletas: number;
  eventos: number;
  sesionesReforzadas: number;
}

// Inserta (sin duplicar) los eventos y refuerza las próximas sesiones de «Piernas» de los atletas con
// choque de carga, agregando dos ejercicios a sesiones pendientes (así esas sesiones son las más altas
// del ciclo y el aviso aparece solo en esos atletas). Antes de insertar, comprueba que todos son demo.
export async function cargarEventosDemo(prisma: PrismaClient, hoy = new Date()): Promise<ResultadoEventos> {
  const emails = PERFILES.map((p) => p.email);
  const usuarios = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true, isDemo: true, role: true } });
  const noDemo = usuarios.filter((u) => !u.isDemo || u.role !== "athlete" || !u.email.endsWith("@example.com"));
  if (noDemo.length > 0) {
    throw new Error(`Me niego a escribir: ${noDemo.map((u) => u.email).join(", ")} no es una cuenta de atleta de demostración (isDemo).`);
  }
  if (usuarios.length === 0) throw new Error("No hay atletas de demostración: carga primero la demo (seed-demo.ts).");
  const idDe = new Map(usuarios.map((u) => [u.email, u.id]));

  const filas = filasDeEventos(hoy).filter((f) => idDe.has(f.athleteEmail));
  const creadas = await prisma.athleteEvent.createMany({
    skipDuplicates: true,
    data: filas.map((f) => ({
      id: f.id,
      athleteId: idDe.get(f.athleteEmail) as string,
      type: f.type,
      sport: f.sport,
      title: f.title,
      date: at(f.date),
      startTime: f.startTime,
      durationMin: f.durationMin,
      allDay: f.allDay,
      intensity: f.intensity,
      notes: null,
      repeatDays: f.repeatDays,
      repeatUntil: f.repeatUntil ? at(f.repeatUntil) : null,
    })),
  });

  // Refuerzo de las próximas sesiones de «Piernas» (solo pendientes, solo de los atletas con choque).
  let reforzadas = 0;
  const catalogo = await prisma.exercise.findMany({
    where: { createdBy: null, name: { in: ["Sentadilla búlgara", "Empuje de cadera con barra"] } },
    select: { id: true, name: true },
  });
  const extra = [
    { name: "Sentadilla búlgara", sets: 4, reps: 8, kg: 24 },
    { name: "Empuje de cadera con barra", sets: 4, reps: 8, kg: 60 },
  ].flatMap((e) => {
    const ex = catalogo.find((c) => c.name === e.name);
    return ex ? [{ ...e, exerciseId: ex.id }] : [];
  });
  if (extra.length === 2) {
    for (const p of PERFILES.filter((x) => x.choque)) {
      const athleteId = idDe.get(p.email);
      if (!athleteId) continue;
      const sesiones = await prisma.trainingSession.findMany({
        where: { name: "Piernas", status: "pending", deletedAt: null, cycle: { athleteId, isTemplate: false } },
        select: { id: true },
      });
      for (const s of sesiones) {
        const r = await prisma.sessionExercise.createMany({
          skipDuplicates: true,
          data: extra.map((e, i) => ({
            id: `demo-se-${s.id}-${i}`,
            sessionId: s.id,
            exerciseId: e.exerciseId,
            orderIndex: 4 + i,
            targetSets: e.sets,
            targetReps: e.reps,
            targetWeight: e.kg,
            targetRestSeconds: 90,
            targetRir: 2,
          })),
        });
        if (r.count > 0) reforzadas += 1;
      }
    }
  }
  return { atletas: usuarios.length, eventos: creadas.count, sesionesReforzadas: reforzadas };
}
