import * as THREE from "three";
import type { RuntimeVehicle } from "@/types/game";

export const GRAVITY = -9.81;

export const worldApi = {
  started: false,
  player: {
    pos: new THREE.Vector3(0, 1.7, 0),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    moving: 0,
    speed: 0,
    grounded: true,
    onFoot: true,
  },
  playerBodyRef: null as any,
  teleportPlayer(x: number, y: number, z: number) {
    const b = worldApi.playerBodyRef?.current;
    if (b) {
      b.setTranslation({ x, y, z }, true);
      b.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  },
  vehicles: new Map<string, RuntimeVehicle>(),
  camera: {
    mode: "chase" as "chase" | "in-car" | "orbit" | "cinematic",
    wheel: 6,
    shake: 0,
    lastNotice: "",
    noticeUntil: 0,
  },
  time: 0,
  rain: 0,
  cityGlow: [] as { mat: THREE.MeshStandardMaterial; base: number }[],
  ground: {
    lastGood: { x: 0, z: 0 },
  },
};

export function findNearestVehicle(x: number, z: number, manualOnly = true, radius = 3.2) {
  let best: RuntimeVehicle | null = null;
  let bestDist = radius;
  for (const v of worldApi.vehicles.values()) {
    if (manualOnly && !v.manual) continue;
    const dx = v.pos.x - x;
    const dz = v.pos.z - z;
    const d = dx * dx + dz * dz;
    if (d < bestDist * bestDist) {
      bestDist = Math.sqrt(d);
      best = v;
    }
  }
  return best;
}

export function setActiveVehicleId(id: string | null) {
  worldApi.player.onFoot = id === null;
}

export function getVehicleRuntime(id: string) {
  return worldApi.vehicles.get(id);
}