import { createRequire } from "node:module";
const require = createRequire("file:///E:/gta06game/");
const { chromium } = require("playwright-core");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 120; i++) {
    if (await page.evaluate(() => !!window.__gameApi)) break;
    await sleep(500);
  }
  await sleep(2000);
  await page.mouse.click(400, 300).catch(() => {});
  await sleep(1000);
  await page.evaluate(() => { window.__sus = {}; window.__susEnabled = true; });

  const v0 = await page.evaluate(() => window.__gameApi.vehicles().find((v) => v.id === "parked-0"));
  console.log("sedan spawn y:", v0.y, "x,z:", v0.x.toFixed(1), v0.z.toFixed(1));
  await sleep(4000);
  const v1 = await page.evaluate(() => window.__gameApi.vehicles().find((v) => v.id === "parked-0"));
  console.log("sedan y after 4s:", v1.y, " speed:", v1.speed);
  console.log("__sus:", JSON.stringify(await page.evaluate(() => window.__sus ?? null)));
  console.log("__stepProbe:", await page.evaluate(() => window.__stepProbe ?? 0));
  console.log("__vehRender:", await page.evaluate(() => window.__vehRender ?? 0));
  await sleep(2000);
  console.log("__sus 6s:", JSON.stringify(await page.evaluate(() => window.__sus ?? null)));
  console.log("__stepProbe 6s:", await page.evaluate(() => window.__stepProbe ?? 0));

  // probe the road straight down from the sedan's chassis centre
  const probe = await page.evaluate(([x, z, y]) => window.__probe(x, y, z, 0, -1, 0, 3), [v1.x, v1.z, 2]);
  console.log("probe down from sedan:", JSON.stringify(probe));

  // probe from the anchor point: pos.y+0.45
  const probe2 = await page.evaluate(([x, z, y]) => window.__probe(x, y, z, 0, -1, 0, 0.6), [v1.x, v1.z, v1.y + 0.45]);
  console.log("probe wheel-anchor:", JSON.stringify(probe2));

  await browser.close();
}
main().catch((e) => { console.error("CRASH:", e.message); process.exit(1); });