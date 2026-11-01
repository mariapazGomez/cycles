// Graba las maquetas animadas del teléfono de la landing (localhost:5173) y
// arma un clip vertical: Hoy → serie por serie → Hoy avanzando. Sin "Cuéntale a tu coach".
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const ZOOM = 2.5;
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 3200, height: 1800 },
  recordVideo: { dir: "tmp-rec", size: { width: 3200, height: 1800 } },
});
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto("http://localhost:5173/", { waitUntil: "networkidle" });
await page.addStyleTag({ content: `html{zoom:${ZOOM}} .lp-nav,header{display:none!important}` });
await page.waitForSelector(".lp-phones");
await page.evaluate(() => {
  window.__t = null;
  const fig = document.querySelector(".lp-phones figure");
  new MutationObserver(() => {
    if (fig.classList.contains("lp-active") && window.__t === null) window.__t = Date.now();
  }).observe(fig, { attributes: true, attributeFilter: ["class"] });
  document.querySelector(".lp-phones").scrollIntoView({ block: "center" });
});
await page.waitForTimeout(1200);
const rects = await page.evaluate(() =>
  [...document.querySelectorAll(".lp-phones figure .lp-device")].map((d) => {
    const r = d.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }),
);
await page.waitForTimeout(16000);
const story = (await page.evaluate(() => window.__t)) - t0;
await ctx.close();
await browser.close();
const video = fs.readdirSync("tmp-rec").map((f) => "tmp-rec/" + f)[0];
fs.writeFileSync("tmp-rec/info.json", JSON.stringify({ rects, story, video }, null, 1));
console.log({ rects, story, video });
