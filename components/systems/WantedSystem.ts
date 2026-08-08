import { useGame } from "@/store/gameStore";
import { worldApi } from "@/lib/worldApi";
import { clamp } from "@/lib/procgen/noise";

let cooldown = 0;

export interface CopView {
  x: number;
  z: number;
  active: boolean;
}

export const copList: CopView[] = [];

export function copPositions(): CopView[] {
  return copList;
}

export function syncCops(positions: { x: number; z: number; active: boolean }[]) {
  copList.length = 0;
  for (const p of positions) copList.push(p);
}

export function initWantedSystem() {
  cooldown = 0;
}

export function updateWantedSystem(dt: number) {
  const s = useGame.getState();
  if (s.phase !== "playing" || s.wanted === 0) {
    cooldown = 0;
    return;
  }

  const player = worldApi.player;
  const v = s.activeVehicleId ? worldApi.vehicles.get(s.activeVehicleId) : undefined;

  if (v && s.controlMode === "driving") {
    const speed = Math.abs(v.speed);
    // reckless driving near pedestrians / offroading raises heat
    if (speed > 22 && s.wanted < 4) {
      useGame.getState().setWanted(Math.min(5, s.wanted + 0.02 * dt));
    }
    if (v.skid > 0.4 && speed > 12) {
      useGame.getState().setWanted(Math.min(5, s.wanted + 0.01 * dt));
    }
  }

  // shrinking radar: cops far away for a sustained period cools down
  const nearby = copPositions().some((c) => c.active && Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 64);
  if (!nearby) {
    cooldown += dt;
    if (cooldown > 6) {
      useGame.getState().setWanted(Math.max(0, s.wanted - 1));
      cooldown = 0;
    }
  } else {
    cooldown = 0;
  }
}

export function wantedCoolingBonus() {
  return clamp(cooldown, 0, 6) / 6;
}