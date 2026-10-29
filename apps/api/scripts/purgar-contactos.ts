// Borra los mensajes del formulario de contacto de la landing (ContactRequest)
// con más de 12 meses. La política de privacidad promete conservarlos "mientras
// dure la conversación y hasta 12 meses después" (docs/legal). Por defecto es un
// ensayo: solo cuenta cuántos se borrarían. Con --aplicar los borra.
//
// Uso (desde apps/api, con DATABASE_URL de la base a limpiar en el entorno):
//   npx tsx scripts/purgar-contactos.ts [--meses 12] [--aplicar]
//
// No imprime correos ni mensajes, solo cantidades. Para producción, usar la URL
// de ~/.cycles-secretos/produccion.env sin copiarla a otro lugar.
import { PrismaClient } from "@prisma/client";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const months = Number(arg("meses") ?? 12);
  if (!Number.isInteger(months) || months < 1) throw new Error("--meses debe ser un entero mayor o igual a 1.");
  const apply = process.argv.includes("--aplicar");

  const limit = new Date();
  limit.setMonth(limit.getMonth() - months);

  const prisma = new PrismaClient();
  try {
    const total = await prisma.contactRequest.count();
    const expired = await prisma.contactRequest.count({ where: { createdAt: { lt: limit } } });
    console.log(`Contactos guardados: ${total}. Con más de ${months} meses (antes del ${limit.toISOString().slice(0, 10)}): ${expired}.`);
    if (expired === 0) return;
    if (!apply) {
      console.log("Ensayo: no se borró nada. Agrega --aplicar para borrarlos.");
      return;
    }
    const result = await prisma.contactRequest.deleteMany({ where: { createdAt: { lt: limit } } });
    console.log(`Borrados: ${result.count}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
