export type Quality = "low" | "medium" | "high";
export type Phase = "menu" | "playing" | "paused";
export type ControlMode = "on-foot" | "driving";
export type CameraMode = "chase" | "in-car" | "orbit" | "cinematic";
export type VehicleClass = "sedan" | "sports" | "suv" | "motorcycle";
export type Surface = "asphalt" | "wet" | "sand" | "grass" | "dirt" | "bridge";

export interface VehicleConfig {
  id: string;
  name: string;
  class: VehicleClass;
  maxSpeed: number;
  accel: number;
  brake: number;
  reverseMax: number;
  coast: number;
  steering: number;
  steerAtSpeed: number;
  mass: number;
  length: number;
  width: number;
  height: number;
  wheelBase: number;
  wheelTrack: number;
  wheelRadius: number;
  wheelWidth: number;
  clearance: number;
  bodyRoll: number;
  brakeDive: number;
  bike: boolean;
  headlightY: number;
}

export interface Objective {
  id: string;
  type: "delivery" | "race" | "stunt" | "collect";
  title: string;
  desc: string;
  location: [number, number];
  target?: [number, number];
  timeLeft?: number;
  progress?: number;
  progressText?: string;
}

export interface RuntimeVehicle {
  id: string;
  name: string;
  class: VehicleClass;
  manual: boolean;
  pos: { x: number; y: number; z: number };
  yaw: number;
  speed: number;
  steer: number;
  damage: number;
  headlightsOn: boolean;
  skid: number;
  updateTick: number;
}