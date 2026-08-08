import { createRequire } from "node:module";
const require = createRequire("file:///E:/gta06game/");
const { chromium } = require("playwright-core");

const key = (k) => (k.length === 1 ? `Key${k.toUpperCase()}` : k);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text().slice(0, 120));
});

await page.goto("http://localhost:3000");
await page.waitForFunction(() => window.__gameApi, null, { timeout: 30000 });
await sleep(2500);

const api = () => page.evaluate(() => window.__gameApi.player());
const counts = await page.evaluate(() => {
  const v = window.__gameApi.vehicles();
  return { total: v.length, parked: v.filter((x) => x.id.startsWith("parked")).length, traffic: v.filter((x) => x.id.startsWith("traffic")).length, police: v.filter((x) => x.id.startsWith("police")).length };
});
console.log("vehicles:", JSON.stringify(counts));

const sedan = await page.evaluate(() => window.__gameApi.vehicles().find((v) => v.id === "parked-0"));
await page.evaluate(([x, z]) => window.__gameApi.teleport(x, z), [sedan.x + 2.2, sedan.z + 2.2]);
await sleep(1000);
for (let i = 0; i < 3; i++) {
  await page.keyboard.press(key("e"));
  await sleep(700);
}
const st = await api();
console.log("mode:", st.mode);
const before = await page.evaluate(() => window.__vehBodies?.["parked-0"] ?? null);
console.log("body before:", JSON.stringify(before));
await page.keyboard.down(key("w"));
await sleep(1500);
const after = await page.evaluate(() => window.__vehBodies?.["parked-0"] ?? null);
await page.keyboard.up(key("w"));
console.log("body after :", JSON.stringify(after));
const rt = await page.evaluate(() => window.__gameApi.vehicles().find((v) => v.id === "parked-0"));
console.log("rt pos    :", JSON.stringify({ x: rt.x, y: rt.y, z: rt.z, speed: rt.speed }));
console.log("errors:", errors.slice(0, 5));

await browser.close();