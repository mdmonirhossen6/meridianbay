"use client";

import { create } from "zustand";
import type { CameraMode, ControlMode, Objective, Phase, Quality, VehicleClass } from "@/types/game";

interface Notice {
  text: string;
  until: number;
}

interface GameState {
  phase: Phase;
  quality: Quality;
  muted: boolean;
  minimap: boolean;
  controlMode: ControlMode;
  activeVehicleId: string | null;
  activeVehicleName: string | null;
  activeVehicleClass: VehicleClass | null;
  speedKmh: number;
  cameraMode: CameraMode;
  notice: Notice | null;
  wanted: number;
  wantedFade: number;
  objective: Objective | null;
  collected: number;
  collectTotal: number;
  resetHint: boolean;
  radio: number;
  dayTime: number;
  weather: number;
  cameraDistance: number;

  setPhase: (p: Phase) => void;
  togglePause: () => void;
  setQuality: (q: Quality) => void;
  toggleMuted: () => void;
  toggleMinimap: () => void;
  setControlMode: (m: ControlMode) => void;
  setActiveVehicle: (id: string | null, name: string | null, cls: VehicleClass | null) => void;
  setSpeed: (kmh: number) => void;
  setCameraMode: (m: CameraMode) => void;
  setCameraDistance: (d: number) => void;
  notify: (text: string) => void;
  setWanted: (v: number) => void;
  setObjective: (o: Objective | null) => void;
  collect: (n: number) => void;
  setCollectTotal: (n: number) => void;
  setResetHint: (b: boolean) => void;
  setRadio: (r: number) => void;
  setDayTime: (t: number) => void;
  setWeather: (w: number) => void;
}

export const useGame = create<GameState>()((set, get) => ({
  phase: "menu",
  quality: "medium",
  muted: false,
  minimap: true,
  controlMode: "on-foot",
  activeVehicleId: null,
  activeVehicleName: null,
  activeVehicleClass: null,
  speedKmh: 0,
  cameraMode: "chase",
  notice: null,
  wanted: 0,
  wantedFade: 0,
  objective: null,
  collected: 0,
  collectTotal: 0,
  resetHint: false,
  radio: 0,
  dayTime: 0.28,
  weather: 0,
  cameraDistance: 6,

  setPhase: (p) => set({ phase: p }),
  togglePause: () => set((s) => ({ phase: s.phase === "paused" ? "playing" : "paused" })),
  setQuality: (q) => set({ quality: q }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  toggleMinimap: () => set((s) => ({ minimap: !s.minimap })),
  setControlMode: (m) => set({ controlMode: m }),
  setActiveVehicle: (id, name, cls) =>
    set({ activeVehicleId: id, activeVehicleName: name, activeVehicleClass: cls }),
  setSpeed: (kmh) => set({ speedKmh: kmh }),
  setCameraMode: (m) => set({ cameraMode: m }),
  setCameraDistance: (d) => set({ cameraDistance: d }),
  notify: (text) => set({ notice: { text, until: performance.now() + 2200 } }),
  setWanted: (v) => set((s) => ({ wanted: v, wantedFade: v > 0 ? performance.now() + 5000 : s.wantedFade })),
  setObjective: (o) => set({ objective: o }),
  collect: (n) => set((s) => ({ collected: s.collected + n })),
  setCollectTotal: (n) => set({ collectTotal: n }),
  setResetHint: (b) => set({ resetHint: b }),
  setRadio: (r) => set({ radio: r }),
  setDayTime: (t) => set({ dayTime: t }),
  setWeather: (w) => set({ weather: w }),
}));
