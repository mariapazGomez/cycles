import { PrismaClient, MuscleGroup } from "@prisma/client";

const prisma = new PrismaClient();

// Catálogo global curado a mano (createdBy: null), nombres en español
// revisados uno por uno — no es una traducción automática de un dataset
// externo. Ver docs/prds/features/PRD-CatalogoEjercicios.md.
const EXERCISES: Array<{ name: string; muscleGroup: MuscleGroup }> = [
  // Pecho
  { name: "Press de banca con barra", muscleGroup: "chest" },
  { name: "Press de banca con mancuernas", muscleGroup: "chest" },
  { name: "Press inclinado con mancuernas", muscleGroup: "chest" },
  { name: "Aperturas con mancuernas", muscleGroup: "chest" },
  { name: "Fondos en paralelas", muscleGroup: "chest" },
  { name: "Cruce de poleas", muscleGroup: "chest" },
  // Espalda
  { name: "Dominadas", muscleGroup: "back" },
  { name: "Remo con barra", muscleGroup: "back" },
  { name: "Remo con mancuerna a un brazo", muscleGroup: "back" },
  { name: "Jalón al pecho", muscleGroup: "back" },
  { name: "Remo sentado en polea", muscleGroup: "back" },
  { name: "Peso muerto", muscleGroup: "back" },
  { name: "Hiperextensión lumbar", muscleGroup: "back" },
  { name: "Remo en máquina", muscleGroup: "back" },
  // Piernas
  { name: "Sentadilla con barra", muscleGroup: "legs" },
  { name: "Sentadilla búlgara", muscleGroup: "legs" },
  { name: "Sentadilla goblet", muscleGroup: "legs" },
  { name: "Prensa de piernas", muscleGroup: "legs" },
  { name: "Zancadas con mancuernas", muscleGroup: "legs" },
  { name: "Extensión de cuádriceps", muscleGroup: "legs" },
  { name: "Curl femoral tumbado", muscleGroup: "legs" },
  { name: "Elevación de talones de pie", muscleGroup: "legs" },
  { name: "Peso muerto rumano", muscleGroup: "legs" },
  // Glúteos
  { name: "Empuje de cadera con barra", muscleGroup: "glutes" },
  { name: "Puente de glúteos", muscleGroup: "glutes" },
  { name: "Patada de glúteo en polea", muscleGroup: "glutes" },
  // Hombros
  { name: "Press militar con barra", muscleGroup: "shoulders" },
  { name: "Press militar con mancuernas", muscleGroup: "shoulders" },
  { name: "Elevaciones laterales con mancuernas", muscleGroup: "shoulders" },
  { name: "Elevaciones frontales con mancuernas", muscleGroup: "shoulders" },
  { name: "Pájaros con mancuernas", muscleGroup: "shoulders" },
  { name: "Encogimientos de hombros con barra", muscleGroup: "shoulders" },
  // Brazos
  { name: "Curl de bíceps con barra", muscleGroup: "arms" },
  { name: "Curl de bíceps con mancuernas", muscleGroup: "arms" },
  { name: "Curl martillo", muscleGroup: "arms" },
  { name: "Curl en banco Scott", muscleGroup: "arms" },
  { name: "Press francés", muscleGroup: "arms" },
  { name: "Extensión de tríceps en polea", muscleGroup: "arms" },
  { name: "Fondos de tríceps en banco", muscleGroup: "arms" },
  { name: "Curl de muñeca con barra", muscleGroup: "arms" },
  // Core
  { name: "Plancha abdominal", muscleGroup: "core" },
  { name: "Crunch abdominal", muscleGroup: "core" },
  { name: "Elevación de piernas colgado", muscleGroup: "core" },
  { name: "Giro ruso", muscleGroup: "core" },
  { name: "Rueda abdominal", muscleGroup: "core" },
  { name: "Encogimiento abdominal en polea", muscleGroup: "core" },
  // Cardio
  { name: "Salto de cuerda", muscleGroup: "cardio" },
  { name: "Burpees", muscleGroup: "cardio" },
  { name: "Escalador", muscleGroup: "cardio" },
  { name: "Remo en ergómetro", muscleGroup: "cardio" },
  { name: "Sprint en cinta", muscleGroup: "cardio" },
  // Otros
  { name: "Peso muerto sumo", muscleGroup: "other" },
  { name: "Balanceo con pesa rusa", muscleGroup: "other" },
  { name: "Levantamiento turco", muscleGroup: "other" },
];

async function main() {
  let created = 0;
  for (const exercise of EXERCISES) {
    const existing = await prisma.exercise.findFirst({
      where: { name: exercise.name, createdBy: null },
    });
    if (existing) continue;
    await prisma.exercise.create({ data: { ...exercise, createdBy: null } });
    created++;
  }
  console.log(`Seed de ejercicios: ${created} creados, ${EXERCISES.length - created} ya existían.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
