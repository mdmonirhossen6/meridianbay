import { createRequire } from "node:module";
const require = createRequire("file:///E:/gta06game/");
const { chromium } = require("playwright-core");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = (k) => (k === "shift" ? "ShiftLeft" : k === "space" ? "Space" : k);

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`CONSOLE: ${m.text().slice(0, 300)}`);
  });
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });

  let ok = false;
  for (let i = 0; i < 120; i++) {
    if (await page.evaluate(() => !!window.__gameApi)) { ok = true; break; }
    await sleep(500);
  }
  if (!ok) { console.log("FAIL: no game API"); await browser.close(); return; }
  await sleep(2500);
  await page.mouse.click(400, 300).catch(() => {});
  await sleep(800);
  console.log("phase:", await page.evaluate(() => window.__gameApi.player().phase));

  const api = () => page.evaluate(() => window.__gameApi.player());

  // --- A/D strafe test with camera-relative expectation ---
  await page.evaluate(() => window.__gameApi.teleport(60, 60));
  await sleep(1200);
  const p0 = await api();
  const cam0 = await page.evaluate(() => window.__cam());
  // expected screen-right unit vector from camera forward
  const cfLen = Math.hypot(cam0.x, cam0.z);
  const rightX = -cam0.z / cfLen;
  const rightZ = cam0.x / cfLen;
  await page.keyboard.down(key("d"));
  await sleep(700);
  const pD = await api();
  await page.keyboard.up(key("d"));
  await sleep(500);
  const moveX = pD.x - p0.x;
  const moveZ = pD.z - p0.z;
  const dot = moveX * rightX + moveZ * rightZ;
  console.log(`D-strafe: move=(${moveX.toFixed(2)},${moveZ.toFixed(2)}) screenRight=(${rightX.toFixed(2)},${rightZ.toFixed(2)}) dot=${dot.toFixed(2)} ${dot > 0.5 ? "OK+right" : dot < -0.5 ? "INVERTED" : "ambiguous"}`);

  // reset yaw by rewarping: teleport then face +Z via W run
  await page.evaluate(() => window.__gameApi.teleport(120, 60));
  await sleep(600);
  await page.keyboard.down(key("w"));
  await sleep(1000);
  await page.keyboard.up(key("w"));
  await sleep(700);

  // --- Jump ---
  const pb = await api();
  await page.keyboard.down(key("space"));
  await sleep(140);
  await page.keyboard.up(key("space"));
  await sleep(110);
  const pJ = await api();
  console.log(`JUMP: vy=${pJ.vy.toFixed(2)} ${pJ.vy > 2 ? "OK" : "FAIL"}`);
  await sleep(1000);

  // --- Vehicle: teleport next to a parked SEDAN (parked-0) ---
  const me = await api();
  const infos = await page.evaluate(() =>
    window.__gameApi.vehicles().map((v) => ({ id: v.id, x: v.x, z: v.z, cls: v.class }))
  );
  console.log("nearby parked:", infos.slice(0, 8).map((v) => `${v.id}:${v.cls}`).join(", "));
  const sedanr = infos.find((v) => v.id === "parked-0");
  await page.evaluate(([x, z]) => window.__gameApi.teleport(x, z), [sedanr.x + 2.2, sedanr.z + 2.2]);
  await sleep(2000);
  let tries = 0;
  let st0;
  do {
    await page.keyboard.press(key("e"));
    await sleep(900);
    st0 = await api();
    tries++;
  } while (st0.mode !== "driving" && tries < 3);
  console.log(`ENTER(x${tries}): mode=${st0.mode} ${st0.mode === "driving" ? "OK" : "FAIL"}`);

  // --- drive forward
  await page.evaluate(() => { window.__sus = {}; window.__susEnabled = true; });
  const bd0 = await page.evaluate(() => window.__vehBodies?.["parked-0"] ?? null);
  await page.keyboard.down(key("w"));
  await sleep(2400);
  let d1 = await api();
  const bd1 = await page.evaluate(() => window.__vehBodies?.["parked-0"] ?? null);
  console.log(`DRIVE W: speed=${d1.speed.toFixed(1)} mode=${d1.mode} ${d1.mode === "driving" && d1.speed > 3 ? "OK" : "FAIL"}`);
  console.log(`body: ${JSON.stringify(bd0)} -> ${JSON.stringify(bd1)} moved=${JSON.stringify(bd0) !== JSON.stringify(bd1)}`);
  console.log("dbg:", JSON.stringify(await page.evaluate(() => window.__sus.drivenCar ?? null)));
  await page.keyboard.up(key("w"));
  await sleep(600);

  // --- steer D: yaw delta sign (+ = right)
  const y0 = (await api()).yaw;
  await page.keyboard.down(key("d"));
  await sleep(1100);
  const y1 = (await api()).yaw;
  await page.keyboard.up(key("d"));
  let dy = y1 - y0;
  while (dy > Math.PI) dy -= Math.PI * 2;
  while (dy < -Math.PI) dy += Math.PI * 2;
  console.log(`STEER D: dyaw=${dy.toFixed(3)} ${dy > 0.02 ? "OK turns right" : dy < -0.02 ? "INVERTED (turns left)" : "no turn!"}`);

  // --- brake with S (while still rolling)
  await page.keyboard.down(key("s"));
  await sleep(1200);
  const b1 = await api();
  await page.keyboard.up(key("s"));
  console.log(`BRAKE S: speed=${b1.speed.toFixed(1)} ${b1.speed < 2 ? "OK stopped" : "slow"}`);
  await sleep(400);
  // --- reverse: S from standstill
  await page.keyboard.down(key("s"));
  await sleep(1200);
  const r1 = await api();
  await page.keyboard.up(key("s"));
  console.log(`REVERSE: speed=${r1.speed.toFixed(1)} ${r1.speed < -1 ? "OK" : "no reverse"}`);
  await sleep(400);

  // --- exit
  await page.keyboard.press(key("e"));
  await sleep(800);
  let st = await api();
  console.log(`EXIT: mode=${st.mode} ${st.mode === "on-foot" ? "OK" : "FAIL"}`);

  // --- camera C
  await page.keyboard.press(key("c"));
  await sleep(250);
  await page.keyboard.press(key("c"));
  await sleep(250);
  console.log("C-camera: pressed twice, no crash");

  // --- pause Esc / P
  await page.keyboard.press("Escape");
  await sleep(300);
  console.log("ESC phase:", await page.evaluate(() => window.__gameApi.player().phase));
  await page.keyboard.press("Escape");
  await sleep(300);
  console.log("ESC phase 2:", await page.evaluate(() => window.__gameApi.player().phase));
  await page.keyboard.press("KeyP");
  await sleep(300);
  console.log("P phase:", await page.evaluate(() => window.__gameApi.player().phase));
  await page.keyboard.press("KeyP");
  await sleep(300);

  console.log("CONSOLE ERRORS:", errors.length ? "\n" + errors.join("\n") : "none");
  await browser.close();
}
main().catch((e) => { console.error("TEST CRASH:", e.message); process.exit(1); });
