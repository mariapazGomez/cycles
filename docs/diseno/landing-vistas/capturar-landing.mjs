// Captura las vistas de la landing (CYC-188) contra la demo local.
// Lista y estados en docs/diseno/landing-vistas/README.md y capturas.html.
//
// Antes de correrlo (docs/MANUAL-DEMOS.md): demo regenerada HOY, API de la demo en
// el puerto 3000 sin claves de Resend ni Slack, y la web en http://localhost:5173
// sin VITE_POSTHOG_KEY. Lo ideal es un jueves o viernes antes de las 18:30.
//
//   DEMO_PASSWORD="$(cat ~/.cycles-secretos/demo/DEMO_PASSWORD)" \
//   node docs/diseno/landing-vistas/capturar-landing.mjs
//
// La contraseña llega solo por variable de entorno: no se imprime, no se guarda
// y las pantallas de inicio de sesión no se capturan.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const PLAYWRIGHT_DIR = process.env.PLAYWRIGHT_DIR ?? "/Users/mgomezg/Proyectos/cycles/content/video";
const { chromium } = createRequire(path.join(PLAYWRIGHT_DIR, "package.json"))("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const PASSWORD = process.env.DEMO_PASSWORD;
const OUT = process.env.OUT ?? path.resolve("capturas-landing-out");
const COACH = "coach.demo@example.com";
// La API limita a 100 peticiones por minuto por IP: una corrida completa puede toparse con
// el límite (se ve «No se pudo cargar…»). Para repetir solo algunas capturas, tras esperar un
// minuto: ONLY=sesion-bloques,ejercicios node docs/diseno/landing-vistas/capturar-landing.mjs
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;

if (!PASSWORD) {
  console.error("Falta DEMO_PASSWORD (ver el encabezado de este archivo).");
  process.exit(1);
}
if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  console.error("Este guion solo corre contra una web local (BASE_URL con localhost).");
  process.exit(1);
}

// Aviso si el día u hora no son los ideales para la semana 4 de la demo.
const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Santiago" }));
if (![4, 5].includes(now.getDay()) || now.getHours() * 60 + now.getMinutes() >= 18 * 60 + 30) {
  console.warn("Aviso: lo ideal es capturar un jueves o viernes antes de las 18:30 (hora de Chile).");
}

fs.mkdirSync(OUT, { recursive: true });
const failed = [];

const DESKTOP = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };

async function session(browser, size) {
  const ctx = await browser.newContext({ ...size, locale: "es-CL", timezoneId: "America/Santiago", colorScheme: "light" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill(COACH);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /^ingresar$/i }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  await dismissNovelty(page);
  return { ctx, page };
}

// El popup de novedades sale 1,5 s después de cargar y taparía las capturas: se salta una vez
// (queda marcado como visto en la demo) y se espera a que desaparezca.
async function dismissNovelty(page) {
  const dialog = page.getByRole("dialog");
  try {
    await dialog.waitFor({ state: "visible", timeout: 4000 });
    await dialog.getByRole("button", { name: /saltar|cerrar/i }).first().click();
    await dialog.waitFor({ state: "hidden", timeout: 4000 });
  } catch {
    // No había novedad pendiente.
  }
}

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  // Sin avisos, esqueletos ni el foco de teclado a cuadro.
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
}

async function shot(page, name, prepare) {
  if (ONLY && !ONLY.includes(name)) return;
  try {
    if (prepare) await prepare();
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 88 });
    console.log("ok   ", name);
  } catch (error) {
    failed.push(name);
    await page.screenshot({ path: path.join(OUT, `fallo-${name}.png`) }).catch(() => {});
    console.warn("FALLÓ", name, "-", String(error.message).split("\n")[0]);
  }
}

async function openAthlete(page, name) {
  await page.goto(`${BASE}/athletes`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name }).first().click();
  await page.waitForLoadState("networkidle");
}

// Muestra la semana actual de la pizarra y, si se pide, deja a la vista las sesiones omitidas.
async function showBoard(page, alignTo) {
  const target = alignTo ? page.getByText(alignTo, { exact: false }).first() : page.locator("main").first();
  await target.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -140));
}

// Espera a que la pizarra del ciclo termine de cargar (sin esqueletos) y la deja arriba.
async function showCycleBoard(page, anchor = "Calendario del ciclo") {
  await page.getByRole("button", { name: "Semana", exact: true }).first().click();
  await page.getByText("Calendario del ciclo").first().scrollIntoViewIfNeeded();
  await page.locator("a.bd-ses-name").first().waitFor({ timeout: 20000 });
  await page.getByText(anchor).first().evaluate(el => el.scrollIntoView({ block: "start" }));
  await page.evaluate(() => window.scrollBy(0, -110));
}

// Abre el constructor por bloques de una rutina de la Biblioteca (/routines/:id).
async function openRoutine(page, name) {
  await page.goto(`${BASE}/biblioteca`, { waitUntil: "networkidle" });
  const link = page
    .getByText(name, { exact: true })
    .first()
    .locator('xpath=ancestor::*[.//a[starts-with(@href,"/routines/")]][1]//a[starts-with(@href,"/routines/")]')
    .first();
  await link.click();
  await page.getByText("Agregar bloque").first().waitFor();
}

// Abre la sesión del coach más reciente ya hecha de un atleta (detalle con bloques plegables).
async function openLatestDoneSession(page, athlete) {
  await openAthlete(page, athlete);
  await page.getByText("Calendario del ciclo").first().scrollIntoViewIfNeeded();
  const links = page.locator('a.bd-ses-name[aria-label*="hecha"]');
  await links.first().waitFor({ timeout: 20000 });
  const link = links.last();
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await page.waitForLoadState("networkidle");
}

const browser = await chromium.launch();

// ---- Escritorio ----
{
  const { ctx, page } = await session(browser, DESKTOP);

  await shot(page, "coach-inicio", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.locator(".cb").first().waitFor();
  });

  await shot(page, "atencion", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const card = page.locator(".cb-card", { hasText: "Javiera Muñoz" }).first();
    await card.locator(".cb-badge").click();
    await card.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -160));
  });

  // Pizarra del ciclo: la semana actual con sus sesiones, hechas y pendientes.
  await shot(page, "coach-ciclo", async () => {
    await openAthlete(page, "Matías Fuentes");
    await showCycleBoard(page);
  });

  await shot(page, "resumen", async () => {
    await openAthlete(page, "Matías Fuentes");
    await page.getByRole("button", { name: "Resumen" }).click();
  });

  // NUEVO: el coach ve las actividades que el atleta agrega (deportes, partidos, descanso)
  // junto a su plan, en vista de mes y de semana, con el choque de carga a la vista.
  await shot(page, "actividades-semana", async () => {
    await openAthlete(page, "Matías Fuentes");
    await page.getByRole("button", { name: "Semana", exact: true }).first().click();
    await page.waitForTimeout(800);
  });

  await shot(page, "actividades-mes", async () => {
    await openAthlete(page, "Matías Fuentes");
    await page.getByRole("button", { name: "Mes", exact: true }).first().click();
    await page.waitForTimeout(800);
  });

  // Sesiones omitidas con su nota, en la pizarra del ciclo.
  await shot(page, "plan", async () => {
    await openAthlete(page, "Diego Paredes");
    await showCycleBoard(page, "Esta semana");
  });

  // NUEVO: crear rutinas por bloques (calentamiento, fuerza, core), cada bloque con su color.
  await shot(page, "coach-rutinas", async () => {
    await openRoutine(page, "Empuje");
  });

  // NUEVO: la misma rutina vista como sesión, con los bloques plegables.
  await shot(page, "sesion-bloques", async () => {
    await openLatestDoneSession(page, "Matías Fuentes");
  });

  // NUEVO: catálogo de ejercicios con el filtro del mapa del cuerpo.
  await shot(page, "ejercicios", async () => {
    await page.goto(`${BASE}/ejercicios`, { waitUntil: "networkidle" });
    await page.getByText(/^Catálogo/).first().click();
    await page.getByRole("button", { name: /^Pecho/ }).first().click();
    await page.waitForTimeout(800);
  });

  await shot(page, "biblioteca", async () => {
    await page.goto(`${BASE}/biblioteca`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Crear" }).click();
  });

  await ctx.close();
}

// ---- Celular, versión web del coach ----
{
  const { ctx, page } = await session(browser, MOBILE);

  await shot(page, "m-atencion", async () => {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const card = page.locator(".cb-card", { hasText: "Javiera Muñoz" }).first();
    await card.locator(".cb-badge").click();
    await card.scrollIntoViewIfNeeded();
  });

  await shot(page, "m-resumen", async () => {
    await openAthlete(page, "Matías Fuentes");
    await page.getByRole("button", { name: "Resumen" }).click();
  });

  await shot(page, "m-plan", async () => {
    await openAthlete(page, "Diego Paredes");
    await showCycleBoard(page, "Esta semana");
  });

  await ctx.close();
}

await browser.close();
console.log(`\nListo en ${OUT}`);
if (failed.length) {
  console.warn(`Revisar a mano: ${failed.join(", ")}`);
  process.exitCode = 2;
}
