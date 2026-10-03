// Datos de demostración para capturas de pantalla (landing, presentaciones).
// Crea un coach ficticio con 8 atletas ficticios, un plan de 6 semanas por
// atleta y la ejecución de las semanas 1–4, con casos que activan cada tipo de
// alerta de "Necesitan atención": dolor, carga alta, carga baja y poca adherencia.
//
// Solo para una base de demostración, NUNCA la de desarrollo ni la de producción:
//   createdb cycles_demo
//   DATABASE_URL=postgresql://USUARIO@localhost:5432/cycles_demo npx prisma migrate deploy
//   DATABASE_URL=... npx prisma db seed            (catálogo de ejercicios)
//   DATABASE_URL=... DEMO_PASSWORD=<la que elijas> npx tsx scripts/seed-demo.ts
//
// Cuenta del coach de demostración (ficticia, solo existe en esa base):
//   email: coach.demo@example.com · contraseña: la que pases en DEMO_PASSWORD
//   (no se escribe en el repo, que es público).
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "";
const DAY = 24 * 60 * 60 * 1000;

const prisma = new PrismaClient();

// Lunes 00:00 UTC de la semana actual.
function mondayUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
}

const ATHLETES = [
  { name: "Valentina Soto", email: "valentina.soto@example.com", scenario: "steady" },
  { name: "Matías Fuentes", email: "matias.fuentes@example.com", scenario: "high_load" },
  { name: "Javiera Muñoz", email: "javiera.munoz@example.com", scenario: "pain" },
  { name: "Diego Paredes", email: "diego.paredes@example.com", scenario: "low_adherence" },
  { name: "Renata Aguirre", email: "renata.aguirre@example.com", scenario: "low_load" },
  { name: "Tomás Villalobos", email: "tomas.villalobos@example.com", scenario: "steady" },
  { name: "Antonia Cárdenas", email: "antonia.cardenas@example.com", scenario: "steady" },
  { name: "Sebastián Rojas", email: "sebastian.rojas@example.com", scenario: "steady" },
] as const;
type Scenario = (typeof ATHLETES)[number]["scenario"];

// Tres rutinas, una por sesión de la semana. [ejercicio del catálogo, series, reps, kg base]
const ROUTINES: Array<{ name: string; items: Array<[string, number, number, number]> }> = [
  {
    name: "Piernas",
    items: [
      ["Sentadilla con barra", 4, 6, 70],
      ["Prensa de piernas", 3, 10, 120],
      ["Zancadas con mancuernas", 3, 10, 16],
      ["Peso muerto", 3, 5, 80],
    ],
  },
  {
    name: "Empuje",
    items: [
      ["Press de banca con barra", 4, 6, 50],
      ["Press inclinado con mancuernas", 3, 10, 18],
      ["Aperturas con mancuernas", 3, 12, 10],
      ["Fondos en paralelas", 3, 8, 0],
    ],
  },
  {
    name: "Tirón",
    items: [
      ["Dominadas", 4, 6, 0],
      ["Remo con barra", 3, 8, 45],
      ["Jalón al pecho", 3, 10, 40],
      ["Remo sentado en polea", 3, 12, 35],
    ],
  },
];

const TARGET_RIR = 2;
const WEEKS = 6;
const CURRENT_WEEK = 4; // el plan empezó hace 3 semanas
const SESSION_DAY_OFFSETS = [0, 2, 4]; // lunes, miércoles, viernes

type Outcome = "completed" | "skipped" | "pending";

// Qué pasa en cada sesión según el escenario del atleta.
function plan(scenario: Scenario, week: number, slot: number): { outcome: Outcome; rir: (exercise: string) => number; pain?: string; note?: string } {
  const onTarget = () => TARGET_RIR;
  const base = { outcome: "completed" as Outcome, rir: onTarget };
  if (week > CURRENT_WEEK) return { ...base, outcome: "pending" };
  if (week === CURRENT_WEEK && slot === 3) return { ...base, outcome: scenario === "steady" && slot === 3 ? "completed" : "pending" };

  switch (scenario) {
    case "high_load":
      // Sentadilla con barra al límite en las dos últimas sesiones de piernas.
      return week >= 3 && slot === 1 ? { ...base, rir: (e) => (e === "Sentadilla con barra" ? 0 : TARGET_RIR) } : base;
    case "low_load":
      // Press de banca con mucho margen en las dos últimas sesiones de empuje.
      return week >= 3 && slot === 2 ? { ...base, rir: (e) => (e === "Press de banca con barra" ? 4 : TARGET_RIR) } : base;
    case "pain":
      return week === CURRENT_WEEK && slot === 1
        ? { ...base, pain: "Molestia en la rodilla izquierda al bajar", note: "Bajé la carga en las últimas series." }
        : base;
    case "low_adherence":
      if (week === 3 && slot === 3) return { ...base, outcome: "pending" };
      if (week === CURRENT_WEEK && slot === 1) return { ...base, outcome: "skipped", note: "Viaje de trabajo." };
      if (week === CURRENT_WEEK && slot === 2) return { ...base, outcome: "skipped", note: "Salí tarde y llegué sin energía." };
      return base;
    default:
      return base;
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/cycles_demo/.test(url)) {
    throw new Error("Este script solo corre contra una base llamada cycles_demo. Revisa DATABASE_URL.");
  }

  if (DEMO_PASSWORD.length < 12) {
    throw new Error("Define DEMO_PASSWORD (12 caracteres o más) para la cuenta del coach de demostración.");
  }

  const now = new Date();
  const startDate = new Date(mondayUtc(now).getTime() - 3 * 7 * DAY);
  const endDate = new Date(startDate.getTime() + WEEKS * 7 * DAY - DAY);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const consent = { dataConsentAt: now, dataConsentVersion: "demo", emailVerifiedAt: now };

  const coach = await prisma.user.upsert({
    where: { email: "coach.demo@example.com" },
    update: {},
    create: { email: "coach.demo@example.com", name: "Camila Reyes", passwordHash, role: "coach", ...consent },
  });

  const catalog = await prisma.exercise.findMany({ where: { createdBy: null } });
  const exerciseId = (name: string) => {
    const found = catalog.find((e) => e.name === name);
    if (!found) throw new Error(`Falta "${name}" en el catálogo: corre primero prisma db seed.`);
    return found.id;
  };

  const routines = [];
  for (const r of ROUTINES) {
    routines.push(
      await prisma.routine.create({
        data: {
          coachId: coach.id,
          name: r.name,
          routineExercises: {
            create: r.items.map(([name, sets, reps, kg], i) => ({
              exerciseId: exerciseId(name),
              orderIndex: i,
              defaultSets: sets,
              defaultReps: reps,
              defaultWeight: kg || null,
              defaultRestSeconds: 90,
              defaultRir: TARGET_RIR,
            })),
          },
        },
      }),
    );
  }

  for (const [index, a] of ATHLETES.entries()) {
    const athlete = await prisma.user.create({
      data: { email: a.email, name: a.name, passwordHash, role: "athlete", ...consent },
    });
    await prisma.coachAthlete.create({ data: { coachId: coach.id, athleteId: athlete.id, status: "active" } });
    const cycle = await prisma.trainingCycle.create({
      data: {
        coachId: coach.id,
        athleteId: athlete.id,
        name: "Fuerza base",
        objective: "Construir fuerza en los tres levantamientos principales",
        startDate,
        endDate,
        status: "active",
        cycleType: "mesocycle",
        sessionsPerWeek: 3,
      },
    });

    for (let week = 1; week <= WEEKS; week++) {
      for (let slot = 1; slot <= 3; slot++) {
        const routine = ROUTINES[slot - 1];
        const outcome = plan(a.scenario, week, slot);
        const day = new Date(startDate.getTime() + ((week - 1) * 7 + SESSION_DAY_OFFSETS[slot - 1]) * DAY);
        day.setUTCHours(21, 30, 0, 0); // 18:30 en Chile
        const session = await prisma.trainingSession.create({
          data: {
            cycleId: cycle.id,
            name: routine.name,
            weekNumber: week,
            slotNumber: slot,
            routineId: routines[slot - 1].id,
            status: outcome.outcome,
            startedAt: outcome.outcome === "completed" ? new Date(day.getTime() - 62 * 60 * 1000) : null,
          },
        });

        const sessionExercises = [];
        for (const [i, [name, sets, reps, kg]] of routine.items.entries()) {
          // Progresión suave semana a semana y pequeñas diferencias entre atletas.
          const weight = kg ? Math.round((kg * (0.8 + index * 0.04) + (week - 1) * 2.5) * 2) / 2 : null;
          sessionExercises.push(
            await prisma.sessionExercise.create({
              data: {
                sessionId: session.id,
                exerciseId: exerciseId(name),
                orderIndex: i,
                targetSets: sets,
                targetReps: reps,
                targetWeight: weight,
                targetRestSeconds: 90,
                targetRir: TARGET_RIR,
              },
            }),
          );
        }

        if (outcome.outcome === "pending") continue;

        if (outcome.outcome === "completed") {
          for (const [i, se] of sessionExercises.entries()) {
            const rir = Math.min(4, outcome.rir(routine.items[i][0]));
            for (let set = 1; set <= se.targetSets; set++) {
              await prisma.exerciseLog.create({
                data: {
                  sessionExerciseId: se.id,
                  athleteId: athlete.id,
                  setNumber: set,
                  actualReps: se.targetReps,
                  actualWeight: se.targetWeight,
                  rir: set === se.targetSets ? rir : null,
                  loggedAt: day,
                },
              });
            }
          }
        }

        await prisma.sessionFeedback.create({
          data: {
            sessionId: session.id,
            athleteId: athlete.id,
            outcome: outcome.outcome,
            srpe: outcome.outcome === "completed" ? 6 + ((week + slot + index) % 3) : null,
            durationMinutes: outcome.outcome === "completed" ? 55 + ((week * 3 + slot * 5 + index) % 15) : null,
            pain: Boolean(outcome.pain),
            painNotes: outcome.pain ?? null,
            notes: outcome.note ?? null,
            submittedAt: day,
          },
        });
      }
    }
  }

  console.log(`Demo lista: 1 coach, ${ATHLETES.length} atletas, ${ATHLETES.length} planes.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
