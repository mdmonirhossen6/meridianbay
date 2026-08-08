import { useGame } from "@/store/gameStore";
import { worldApi } from "@/lib/worldApi";
import { getCity, groundHeightAt } from "@/components/city/cityData";
import { mulberry32 } from "@/lib/procgen/noise";
import type { Objective } from "@/types/game";

let rng = mulberry32(98765);

export const COLLECTIBLE_COUNT = 8;

export interface Collectible {
  x: number;
  z: number;
  taken: boolean;
}

export const collectibles: Collectible[] = [];

export function initObjectiveSystem() {
  rng = mulberry32(98765);
  collectibles.length = 0;
  const city = getCity();
  const used: [number, number][] = [];
  for (let i = 0; i < COLLECTIBLE_COUNT; i++) {
    let x = 0;
    let z = 0;
    let ok = false;
    for (let tries = 0; tries < 24 && !ok; tries++) {
      const b = city.blocks[Math.floor(rng() * city.blocks.length)];
      x = b.x0 + 6 + rng() * (b.x1 - b.x0 - 12);
      z = b.z0 + 6 + rng() * (b.z1 - b.z0 - 12);
      ok = !used.some((u) => Math.hypot(u[0] - x, u[1] - z) < 18);
    }
    used.push([x, z]);
    collectibles.push({ x, z, taken: false });
  }
  useGame.getState().setCollectTotal(COLLECTIBLE_COUNT);
}

export function startObjective(type: "delivery" | "race" | "stunt") {
  const city = getCity();
  const b = city.blocks[Math.floor(rng() * city.blocks.length)];
  const b2 = city.blocks[Math.floor(rng() * city.blocks.length)];
  const s = useGame.getState();

  if (type === "delivery") {
    const o: Objective = {
      id: `deliv-${Date.now()}`,
      type: "delivery",
      title: "Package Run",
      desc: "Deliver the glowing package across the bay.",
      location: [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2],
      target: [(b2.x0 + b2.x1) / 2, (b2.z0 + b2.z1) / 2],
      timeLeft: 120,
      progress: 0,
      progressText: "Pick up the package",
    };
    s.setObjective(o);
  } else if (type === "stunt") {
    const o: Objective = {
      id: `stunt-${Date.now()}`,
      type: "stunt",
      title: "Stunt Jump",
      desc: "Catch air at the overpass for max airtime.",
      location: [0, 0],
      progress: 0,
      progressText: "Launch off the overpass",
    };
    s.setObjective(o);
  } else {
    const o: Objective = {
      id: `race-${Date.now()}`,
      type: "race",
      title: "Street Race",
      desc: "Reach the goal marker before time runs out.",
      location: [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2],
      timeLeft: 60,
      progress: 0,
      progressText: "Reach the goal",
    };
    s.setObjective(o);
  }
  s.notify("New objective: " + s.objective?.title);
}

let airTime = 0;
let lastGround = 1;

export function updateObjectiveSystem(dt: number) {
  const s = useGame.getState();
  if (!s.objective) return;
  const o = s.objective;

  const v = s.activeVehicleId ? worldApi.vehicles.get(s.activeVehicleId) : undefined;
  const px = worldApi.player.pos.x;
  const pz = worldApi.player.pos.z;

  if (o.type === "delivery") {
    if (o.progress === 0) {
      o.timeLeft = (o.timeLeft ?? 120) - dt;
      const d = Math.hypot(px - o.location[0], pz - o.location[1]);
      if (d < 8) {
        o.progress = 0.5;
        o.progressText = "Deliver to the target";
        o.timeLeft = 90;
      }
    } else {
      o.timeLeft = (o.timeLeft ?? 90) - dt;
      const d = Math.hypot(px - (o.target?.[0] ?? 0), pz - (o.target?.[1] ?? 0));
      o.progress = Math.max(o.progress ?? 0, 0.5 + (1 - d / 500) * 0.5);
      if (d < 8) completeObjective();
    }
    if ((o.timeLeft ?? 0) <= 0) failObjective();
  } else if (o.type === "stunt") {
    if (v) {
      const ground = groundHeightAt(v.pos.x, v.pos.z);
      const airborne = v.pos.y - ground > 1.4;
      if (airborne) {
        airTime += dt;
        lastGround = 0;
      } else {
        if (airTime > 0.6) {
          o.progress = 1;
          o.progressText = `${airTime.toFixed(1)}s airtime — landed!`;
          completeObjective();
        }
        airTime = 0;
      }
    }
  } else {
    // race: reach goal
    o.timeLeft = (o.timeLeft ?? 60) - dt;
    const d = Math.hypot(px - o.location[0], pz - o.location[1]);
    o.progress = Math.max(o.progress ?? 0, 1 - d / 400);
    if (d < 9) completeObjective();
    if ((o.timeLeft ?? 0) <= 0) failObjective();
  }

  // collectibles
  const before = s.collected;
  for (const c of collectibles) {
    if (c.taken) continue;
    if (Math.hypot(px - c.x, pz - c.z) < 3) {
      c.taken = true;
      s.collect(1);
    }
  }
  if (before !== s.collected) s.notify(`Landmark found — ${s.collected}/${s.collectTotal}`);
}

export function completeObjective() {
  const s = useGame.getState();
  s.notify("Objective complete!");
  s.setObjective(null);
}

export function failObjective() {
  const s = useGame.getState();
  s.notify("Objective missed");
  s.setObjective(null);
}