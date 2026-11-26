import type { PrismaClient, BlockType } from "@prisma/client";
import { TeamsService } from "../src/teams/teams.service";
import { TeamCyclesService } from "../src/team-cycles/team-cycles.service";
import { TeamEventsService } from "../src/team-events/team-events.service";
import { detachFromTeam } from "../src/common/team-detach";

// Equipos de la demo: dos equipos de coach.demo, cada uno con un ciclo del equipo de 4 semanas
// desde hoy (martes, jueves y viernes), una sesión «Ajustada» y dos eventos del equipo.
//
// Las copias de cada atleta, los ajustes y los eventos se crean con los MISMOS servicios de la API
// (no a mano), con las notificaciones apagadas.
//
// SOLO AGREGA y solo en cuentas de demostración: se niega si el coach, un atleta o un integrante no
// es isDemo. No borra ni cambia ciclos individuales ni contraseñas. Es repetible: lo que ya existe
// se omite. Lo usan `seed-demo-equipos.ts` (sin recargar la demo) y `seed-demo.ts`.

export const COACH_DEMO = "coach.demo@example.com";

export const EQUIPOS = [
  {
    nombre: "Grupo mañana",
    ciclo: "Bloque de potencia",
    objetivo: "Mejorar la potencia de piernas sin perder fuerza",
    atletas: ["valentina.soto@example.com", "matias.fuentes@example.com", "javiera.munoz@example.com", "diego.paredes@example.com"],
  },
  {
    nombre: "Grupo tarde",
    ciclo: "Bloque de base",
    objetivo: "Sostener fuerza y acondicionamiento durante la temporada",
    atletas: ["renata.aguirre@example.com", "tomas.villalobos@example.com", "antonia.cardenas@example.com", "sebastian.rojas@example.com"],
  },
] as const;

// Martes, jueves y viernes (0 = lunes): se ven junto al plan individual de lunes, miércoles y
// viernes, y los viernes hay una sesión de cada ciclo.
const DIAS = [1, 3, 4];
const SEMANAS = 4;
const DAY = 86_400_000;

interface Rutina {
  nombre: string;
  bloques: Array<{ nombre: string; tipo: BlockType; color?: string; ejercicios: Array<[string, number, number, number]> }>;
}

// Una por día de la semana. Cada ejercicio: [ejercicio del catálogo, series, reps, kg].
export const RUTINAS_EQUIPO: Rutina[] = [
  {
    nombre: "Equipo · Potencia",
    bloques: [
      { nombre: "Calentamiento", tipo: "warmup", ejercicios: [["Puente de glúteos", 2, 12, 0]] },
      { nombre: "Pliometría", tipo: "plyometrics", ejercicios: [["Salto de cuerda", 3, 20, 0]] },
      { nombre: "Fuerza", tipo: "strength", ejercicios: [["Sentadilla con barra", 4, 5, 55], ["Zancadas con mancuernas", 3, 8, 14]] },
    ],
  },
  {
    nombre: "Equipo · Fuerza general",
    bloques: [
      { nombre: "Calentamiento", tipo: "warmup", ejercicios: [["Pájaros con mancuernas", 2, 15, 4]] },
      { nombre: "Fuerza", tipo: "strength", ejercicios: [["Press de banca con barra", 4, 6, 40], ["Remo con barra", 3, 8, 35], ["Dominadas", 3, 6, 0]] },
    ],
  },
  {
    nombre: "Equipo · Core y acondicionamiento",
    bloques: [
      { nombre: "Calentamiento", tipo: "warmup", ejercicios: [["Hiperextensión lumbar", 2, 12, 0]] },
      { nombre: "Core", tipo: "custom", color: "#8a63d2", ejercicios: [["Plancha abdominal", 3, 30, 0]] },
      { nombre: "Cardio", tipo: "cardio", ejercicios: [["Remo en ergómetro", 3, 10, 0]] },
    ],
  },
];

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const at = (day: string) => Date.parse(`${day}T00:00:00Z`);
// 0 = lunes … 6 = domingo.
const weekday = (day: string) => (new Date(at(day)).getUTCDay() + 6) % 7;

// El día de hoy en Chile: es el «hoy» del coach de la demo.
export const hoyEnChile = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(now);

// Las fechas del plan entre dos días (incluidos), desde `desde`.
export function fechasDelPlan(inicio: string, fin: string, desde: string): Array<{ date: string; rutina: number }> {
  const out: Array<{ date: string; rutina: number }> = [];
  for (let t = Math.max(at(inicio), at(desde)); t <= at(fin); t += DAY) {
    const index = DIAS.indexOf(weekday(iso(t)));
    if (index >= 0) out.push({ date: iso(t), rutina: index });
  }
  return out;
}

// El primer `dia` de la semana desde `desde` + `semanas`.
const proximoDia = (desde: string, dia: number, semanas: number) => iso(at(desde) + (((dia - weekday(desde) + 7) % 7) + semanas * 7) * DAY);

export interface EstadoAtleta {
  email: string;
  existe: boolean;
  // Fin del ciclo individual activo más reciente (AAAA-MM-DD), o null si no tiene.
  individualHasta: string | null;
}

export interface RevisionEquipos {
  hoy: string;
  atletas: EstadoAtleta[];
  equipos: Array<{ nombre: string; existe: boolean; cicloVigente: string | null; eventos: number }>;
  rutinasQueFaltan: string[];
}

// Solo lee. Se niega si alguna cuenta o equipo que se tocaría no es de demostración.
export async function revisarEquiposDemo(prisma: PrismaClient, hoy = hoyEnChile()): Promise<RevisionEquipos> {
  const coach = await prisma.user.findUnique({ where: { email: COACH_DEMO } });
  if (!coach || !coach.isDemo || coach.role !== "coach") throw new Error(`No existe el coach de demostración ${COACH_DEMO} (isDemo).`);

  const atletas: EstadoAtleta[] = [];
  for (const email of EQUIPOS.flatMap((e) => e.atletas)) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && (!user.isDemo || user.role !== "athlete")) throw new Error(`${email} existe y no es un atleta de demostración: no se toca nada.`);
    const individual = user
      ? await prisma.trainingCycle.findFirst({
          where: { athleteId: user.id, coachId: coach.id, status: "active", teamCycleId: null, isTemplate: false, cycleType: { not: "macrocycle" } },
          orderBy: { endDate: "desc" },
        })
      : null;
    atletas.push({ email, existe: Boolean(user), individualHasta: individual ? individual.endDate.toISOString().slice(0, 10) : null });
  }

  const equipos: RevisionEquipos["equipos"] = [];
  for (const e of EQUIPOS) {
    const team = await prisma.team.findFirst({ where: { coachId: coach.id, name: e.nombre }, include: { members: { include: { athlete: true } }, events: true } });
    if (team?.members.some((m) => !m.athlete.isDemo)) throw new Error(`El equipo «${e.nombre}» tiene integrantes que no son de demostración: no se toca nada.`);
    const cycle = team ? await prisma.teamCycle.findFirst({ where: { teamId: team.id, name: e.ciclo, status: "active", endDate: { gte: new Date(at(hoy)) } } }) : null;
    equipos.push({ nombre: e.nombre, existe: Boolean(team), cicloVigente: cycle ? cycle.endDate.toISOString().slice(0, 10) : null, eventos: team?.events.length ?? 0 });
  }

  const rutinas = await prisma.routine.findMany({ where: { coachId: coach.id, name: { in: RUTINAS_EQUIPO.map((r) => r.nombre) } }, select: { name: true } });
  return { hoy, atletas, equipos, rutinasQueFaltan: RUTINAS_EQUIPO.map((r) => r.nombre).filter((n) => !rutinas.some((r) => r.name === n)) };
}

export interface OpcionesEquipos {
  hoy?: string;
  // Para crear a los atletas que falten, con la misma contraseña de la demo.
  crearAtleta?: (email: string, coachId: string) => Promise<void>;
}

export async function cargarEquiposDemo(prisma: PrismaClient, opciones: OpcionesEquipos = {}) {
  const hoy = opciones.hoy ?? hoyEnChile();
  const revision = await revisarEquiposDemo(prisma, hoy);
  const coach = await prisma.user.findUniqueOrThrow({ where: { email: COACH_DEMO } });

  // Sin avisos: la campana de la demo no se llena y no sale ningún correo.
  const silencio = { coachEditedSession: () => undefined, syncRmMissing: () => undefined };
  const teamCycles = new TeamCyclesService(prisma as never, silencio as never);
  const teams = new TeamsService(prisma as never, teamCycles);
  const events = new TeamEventsService(prisma as never, undefined as never);

  const faltan = revision.atletas.filter((a) => !a.existe);
  if (faltan.length > 0 && !opciones.crearAtleta) throw new Error(`Faltan atletas de la demo (${faltan.map((a) => a.email).join(", ")}): define DEMO_PASSWORD para crearlos.`);
  for (const a of faltan) await opciones.crearAtleta!(a.email, coach.id);

  const catalog = await prisma.exercise.findMany({ where: { createdBy: null } });
  const exerciseId = (name: string) => {
    const found = catalog.find((e) => e.name === name);
    if (!found) throw new Error(`Falta "${name}" en el catálogo: corre primero prisma db seed.`);
    return found.id;
  };

  const routineIds: string[] = [];
  for (const r of RUTINAS_EQUIPO) {
    const existing = await prisma.routine.findFirst({ where: { coachId: coach.id, name: r.nombre } });
    if (existing) {
      routineIds.push(existing.id);
      continue;
    }
    routineIds.push(
      await prisma.$transaction(async (tx) => {
        const routine = await tx.routine.create({ data: { coachId: coach.id, name: r.nombre } });
        let order = 0;
        for (const [blockOrder, b] of r.bloques.entries()) {
          const block = await tx.routineBlock.create({ data: { routineId: routine.id, name: b.nombre, type: b.tipo, color: b.color ?? null, orderIndex: blockOrder } });
          for (const [name, sets, reps, kg] of b.ejercicios) {
            await tx.routineExercise.create({
              data: { routineId: routine.id, exerciseId: exerciseId(name), orderIndex: order++, defaultSets: sets, defaultReps: reps, defaultWeight: kg || null, defaultRestSeconds: 90, defaultRir: 2, blockId: block.id },
            });
          }
        }
        return routine.id;
      }, { timeout: 60_000, maxWait: 30_000 }),
    );
  }

  const resumen = { equiposNuevos: 0, ciclosNuevos: 0, sesionesNuevas: 0, ajustadas: 0, eventosNuevos: 0, atletasNuevos: faltan.length };

  for (const e of EQUIPOS) {
    const users = await prisma.user.findMany({ where: { email: { in: [...e.atletas] }, isDemo: true }, select: { id: true } });
    const athleteIds = users.map((u) => u.id);

    let team = await prisma.team.findFirst({ where: { coachId: coach.id, name: e.nombre } });
    if (!team) {
      const created = await teams.create(coach.id, e.nombre, athleteIds);
      team = await prisma.team.findUniqueOrThrow({ where: { id: created.id } });
      resumen.equiposNuevos += 1;
    } else {
      await teams.addMembers(coach.id, team.id, athleteIds);
    }

    let cycle = await prisma.teamCycle.findFirst({ where: { teamId: team.id, name: e.ciclo, status: "active", endDate: { gte: new Date(at(hoy)) } } });
    if (!cycle) {
      const created = await teamCycles.create(coach.id, team.id, {
        name: e.ciclo,
        objective: e.objetivo,
        startDate: hoy,
        endDate: iso(at(hoy) + (SEMANAS * 7 - 1) * DAY),
        athleteIds,
        today: hoy,
      });
      cycle = await prisma.teamCycle.findUniqueOrThrow({ where: { id: created.id } });
      resumen.ciclosNuevos += 1;
    } else {
      const have = await prisma.trainingCycle.findMany({ where: { teamCycleId: cycle.id }, select: { athleteId: true } });
      const missing = athleteIds.filter((id) => !have.some((h) => h.athleteId === id));
      if (missing.length > 0) await teamCycles.join(coach.id, cycle.id, missing, hoy);
    }

    const start = cycle.startDate.toISOString().slice(0, 10);
    const end = cycle.endDate.toISOString().slice(0, 10);
    for (const plan of fechasDelPlan(start, end, hoy)) {
      const name = RUTINAS_EQUIPO[plan.rutina].nombre;
      if (await prisma.teamSession.findFirst({ where: { teamCycleId: cycle.id, name, scheduledDate: new Date(at(plan.date)) } })) continue;
      await teamCycles.addSession(coach.id, cycle.id, { routineId: routineIds[plan.rutina], scheduledDate: plan.date, today: hoy });
      resumen.sesionesNuevas += 1;
    }

    // Una sesión «Ajustada»: a una persona se le baja el peso de un ejercicio en una sesión futura,
    // y se separa del equipo con la misma función que usa la API al editarla.
    const yaAjustada = await prisma.trainingSession.count({ where: { teamSession: { teamCycleId: cycle.id }, detachedAt: { not: null } } });
    if (yaAjustada === 0) {
      const copy = await prisma.trainingSession.findFirst({
        where: { teamSession: { teamCycleId: cycle.id }, status: "pending", deletedAt: null, scheduledDate: { gt: new Date(at(hoy)) }, sessionExercises: { some: { targetWeight: { gt: 5 } } } },
        orderBy: [{ scheduledDate: "asc" }, { cycle: { athlete: { email: "asc" } } }],
        include: { sessionExercises: { where: { targetWeight: { gt: 5 } }, orderBy: { orderIndex: "asc" }, take: 1 } },
      });
      const exercise = copy?.sessionExercises[0];
      if (copy && exercise) {
        await prisma.sessionExercise.update({ where: { id: exercise.id }, data: { targetWeight: Number(exercise.targetWeight) - 5 } });
        await detachFromTeam(prisma as never, [copy.id]);
        resumen.ajustadas += 1;
      }
    }

    // Un partido el sábado de la semana siguiente y un viaje o evaluación más adelante.
    const eventos = [
      { type: "match", title: "Partido amistoso", date: proximoDia(hoy, 5, 1), startTime: "11:00", durationMin: 120, notes: "Llegar 30 minutos antes." },
      { type: "other", title: "Jornada de evaluación", date: proximoDia(hoy, 2, 2), startTime: "18:00", durationMin: 90, notes: "Trae zapatillas de entrenamiento." },
    ];
    for (const event of eventos) {
      if (await prisma.teamEvent.findFirst({ where: { teamId: team.id, title: event.title, date: { gte: new Date(at(hoy)) } } })) continue;
      await events.create(coach.id, team.id, event);
      resumen.eventosNuevos += 1;
    }
  }

  return resumen;
}
