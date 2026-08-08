import { clamp, hash2, mulberry32 } from "@/lib/procgen/noise";

export const CELL = 80;
export const GRID = 9;
export const HALF = (GRID - 1) / 2;
export const WATER_Y = -0.6;

export function px(i: number) {
  return i * CELL - HALF * CELL;
}
export function pz(j: number) {
  return j * CELL - HALF * CELL;
}

export const RING_W = 16;
export const MAIN_W = 14;
export const LOCAL_W = 10;

export function roadWidthX(i: number) {
  return i === 0 || i === GRID - 1 ? RING_W : i === Math.floor(GRID / 2) ? MAIN_W : LOCAL_W;
}
export function roadWidthZ(j: number) {
  return j === 0 || j === GRID - 1 ? RING_W : j === Math.floor(GRID / 2) ? MAIN_W : LOCAL_W;
}

export function onVerticalRoad(x: number, z: number): { road: boolean; width: number } {
  for (let i = 0; i < GRID; i++) {
    if (Math.abs(x - px(i)) <= roadWidthX(i) / 2) return { road: true, width: roadWidthX(i) };
  }
  return { road: false, width: 0 };
}

export function onHorizontalRoad(x: number, z: number): { road: boolean; width: number } {
  for (let j = 0; j < GRID; j++) {
    if (Math.abs(z - pz(j)) <= roadWidthZ(j) / 2) return { road: true, width: roadWidthZ(j) };
  }
  return { road: false, width: 0 };
}

export type District = "downtown" | "residential" | "industrial" | "beach" | "park";

export function blockDistrict(i: number, j: number): District {
  if (i === 4 && j === 4) return "park";
  if (i >= 3 && i <= 5 && j >= 3 && j <= 5) return "downtown";
  if (i <= 1 || j <= 1) return "industrial";
  if (i >= 6) return "beach";
  return "residential";
}

export const SEA_LINE = 292;
const BEACH_START = SEA_LINE - 44;

export function riverDepth(x: number, z: number): number {
  const rx0 = 96;
  const rx1 = 140;
  const rz0 = -190;
  const rz1 = -30;
  if (x < rx0 || x > rx1 || z < rz0 || z > rz1) return 0;
  const ex = Math.min(x - rx0, rx1 - x);
  const ez = Math.min(z - rz0, rz1 - z);
  const edge = Math.min(ex, ez);
  const d = Math.max(0, edge - 6) / 14;
  return -clamp(d, 0, 1) * 7;
}

export function terrainHeight(x: number, z: number): number {
  const rd = riverDepth(x, z);
  if (rd < 0) return rd;
  const t = x - SEA_LINE;
  if (t >= 0) {
    return -t * 0.16;
  }
  if (t > -44) {
    return 0;
  }
  return 0;
}

const OVERPASS = { line: 0, from: -150, to: 150, height: 10, ramp: 60 };

function smoothRamp(v: number, width: number): number {
  const t = clamp(v / width, 0, 1);
  return t * t * (3 - 2 * t);
}

export function overpassElevation(x: number, z: number): number {
  const w = roadWidthZ(4) / 2;
  if (Math.abs(z) > w + 4) return 0;
  if (x < OVERPASS.from - OVERPASS.ramp || x > OVERPASS.to + OVERPASS.ramp) return 0;
  const enter = smoothRamp(x - (OVERPASS.from - OVERPASS.ramp), OVERPASS.ramp);
  const exit = smoothRamp(OVERPASS.to + OVERPASS.ramp - x, OVERPASS.ramp);
  const e = Math.min(enter, exit);
  const mid = x > OVERPASS.from && x < OVERPASS.to ? 1 : 0;
  const env = Math.max(mid, e);
  return OVERPASS.height * env;
}

export function groundHeightAt(x: number, z: number): number {
  return terrainHeight(x, z);
}

export function isInWater(x: number, z: number): boolean {
  return riverDepth(x, z) < -0.4 || x > SEA_LINE + 2;
}

export function surfaceAt(x: number, z: number): "asphalt" | "wet" | "sand" | "grass" | "dirt" | "bridge" {
  if (overpassElevation(x, z) > 2) return "bridge";
  if (isInWater(x, z)) return "wet";
  const v = onVerticalRoad(x, z);
  const h = onHorizontalRoad(x, z);
  if (v.road || h.road) return "asphalt";
  if (x > SEA_LINE - 60) return "sand";
  if (x > SEA_LINE - 120) return "dirt";
  if (blockDistrict(Math.floor((x + HALF * CELL) / CELL + 0.001), Math.floor((z + HALF * CELL) / CELL + 0.001)) === "park")
    return "grass";
  return "grass";
}

export function nearestRoadInfo(x: number, z: number) {
  let best = { x, z, yaw: 0, dist: Infinity };
  for (let i = 0; i < GRID; i++) {
    const d = Math.abs(x - px(i));
    if (d < best.dist) best = { x: px(i), z, yaw: 0, dist: d };
  }
  for (let j = 0; j < GRID; j++) {
    const d = Math.abs(z - pz(j));
    if (d < best.dist) best = { x, z: pz(j), yaw: Math.PI / 2, dist: d };
  }
  return best;
}

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  type: "tower" | "apt" | "house" | "warehouse" | "stadium";
  seed: number;
}

export interface BlockDef {
  i: number;
  j: number;
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  district: District;
}

function genBuildingsForBlock(blk: BlockDef, list: Building[]) {
  const { i, j, x0, z0, x1, z1 } = blk;
  const pad = 5;
  const rng = mulberry32(i * 977 + j * 311 + 13);
  const dist = blk.district;

  if (dist === "park") return;

  const inset = (v: number, lo: number, hi: number) => clamp(v, lo, hi);

  const add = (x: number, z: number, w: number, d: number, h: number, type: Building["type"]) => {
    list.push({ x, z, w, d, h, type, seed: Math.floor(rng() * 100000) });
  };

  if (dist === "downtown") {
    const cellW = (x1 - x0) / 2;
    const cellD = (z1 - z0) / 2;
    for (let a = 0; a < 2; a++) {
      for (let b = 0; b < 2; b++) {
        const cx = x0 + pad + a * cellW + cellW / 2;
        const cz = z0 + pad + b * cellD + cellD / 2;
        const w = cellW - pad * 2 - 6 + rng() * 6;
        const d = cellD - pad * 2 - 6 + rng() * 6;
        const h = 24 + rng() * 42;
        add(cx, cz, w, d, h, rng() > 0.5 ? "tower" : "apt");
      }
    }
  } else if (dist === "residential") {
    const n = 3 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const w = 10 + rng() * 5;
      const d = 8 + rng() * 4;
      const x = inset(x0 + pad + rng() * (x1 - x0 - pad * 2 - w), x0 + pad, x1 - pad - w);
      const z = inset(z0 + pad + rng() * (z1 - z0 - pad * 2 - d), z0 + pad, z1 - pad - d);
      add(x, z, w, d, 4.5 + rng() * 3, "house");
    }
  } else if (dist === "industrial") {
    const n = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const w = 16 + rng() * 12;
      const d = 12 + rng() * 10;
      const x = inset(x0 + pad + rng() * (x1 - x0 - pad * 2 - w), x0 + pad, x1 - pad - w);
      const z = inset(z0 + pad + rng() * (z1 - z0 - pad * 2 - d), z0 + pad, z1 - pad - d);
      add(x, z, w, d, 9 + rng() * 7, "warehouse");
    }
  } else if (dist === "beach") {
    const n = 1 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) {
      const w = 14 + rng() * 10;
      const d = 10 + rng() * 6;
      const x = inset(x0 + pad + rng() * (x1 - x0 - pad * 2 - w), x0 + pad, x1 - pad - w);
      const z = inset(z0 + pad + rng() * (z1 - z0 - pad * 2 - d), z0 + pad, z1 - pad - d);
      add(x, z, w, d, 6 + rng() * 4, "apt");
    }
  }
}

export interface Landmark {
  x: number;
  z: number;
  kind: "tower" | "stadium" | "fountain";
}

export interface Spawn {
  x: number;
  z: number;
  yaw: number;
  type: "sedan" | "sports" | "suv" | "motorcycle";
}

export interface CityData {
  blocks: BlockDef[];
  buildings: Building[];
  landmarks: Landmark[];
  spawns: Spawn[];
}

let cachedCity: CityData | null = null;

export function getCity(): CityData {
  if (cachedCity) return cachedCity;

  const blocks: BlockDef[] = [];
  for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      blocks.push({
        i,
        j,
        x0: px(i) + 1.5,
        z0: pz(j) + 1.5,
        x1: px(i + 1) - 1.5,
        z1: pz(j + 1) - 1.5,
        district: blockDistrict(i, j),
      });
    }
  }

  const buildings: Building[] = [];
  for (const b of blocks) genBuildingsForBlock(b, buildings);

  const landmarks: Landmark[] = [
    { x: px(4) + CELL / 2, z: pz(4) + CELL / 2, kind: "fountain" },
    { x: 40, z: -CELL / 2, kind: "tower" },
    { x: px(6) + CELL / 2, z: pz(2) + CELL / 2, kind: "stadium" },
  ];

  const spawns: Spawn[] = [];
  const spawnRng = mulberry32(4242);
  const types: Spawn["type"][] = ["sedan", "sedan", "sports", "suv", "motorcycle", "sedan", "suv", "sports"];
  const spots: [number, number][] = [
    [px(4) + 4, pz(4) - 10],
    [px(4) - 8, pz(5) + 4],
    [px(5) + 8, pz(4) + 10],
    [px(3) + 6, pz(3) + 10],
    [px(6) - 8, pz(5) + 12],
    [px(1) + 20, pz(2) - 14],
    [px(7) + 12, pz(1) + 10],
    [px(2) + 18, pz(6) + 16],
  ];
  for (let k = 0; k < spots.length; k++) {
    const [sx, sz] = spots[k];
    const road = nearestRoadInfo(sx, sz);
    const yaw = road.yaw + (spawnRng() > 0.5 ? Math.PI : 0);
    spawns.push({ x: road.x, z: road.z, yaw, type: types[k % types.length] });
  }

  cachedCity = { blocks, buildings, landmarks, spawns };
  return cachedCity;
}

export interface TrafficNode {
  i: number;
  j: number;
  x: number;
  z: number;
}

export interface TrafficEdge {
  a: number;
  b: number;
  axis: "x" | "z";
  dir: number;
  laneOffset: number;
  len: number;
}

export function buildTrafficGraph() {
  const nodes: TrafficNode[] = [];
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      nodes.push({ i, j, x: px(i), z: pz(j) });
    }
  }
  const edges: TrafficEdge[] = [];
  const idx = (i: number, j: number) => i * GRID + j;

  // Edges traveling ALONG Z (north-south) at column i between rows j and j+1
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID - 1; j++) {
      const lane = roadWidthX(i) / 2 - 2.2;
      edges.push({ a: idx(i, j), b: idx(i, j + 1), axis: "z", dir: 1, laneOffset: lane, len: CELL });
      edges.push({ a: idx(i, j + 1), b: idx(i, j), axis: "z", dir: -1, laneOffset: -lane, len: CELL });
    }
  }
  // Edges traveling ALONG X (east-west) at row j between columns i and i+1
  for (let i = 0; i < GRID - 1; i++) {
    for (let j = 0; j < GRID; j++) {
      const lane = roadWidthZ(j) / 2 - 2.2;
      edges.push({ a: idx(i, j), b: idx(i + 1, j), axis: "x", dir: 1, laneOffset: lane, len: CELL });
      edges.push({ a: idx(i + 1, j), b: idx(i, j), axis: "x", dir: -1, laneOffset: -lane, len: CELL });
    }
  }
  return { nodes, edges };
}

export function edgePosition(edge: TrafficEdge, nodes: TrafficNode[], t: number) {
  const a = nodes[edge.a];
  const b = nodes[edge.b];
  if (edge.axis === "x") {
    return { x: a.x + (b.x - a.x) * t, z: a.z + edge.laneOffset };
  }
  return { x: a.x + edge.laneOffset, z: a.z + (b.z - a.z) * t };
}

export function edgeLength(edge: TrafficEdge): number {
  return CELL;
}

export function buildingRects() {
  const city = getCity();
  return city.buildings.map((b) => ({
    x0: b.x - b.w / 2,
    x1: b.x + b.w / 2,
    z0: b.z - b.d / 2,
    z1: b.z + b.d / 2,
  }));
}

export function pushOutOfBuildings(x: number, z: number, radius: number): { x: number; z: number } {
  const rects = buildingRects();
  for (const r of rects) {
    const cx = clamp(x, r.x0, r.x1);
    const cz = clamp(z, r.z0, r.z1);
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.0001;
      const nx = dx / d;
      const nz = dz / d;
      return pushOutOfBuildings(cx + nx * (radius + 0.05), cz + nz * (radius + 0.05), radius);
    }
  }
  return { x, z };
}