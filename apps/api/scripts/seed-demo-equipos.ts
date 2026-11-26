// Agrega los equipos de la demo (equipos, ciclos del equipo y eventos) SIN recargar la demo. Solo
// agrega, solo en cuentas de demostración y se puede repetir sin duplicar (ver demo-equipos.ts).
//
// Por defecto SOLO REVISA: lee y muestra qué hay y qué crearía, sin escribir. Para escribir hay que
// pedirlo con DEMO_APLICAR=si.
//
// Desde apps/api (TS_NODE_COMPILER_OPTIONS='{"esModuleInterop":true}'):
//  · Local (base con "cycles_demo" en el nombre):
//      DATABASE_URL=postgresql://$USER@localhost:5432/cycles_demo npx ts-node scripts/seed-demo-equipos.ts
//  · Producción: además DEMO_EN_PRODUCCION=si. Antes de aplicar, haz un respaldo
//    (apps/api/scripts/respaldo-supabase.sh). Ver docs/MANUAL-DEMOS.md.
// DEMO_PASSWORD solo hace falta si falta alguno de los 8 atletas.
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { policyAcceptanceData } from "../src/common/policy";
import { cargarEquiposDemo, revisarEquiposDemo, fechasDelPlan, hoyEnChile } from "./demo-equipos";

const prisma = new PrismaClient();

// Los mismos nombres que usa seed-demo.ts, por si falta alguna cuenta.
const NOMBRES: Record<string, string> = {
  "valentina.soto@example.com": "Valentina Soto",
  "matias.fuentes@example.com": "Matías Fuentes",
  "javiera.munoz@example.com": "Javiera Muñoz",
  "diego.paredes@example.com": "Diego Paredes",
  "renata.aguirre@example.com": "Renata Aguirre",
  "tomas.villalobos@example.com": "Tomás Villalobos",
  "antonia.cardenas@example.com": "Antonia Cárdenas",
  "sebastian.rojas@example.com": "Sebastián Rojas",
};

// Lo de cuentas que no son de demostración, para comprobar que no cambió.
async function ajeno() {
  const [equipos, rutinas, eventos] = await Promise.all([
    prisma.team.count({ where: { coach: { isDemo: false } } }),
    prisma.routine.count({ where: { coach: { isDemo: false } } }),
    prisma.teamEvent.count({ where: { team: { coach: { isDemo: false } } } }),
  ]);
  return `${equipos} equipos, ${rutinas} rutinas y ${eventos} eventos de equipo`;
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.DEMO_EN_PRODUCCION !== "si" && !/cycles_demo/.test(url)) {
    throw new Error("Este script solo corre contra una base llamada cycles_demo. Para la demo en producción define DEMO_EN_PRODUCCION=si.");
  }

  const hoy = hoyEnChile();
  const revision = await revisarEquiposDemo(prisma, hoy);
  console.log(`Hoy (Chile): ${hoy}`);
  for (const a of revision.atletas) {
    const individual = !a.individualHasta ? "sin ciclo individual activo" : a.individualHasta >= hoy ? `ciclo individual vigente hasta ${a.individualHasta}` : `ciclo individual TERMINADO el ${a.individualHasta}`;
    console.log(`  ${a.email}: ${a.existe ? individual : "NO EXISTE (se crearía)"}`);
  }
  for (const e of revision.equipos) {
    console.log(`  Equipo «${e.nombre}»: ${e.existe ? "ya existe" : "se crearía"}; ciclo ${e.cicloVigente ? `vigente hasta ${e.cicloVigente}` : "se crearía desde hoy, 4 semanas"}; ${e.eventos} eventos hoy.`);
  }
  const end = new Date(Date.parse(`${hoy}T00:00:00Z`) + 27 * 86_400_000).toISOString().slice(0, 10);
  console.log(`  Un ciclo nuevo tendría ${fechasDelPlan(hoy, end, hoy).length} sesiones (martes, jueves y viernes). Rutinas por crear: ${revision.rutinasQueFaltan.length}.`);

  if (process.env.DEMO_APLICAR !== "si") {
    console.log("Solo revisión: no se escribió nada. Para aplicar, define DEMO_APLICAR=si.");
    return;
  }

  const password = process.env.DEMO_PASSWORD ?? "";
  const crearAtleta =
    password.length >= 12
      ? async (email: string, coachId: string) => {
          const now = new Date();
          const name = NOMBRES[email];
          const athlete = await prisma.user.create({
            data: { email, name, role: "athlete", passwordHash: await bcrypt.hash(password, 12), dataConsentAt: now, dataConsentVersion: "demo", emailVerifiedAt: now, isDemo: true, policyAcceptances: { create: policyAcceptanceData("register") } },
          });
          await prisma.coachAthlete.create({ data: { coachId, athleteId: athlete.id, status: "active" } });
        }
      : undefined;

  const antes = await ajeno();
  const r = await cargarEquiposDemo(prisma, { hoy, crearAtleta });
  const despues = await ajeno();
  console.log(`Equipos de la demo: ${r.equiposNuevos} equipos, ${r.ciclosNuevos} ciclos, ${r.sesionesNuevas} sesiones de equipo, ${r.ajustadas} ajustadas, ${r.eventosNuevos} eventos y ${r.atletasNuevos} atletas nuevos.`);
  console.log(`Cuentas que no son de demostración: antes ${antes}; después ${despues}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
