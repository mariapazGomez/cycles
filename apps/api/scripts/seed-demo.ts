// Datos de demostración (capturas, presentaciones y demos en vivo). Crea un
// coach ficticio con 8 atletas ficticios, un plan de 6 semanas por atleta y la
// ejecución de las semanas 1–4, con casos que activan cada tipo de alerta de
// "Necesitan atención": dolor, carga alta, carga baja y poca adherencia.
//
// Todas las cuentas llevan isDemo = true: las métricas y los resúmenes las ignoran.
//
// Dos modos, según la base:
//  · Local (nombre de base con "cycles_demo"): ver docs/MANUAL-DEMOS.md.
//      DATABASE_URL=... DEMO_PASSWORD=<la que elijas> npx tsx scripts/seed-demo.ts
//  · Producción (demo en vivo): comparte la base real, así que exige confirmarlo y
//    SOLO toca cuentas de demostración. Reinicia la demo (borra la anterior y la
//    recrea con las fechas de esta semana):
//      DATABASE_URL=<producción> DEMO_EN_PRODUCCION=si DEMO_PASSWORD=<la de la demo> npx tsx scripts/seed-demo.ts
//
// Cuenta del coach: coach.demo@example.com · contraseña: la que pases en
// DEMO_PASSWORD (no se escribe en el repo, que es público).
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { policyAcceptanceData } from "../src/common/policy";
import { cargarEventosDemo } from "./demo-eventos";

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

// Tres rutinas, una por sesión de la semana, agrupadas en bloques de trabajo (CYC-271).
// Cada ejercicio: [ejercicio del catálogo, series, reps, kg base, bloque].
type BlockKey = "calentamiento" | "pliometria" | "fuerza" | "core" | "cardio";
interface DemoBlock {
  key: BlockKey;
  name: string;
  type: "warmup" | "plyometrics" | "strength" | "custom" | "cardio";
  color?: string;
  note?: string;
}
const ROUTINES: Array<{ name: string; blocks: DemoBlock[]; items: Array<[string, number, number, number, BlockKey]> }> = [
  {
    name: "Piernas",
    blocks: [
      { key: "calentamiento", name: "Calentamiento", type: "warmup", note: "Sin prisa, activa los glúteos antes de cargar." },
      { key: "pliometria", name: "Pliometría", type: "plyometrics" },
      { key: "fuerza", name: "Fuerza", type: "strength" },
    ],
    items: [
      ["Puente de glúteos", 2, 12, 0, "calentamiento"],
      ["Salto de cuerda", 3, 20, 0, "pliometria"],
      ["Sentadilla con barra", 4, 6, 70, "fuerza"],
      ["Prensa de piernas", 3, 10, 120, "fuerza"],
      ["Zancadas con mancuernas", 3, 10, 16, "fuerza"],
      ["Peso muerto", 3, 5, 80, "fuerza"],
    ],
  },
  {
    name: "Empuje",
    blocks: [
      { key: "calentamiento", name: "Calentamiento", type: "warmup" },
      { key: "fuerza", name: "Fuerza", type: "strength" },
      { key: "core", name: "Core", type: "custom", color: "#8a63d2" },
    ],
    items: [
      ["Pájaros con mancuernas", 2, 15, 4, "calentamiento"],
      ["Press de banca con barra", 4, 6, 50, "fuerza"],
      ["Press inclinado con mancuernas", 3, 10, 18, "fuerza"],
      ["Aperturas con mancuernas", 3, 12, 10, "fuerza"],
      ["Fondos en paralelas", 3, 8, 0, "fuerza"],
      ["Plancha abdominal", 3, 30, 0, "core"],
    ],
  },
  {
    name: "Tirón",
    blocks: [
      { key: "calentamiento", name: "Calentamiento", type: "warmup" },
      { key: "fuerza", name: "Fuerza", type: "strength" },
      { key: "cardio", name: "Cardio", type: "cardio" },
    ],
    items: [
      ["Hiperextensión lumbar", 2, 12, 0, "calentamiento"],
      ["Dominadas", 4, 6, 0, "fuerza"],
      ["Remo con barra", 3, 8, 45, "fuerza"],
      ["Jalón al pecho", 3, 10, 40, "fuerza"],
      ["Remo sentado en polea", 3, 12, 35, "fuerza"],
      ["Remo en ergómetro", 1, 10, 0, "cardio"],
    ],
  },
];

// Las sesiones de las primeras semanas se ven como las de antes de los bloques (lista
// sin encabezados); desde esta semana copian los bloques de su rutina.
const FIRST_WEEK_WITH_BLOCKS = 3;

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

// Borra solo lo que pertenece a cuentas isDemo = true, en orden de dependencias.
async function borrarDemo() {
  // También las sembradas antes de existir la etiqueta isDemo.
  const demo = await prisma.user.findMany({
    where: { OR: [{ isDemo: true }, { dataConsentVersion: "demo", email: { endsWith: "@example.com" } }] },
    select: { id: true },
  });
  const ids = demo.map((u) => u.id);
  if (ids.length === 0) return;
  const ciclos = { OR: [{ coachId: { in: ids } }, { athleteId: { in: ids } }] };
  const sesiones = { cycle: ciclos };

  await prisma.$transaction(async (tx) => {
    // Los registros históricos no se borran salvo con esta excepción, que vale solo
    // dentro de esta transacción (docs/SEGURIDAD.md, S-12).
    await tx.$executeRaw`SELECT set_config('cycles.allow_purge', 'on', true)`;
    // Correcciones que apuntan a otro registro: primero se sueltan.
    await tx.exerciseLog.updateMany({ where: { athleteId: { in: ids } }, data: { supersedesId: null } });
    await tx.sessionFeedback.updateMany({ where: { athleteId: { in: ids } }, data: { supersedesId: null } });
    await tx.exerciseLog.deleteMany({ where: { athleteId: { in: ids } } });
    await tx.sessionFeedback.deleteMany({ where: { athleteId: { in: ids } } });
    await tx.loadAdjustment.deleteMany({ where: { OR: [{ coachId: { in: ids } }, { cycle: ciclos }] } });
    await tx.sessionExercise.deleteMany({ where: { session: sesiones } });
    await tx.sessionBlock.deleteMany({ where: { session: sesiones } });
    await tx.trainingSession.deleteMany({ where: sesiones });
    await tx.trainingCycle.deleteMany({ where: ciclos });
    await tx.routineExercise.deleteMany({ where: { routine: { coachId: { in: ids } } } });
    await tx.routineBlock.deleteMany({ where: { routine: { coachId: { in: ids } } } });
    await tx.routine.deleteMany({ where: { coachId: { in: ids } } });
    await tx.athleteInvitationToken.deleteMany({
      where: { coachAthlete: { OR: [{ coachId: { in: ids } }, { athleteId: { in: ids } }] } },
    });
    await tx.coachAthlete.deleteMany({ where: { OR: [{ coachId: { in: ids } }, { athleteId: { in: ids } }] } });
    await tx.exercise.deleteMany({ where: { createdBy: { in: ids } } });
    const propios = { userId: { in: ids } };
    await tx.refreshToken.deleteMany({ where: propios });
    await tx.passwordResetToken.deleteMany({ where: propios });
    await tx.emailVerificationToken.deleteMany({ where: propios });
    await tx.oAuthExchangeCode.deleteMany({ where: propios });
    await tx.userIdentity.deleteMany({ where: propios });
    await tx.user.deleteMany({ where: { id: { in: ids } } });
    // Contra una base remota cada consulta viaja por red: el límite de 5 s no alcanza.
  }, { timeout: 120_000, maxWait: 30_000 });
  console.log(`Demo anterior borrada: ${ids.length} cuentas.`);
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const enProduccion = process.env.DEMO_EN_PRODUCCION === "si";
  if (!enProduccion && !/cycles_demo/.test(url)) {
    throw new Error(
      "Este script solo corre contra una base llamada cycles_demo. Para la demo en producción define DEMO_EN_PRODUCCION=si.",
    );
  }

  if (DEMO_PASSWORD.length < 12) {
    throw new Error("Define DEMO_PASSWORD (12 caracteres o más) para la cuenta del coach de demostración.");
  }

  if (enProduccion) await borrarDemo();

  const now = new Date();
  const startDate = new Date(mondayUtc(now).getTime() - 3 * 7 * DAY);
  const endDate = new Date(startDate.getTime() + WEEKS * 7 * DAY - DAY);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const consent = {
    dataConsentAt: now,
    dataConsentVersion: "demo",
    emailVerifiedAt: now,
    isDemo: true,
    policyAcceptances: { create: policyAcceptanceData("register") },
  };

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

  const routines: Array<{ id: string }> = [];
  for (const r of ROUTINES) {
    const routine = await prisma.routine.create({ data: { coachId: coach.id, name: r.name } });
    const blockIds = new Map<BlockKey, string>();
    for (const [orderIndex, b] of r.blocks.entries()) {
      const block = await prisma.routineBlock.create({
        data: { routineId: routine.id, name: b.name, type: b.type, color: b.color ?? null, orderIndex, note: b.note ?? null },
      });
      blockIds.set(b.key, block.id);
    }
    await prisma.routineExercise.createMany({
      data: r.items.map(([name, sets, reps, kg, block], i) => ({
        routineId: routine.id,
        exerciseId: exerciseId(name),
        orderIndex: i,
        defaultSets: sets,
        defaultReps: reps,
        defaultWeight: kg || null,
        defaultRestSeconds: 90,
        defaultRir: TARGET_RIR,
        blockId: blockIds.get(block),
      })),
    });
    routines.push(routine);
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
        // La sesión lleva su fecha (a medianoche UTC, como las que fija la web) para que
        // el calendario no la marque como «día tentativo».
        const scheduledDate = new Date(day);
        day.setUTCHours(21, 30, 0, 0); // 18:30 en Chile
        const session = await prisma.trainingSession.create({
          data: {
            cycleId: cycle.id,
            name: routine.name,
            weekNumber: week,
            slotNumber: slot,
            routineId: routines[slot - 1].id,
            scheduledDate,
            status: outcome.outcome,
            startedAt: outcome.outcome === "completed" ? new Date(day.getTime() - 62 * 60 * 1000) : null,
          },
        });

        const sessionBlockIds = new Map<BlockKey, string>();
        if (week >= FIRST_WEEK_WITH_BLOCKS) {
          for (const [orderIndex, b] of routine.blocks.entries()) {
            const block = await prisma.sessionBlock.create({
              data: { sessionId: session.id, name: b.name, type: b.type, color: b.color ?? null, orderIndex, note: b.note ?? null },
            });
            sessionBlockIds.set(b.key, block.id);
          }
        }

        const sessionExercises = [];
        for (const [i, [name, sets, reps, kg, block]] of routine.items.entries()) {
          // Progresión suave semana a semana y pequeñas diferencias entre atletas.
          const weight = kg ? Math.round((kg * (0.8 + index * 0.04) + (week - 1) * 2.5) * 2) / 2 : null;
          sessionExercises.push(
            await prisma.sessionExercise.create({
              data: {
                sessionId: session.id,
                exerciseId: exerciseId(name),
                orderIndex: i,
                blockId: sessionBlockIds.get(block) ?? null,
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

  // Deporte, actividades paralelas y campeonatos de cada atleta (CYC-273).
  await cargarEventosDemo(prisma);

  console.log(`Demo lista: 1 coach, ${ATHLETES.length} atletas, ${ATHLETES.length} planes.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
