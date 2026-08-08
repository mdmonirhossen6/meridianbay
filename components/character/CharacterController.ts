import { groundHeightAt, pushOutOfBuildings } from "@/components/city/cityData";
import { clamp } from "@/lib/procgen/noise";

export const PLAYER_HEIGHT = 1.66;
export const WALK_SPEED = 4.6;
export const RUN_SPEED = 7.6;
export const JUMP_VELOCITY = 7.1;
export const ACCEL_WALK = 13;
export const ACCEL_RUN = 26;
export const BRAKE = 24;
export const AIR_ACCEL_SCALE = 0.35;
export const CAPSULE_RADIUS = 0.34;
export const CAPSULE_HALF = 0.49;
export const BODY_OFFSET = CAPSULE_RADIUS + CAPSULE_HALF;

export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function smoothYaw(current: number, target: number, dt: number, sharpness = 12): number {
  const d = angleDiff(current, target);
  if (Math.abs(d) < 0.001) return target;
  return current + d * clamp(dt * sharpness, 0, 1);
}

export function exitVehiclePosition(vehicleX: number, vehicleZ: number, vehicleYaw: number, radius = 2.4) {
  const off = new Array(8).fill(0).map((_, k) => {
    const a = vehicleYaw + (k * Math.PI) / 4;
    return { x: vehicleX + Math.cos(a) * radius, z: vehicleZ + Math.sin(a) * radius };
  });
  const usable = off.find((p) => {
    const g = groundHeightAt(p.x, p.z);
    return g > -0.5 && Math.abs(g) < 2;
  });
  const best = usable ?? off[0];
  const pushed = pushOutOfBuildings(best.x, best.z, 0.6);
  return { x: pushed.x, z: pushed.z };
}