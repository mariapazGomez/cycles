// Asigna los implementos a los ejercicios del catálogo global (createdBy null)
// a partir de src/exercises/catalog-equipment.ts. Por defecto es un ensayo: solo
// muestra qué cambiaría. Con --aplicar guarda los cambios.
//
// Nunca pisa un ejercicio que ya tiene implementos (por ejemplo, corregido a
// mano): solo completa los que están vacíos. Se puede repetir sin riesgo.
//
// Uso (desde apps/api, con DATABASE_URL de la base a actualizar en el entorno):
//   npx tsx scripts/implementos-catalogo.ts [--aplicar]
//
// Para producción, usar la URL de ~/.cycles-secretos/produccion.env sin copiarla
// a otro lugar. Solo imprime nombres de ejercicios y cantidades.
import { PrismaClient } from "@prisma/client";
import { CATALOG_EQUIPMENT } from "../src/exercises/catalog-equipment";

async function main() {
  const apply = process.argv.includes("--aplicar");
  const prisma = new PrismaClient();
  try {
    const catalog = await prisma.exercise.findMany({
      where: { createdBy: null },
      select: { id: true, name: true, equipment: true },
      orderBy: { name: "asc" },
    });

    const toFill: Array<{ id: string; name: string; equipment: NonNullable<(typeof CATALOG_EQUIPMENT)[string]> }> = [];
    const alreadySet: string[] = [];
    const noFit: string[] = [];
    const unknown: string[] = [];

    for (const exercise of catalog) {
      if (!(exercise.name in CATALOG_EQUIPMENT)) {
        unknown.push(exercise.name);
      } else if (exercise.equipment.length > 0) {
        alreadySet.push(exercise.name);
      } else if (CATALOG_EQUIPMENT[exercise.name] === null) {
        noFit.push(exercise.name);
      } else {
        toFill.push({ id: exercise.id, name: exercise.name, equipment: CATALOG_EQUIPMENT[exercise.name]! });
      }
    }

    console.log(`Ejercicios del catálogo: ${catalog.length}.`);
    for (const item of toFill) console.log(`  ${item.name}: ${item.equipment.join(", ")}`);
    console.log(`Por completar: ${toFill.length}. Ya tenían implementos: ${alreadySet.length}.`);
    if (noFit.length) console.log(`Sin implemento en la lista cerrada (quedan vacíos): ${noFit.join("; ")}.`);
    if (unknown.length) console.log(`No están en el mapa (revisar): ${unknown.join("; ")}.`);

    if (toFill.length === 0) return;
    if (!apply) {
      console.log("Ensayo: no se guardó nada. Agrega --aplicar para guardar.");
      return;
    }
    await prisma.$transaction(
      toFill.map((item) => prisma.exercise.update({ where: { id: item.id }, data: { equipment: item.equipment } })),
    );
    console.log(`Guardados: ${toFill.length}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
