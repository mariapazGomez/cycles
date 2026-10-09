// Importa un plan convertido desde Excel (JSON) a la base. Replica lo que
// hacen CyclesService.create y SessionsService.createSession, sin pasar por
// la API. Por defecto es un ensayo: hace todo dentro de una transacción y la
// revierte. Con --aplicar la confirma.
//
// Uso (desde apps/api, con DATABASE_URL en el entorno o en .env):
//   npx tsx scripts/importar-plan.ts --json plan.json --coach a@b.c --atleta x@y.z [--aplicar]
import { readFileSync } from "node:fs";
import { PrismaClient, MuscleGroup } from "@prisma/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

interface Item {
  excel: string;
  sets: number;
  reps: number;
  weightKg: number | null;
}
interface PlanJson {
  plan: { nombre: string; tipo: "mesocycle"; semanas: number; sesionesPorSemana: number; startDate: string; endDate: string; estado: "draft" | "active" };
  ejercicios: Record<string, { catalogo: string | null; crearComoPropio: boolean; grupoMuscular: string | null; nombreNuevo?: string }>;
  rutinas: Array<{ nombre: string; ejercicios: Item[] }>;
  cambiosPorSemana: Array<{ week: number; day: number; exercise: string; cambia: { weightKg?: number | null; sets?: number; reps?: number } }>;
}

class Rollback extends Error {}

async function main() {
  const file = arg("json");
  const coachEmail = arg("coach");
  const athleteEmail = arg("atleta");
  const apply = process.argv.includes("--aplicar");
  if (!file || !coachEmail || !athleteEmail) throw new Error("Faltan --json, --coach o --atleta.");
  const data: PlanJson = JSON.parse(readFileSync(file, "utf8"));
  const prisma = new PrismaClient();

  try {
    await prisma.$transaction(
      async (tx) => {
        const coach = await tx.user.findUnique({ where: { email: coachEmail } });
        const athlete = await tx.user.findUnique({ where: { email: athleteEmail } });
        if (!coach || coach.role !== "coach") throw new Error(`El coach ${coachEmail} no existe o no tiene rol coach.`);
        if (!athlete || athlete.role !== "athlete") throw new Error(`El atleta ${athleteEmail} no existe o no tiene rol atleta.`);
        const relation = await tx.coachAthlete.findUnique({ where: { coachId_athleteId: { coachId: coach.id, athleteId: athlete.id } } });
        if (!relation || relation.status !== "active") throw new Error("La relación coach–atleta no está activa.");

        const names = data.rutinas.map((r) => r.nombre);
        const dup = await tx.routine.findMany({ where: { coachId: coach.id, name: { in: names } } });
        if (dup.length) throw new Error(`Ya existen rutinas con estos nombres: ${dup.map((r) => r.name).join(", ")}. No se importa para no duplicar.`);
        const dupPlan = await tx.trainingCycle.findFirst({ where: { coachId: coach.id, athleteId: athlete.id, name: data.plan.nombre } });
        if (dupPlan) throw new Error(`Ya existe un plan "${data.plan.nombre}" para ese atleta.`);

        // Ejercicios: catálogo global, o propios del coach (se reutilizan si ya existen).
        const exerciseId = new Map<string, string>();
        const created: string[] = [];
        for (const [excelName, m] of Object.entries(data.ejercicios)) {
          const name = m.catalogo ?? (m.nombreNuevo as string);
          const found = await tx.exercise.findFirst({
            where: m.catalogo
              ? { name, createdBy: null, isActive: true }
              : { name, createdBy: coach.id, isActive: true },
          });
          if (found) {
            exerciseId.set(excelName, found.id);
          } else if (m.catalogo) {
            throw new Error(`El ejercicio "${m.catalogo}" no está en el catálogo.`);
          } else {
            const ex = await tx.exercise.create({ data: { name, muscleGroup: m.grupoMuscular as MuscleGroup, createdBy: coach.id } });
            exerciseId.set(excelName, ex.id);
            created.push(name);
          }
        }

        const routineByDay = new Map<number, { id: string; name: string; rows: Array<{ exerciseId: string; orderIndex: number; sets: number; reps: number; weight: number | null; excel: string }> }>();
        for (const [i, r] of data.rutinas.entries()) {
          const rows = r.ejercicios.map((e, idx) => ({ exerciseId: exerciseId.get(e.excel) as string, orderIndex: idx + 1, sets: e.sets, reps: e.reps, weight: e.weightKg, excel: e.excel }));
          const routine = await tx.routine.create({
            data: {
              coachId: coach.id,
              name: r.nombre,
              routineExercises: {
                create: rows.map((x) => ({ exerciseId: x.exerciseId, orderIndex: x.orderIndex, defaultSets: x.sets, defaultReps: x.reps, defaultWeight: x.weight ?? undefined })),
              },
            },
          });
          routineByDay.set(i + 1, { id: routine.id, name: routine.name, rows });
        }

        const cycle = await tx.trainingCycle.create({
          data: {
            coachId: coach.id,
            athleteId: athlete.id,
            name: data.plan.nombre,
            startDate: new Date(data.plan.startDate),
            endDate: new Date(data.plan.endDate),
            cycleType: data.plan.tipo,
            sessionsPerWeek: data.plan.sesionesPorSemana,
            status: data.plan.estado,
          },
        });

        let sessions = 0;
        let overridden = 0;
        for (let week = 1; week <= data.plan.semanas; week++) {
          for (let day = 1; day <= data.plan.sesionesPorSemana; day++) {
            const routine = routineByDay.get(day) as NonNullable<ReturnType<typeof routineByDay.get>>;
            const changes = data.cambiosPorSemana.filter((c) => c.week === week && c.day === day);
            await tx.trainingSession.create({
              data: {
                cycleId: cycle.id,
                name: routine.name,
                weekNumber: week,
                slotNumber: day,
                routineId: routine.id,
                sessionExercises: {
                  create: routine.rows.map((x) => {
                    const change = changes.find((c) => c.exercise === x.excel)?.cambia;
                    if (change) overridden++;
                    return {
                      exerciseId: x.exerciseId,
                      orderIndex: x.orderIndex,
                      targetSets: change?.sets ?? x.sets,
                      targetReps: change?.reps ?? x.reps,
                      targetWeight: change && "weightKg" in change ? change.weightKg ?? null : x.weight,
                    };
                  }),
                },
              },
            });
            sessions++;
          }
        }

        const counts = {
          rutinas: data.rutinas.length,
          ejerciciosPropiosCreados: created,
          plan: `${cycle.name} (${data.plan.estado}) ${data.plan.startDate} a ${data.plan.endDate}`,
          sesiones: sessions,
          ejerciciosConCargaDistinta: overridden,
        };
        console.log(JSON.stringify(counts, null, 1));
        if (!apply) throw new Rollback();
      },
      { timeout: 60_000 },
    );
    console.log(apply ? "APLICADO." : "");
  } catch (e) {
    if (e instanceof Rollback) console.log("ENSAYO: no se guardó nada (se revirtió).");
    else throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
