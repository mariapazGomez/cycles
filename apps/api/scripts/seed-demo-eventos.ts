// Carga las actividades paralelas y los campeonatos de los atletas de la demo (CYC-273) SIN recargar la
// demo. Solo inserta y solo en cuentas de demostración (isDemo = true, @example.com); es idempotente:
// correrlo otra vez no duplica nada. Las fechas son relativas a hoy.
//
//  · Local (base con "cycles_demo" en el nombre):
//      DATABASE_URL=postgresql://$USER@localhost:5432/cycles_demo npx tsx scripts/seed-demo-eventos.ts
//  · Producción (demo en vivo): exige confirmarlo.
//      DATABASE_URL=<producción> DEMO_EN_PRODUCCION=si npx tsx scripts/seed-demo-eventos.ts
//    Antes, haz un respaldo (apps/api/scripts/respaldo-supabase.sh). Ver docs/MANUAL-DEMOS.md.
import { PrismaClient } from "@prisma/client";
import { cargarEventosDemo } from "./demo-eventos";

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const enProduccion = process.env.DEMO_EN_PRODUCCION === "si";
  if (!enProduccion && !/cycles_demo/.test(url)) {
    throw new Error("Este script solo corre contra una base llamada cycles_demo. Para la demo en producción define DEMO_EN_PRODUCCION=si.");
  }
  const antes = await prisma.athleteEvent.count({ where: { athlete: { isDemo: false } } });
  const r = await cargarEventosDemo(prisma);
  const despues = await prisma.athleteEvent.count({ where: { athlete: { isDemo: false } } });
  if (antes !== despues) throw new Error(`¡Cambió el número de actividades de cuentas que no son demo (${antes} → ${despues})!`);
  console.log(`Eventos de la demo: ${r.eventos} nuevos para ${r.atletas} atletas; ${r.sesionesReforzadas} sesiones de «Piernas» reforzadas. Actividades de cuentas reales: ${despues} (sin cambios).`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
