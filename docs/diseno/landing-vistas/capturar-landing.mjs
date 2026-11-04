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
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 30000 });
  await page.waitForLoadState("networkidle");
  return { ctx, page };
}

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  // Sin avisos, esqueletos ni el foco de teclado a cuadro.
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function shot(page, name, prepare) {
  try {
    if (prepare) await prepare();
    await settle(page);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    await page.screenshot({ path: path.join(OUT, `${name}.jpg`), type: "jpeg", quality: 88 });
    console.log("ok   ", name);
  } catch (error) {
    failed.push(name);
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

  await shot(page, "coach-ciclo", async () => {
    await openAthlete(page, "Matías Fuentes");
    await showBoard(page);
  });

  await shot(page, "resumen", async () => {
    await openAthlete(page, "Matías Fuentes");
    await page.getByRole("button", { name: "Resumen" }).click();
  });

  await shot(page, "plan", async () => {
    await openAthlete(page, "Diego Paredes");
    await showBoard(page, "Omitida");
  });

  await shot(page, "coach-rutinas", async () => {
    await page.goto(`${BASE}/biblioteca`, { waitUntil: "networkidle" });
    await page.getByText("Piernas", { exact: true }).first().click();
    await page.waitForLoadState("networkidle");
    // Si la demo no trae nota del coach, se escribe una para la captura (no se guarda).
    const note = page.locator('textarea[id^="note-"]').first();
    if (await note.count()) {
      if (!(await note.inputValue())) await note.fill("Baja lento y cuida la rodilla");
    }
  });

  await shot(page, "ejercicios", async () => {
    await page.goto(`${BASE}/ejercicios`, { waitUntil: "networkidle" });
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
    await showBoard(page, "Omitida");
  });

  await ctx.close();
}

await browser.close();
console.log(`\nListo en ${OUT}`);
if (failed.length) {
  console.warn(`Revisar a mano: ${failed.join(", ")}`);
  process.exitCode = 2;
}
