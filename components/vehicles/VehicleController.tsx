"use client";

import * as THREE from "three";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider, useRapier, useBeforePhysicsStep } from "@react-three/rapier";
import type { RuntimeVehicle, VehicleConfig } from "@/types/game";
import { useGame } from "@/store/gameStore";
import { input } from "@/lib/input/InputManager";
import { worldApi } from "@/lib/worldApi";
import { groundHeightAt, surfaceAt, nearestRoadInfo, pushOutOfBuildings } from "@/components/city/cityData";
import { clamp } from "@/lib/procgen/noise";

export interface WheelApi {
  pos: { x: number; z: number };
  front: boolean;
  radius: number;
  steer: number;
  spinAngle: number;
  spring: number;
}

const WheelCtx = createContext<(w: WheelApi | null) => void>(() => {});

export function useWheelRegister() {
  return useContext(WheelCtx);
}

export function Wheel({ pos, radius, width, front, hub = "#cdd2da" }: { pos: { x: number; z: number }; radius: number; width: number; front: boolean; hub?: string }) {
  const register = useWheelRegister();
  const api = useMemo<WheelApi>(() => ({ pos, front, radius, steer: 0, spinAngle: 0, spring: 0 }), [pos, front, radius]);
  const root = useRef<THREE.Group>(null);
  const steerRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    register(api);
    return () => register(null);
  }, [api, register]);

  useFrame(() => {
    if (root.current) root.current.position.y = 0.06 + api.spring * 0.55;
    if (steerRef.current) steerRef.current.rotation.y = api.steer;
    if (spinRef.current) spinRef.current.rotation.x = api.spinAngle;
  });

  return (
    <group position={[pos.x, 0, pos.z]}>
      <group ref={steerRef}>
        <mesh ref={spinRef} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[radius, radius, width, 18]} />
          <meshStandardMaterial color="#16171c" roughness={0.92} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[radius * 0.12, 0, 0]}>
          <cylinderGeometry args={[radius * 0.55, radius * 0.55, width * 0.8, 12]} />
          <meshStandardMaterial color={hub} metalness={0.85} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

export interface VehicleBodyProps {
  config: VehicleConfig;
  id: string;
  manual?: boolean;
  position: [number, number, number];
  yaw?: number;
  children: React.ReactNode;
}

const STEP_DT = 1 / 60;
const WHEEL_FLAGS = 1 | 16 | 8; // EXCLUDE_DYNAMIC | EXCLUDE_KINEMATIC | EXCLUDE_SENSORS

export function VehicleBody({ config, id, manual = true, position, yaw = 0, children }: VehicleBodyProps) {
  const bodyRef = useRef<any>(null);
  const wheels = useRef<WheelApi[]>([]);
  const steerAngle = useRef(0);
  const registerWheel = useMemo(() => (w: WheelApi | null) => {
    if (w) wheels.current.push(w);
    else wheels.current = wheels.current.filter((x) => x !== null);
  }, []);

  const { world, rapier } = useRapier();
  const lastImpactSpeed = useRef(0);
  const evictUntil = useRef(0);
  (window as any).__vehRender = ((window as any).__vehRender || 0) + 1;
  const wheelVis = useRef([
    { spring: 0, steer: 0, rot: 0 },
    { spring: 0, steer: 0, rot: 0 },
    { spring: 0, steer: 0, rot: 0 },
    { spring: 0, steer: 0, rot: 0 },
  ]);

  useEffect(() => {
    const rt = {
      id,
      name: config.name,
      class: config.class,
      manual,
      pos: { x: position[0], y: position[1], z: position[2] },
      yaw,
      speed: 0,
      steer: 0,
      damage: 0,
      headlightsOn: false,
      skid: 0,
      updateTick: 0,
    } satisfies RuntimeVehicle;
    worldApi.vehicles.set(id, rt);
    return () => {
      worldApi.vehicles.delete(id);
      const st = useGame.getState();
      if (st.activeVehicleId === id) {
        st.setActiveVehicle(null, null, null);
        st.setControlMode("on-foot");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let prev = useGame.getState().activeVehicleId;
    return useGame.subscribe((s) => {
      if (s.controlMode !== "driving") {
        if (prev === id) evictUntil.current = performance.now() + 1400;
        prev = null;
      } else {
        prev = s.activeVehicleId;
      }
    });
  }, [id]);

  useBeforePhysicsStep(() => {
    const body = bodyRef.current;
    const dbg = (window as any).__sus as any;
    if (dbg) {
      dbg.steps = (dbg.steps || 0) + 1;
      dbg.hasBody = !!body;
      dbg.bike = config.bike;
      dbg.id = id;
      if (body && !dbg.methods) {
        dbg.methods = Object.getOwnPropertyNames(Object.getPrototypeOf(body)).filter((n) => n.includes("Force") || n.includes("Impulse")).join(",");
      }
      if ((dbg.steps || 0) <= 30) {
        const lin = body.linvel();
        const pos = body.translation();
        dbg.first = dbg.first || [];
        dbg.first.push({ s: dbg.steps, y: +pos.y.toFixed(3), vy: +lin.y.toFixed(2), hits: dbg.hits ?? 0, lastToi: +(dbg.lastToi ?? -1).toFixed(2), spring: Math.round(dbg.lastSpring ?? 0) });
      }
    }
    if (!body || config.bike) return;
    if (!(window as any).__susEnabled) return;
    const rt = worldApi.vehicles.get(id);
    if (!rt) return;
    const s = useGame.getState();
    const driven = s.controlMode === "driving" && s.activeVehicleId === id;

    let throttle = 0;
    let steer = 0;
    let handbrake = false;
    if (driven && s.phase === "playing") {
      throttle = input.axis("forward", "back");
      steer = input.axis("right", "left");
      handbrake = input.is("jump");
      useGame.getState().setResetHint(false);
    }
    if (dbg) {
      dbg.throttle = throttle;
      dbg.steerIn = steer;
      dbg.driven = driven;
    }
    const evicting = performance.now() < evictUntil.current;

    const pos = body.translation();
    const quat = body.rotation();
    const lin = body.linvel();
    const ang = body.angvel();
    const fwd = quatVec(quat, 0, 0, 1);
    const right = quatVec(quat, 1, 0, 0);
    const vfCom = fwd.x * lin.x + fwd.z * lin.z;

    const speedNL = clamp(Math.abs(vfCom) / config.maxSpeed, 0, 1);
    const maxSteer = clamp(config.steering * 0.22, 0.25, 0.62);
    const steerScale = 1 / (1 + speedNL * config.steerAtSpeed);
    const targetSteer = steer * maxSteer * steerScale;
    steerAngle.current += (targetSteer - steerAngle.current) * clamp(STEP_DT * 8, 0, 1);
    rt.steer = steerAngle.current;

    const k = config.mass * 27.5; // spring stiffness N/m (~2.6Hz)
    const c = config.mass * 6.5; // damping (~0.55 critical @ suspension nat freq)
    const staticLoad = (config.mass * 9.81) / 4;
    const ef = (config.accel * config.mass) / 4;
    const bf = (config.brake * config.mass) / 4;
    const rest = config.wheelRadius + config.clearance + 0.09;
    const anchors = [
      { x: -config.wheelTrack / 2, z: config.wheelBase / 2 },
      { x: config.wheelTrack / 2, z: config.wheelBase / 2 },
      { x: -config.wheelTrack / 2, z: -config.wheelBase / 2 },
      { x: config.wheelTrack / 2, z: -config.wheelBase / 2 },
    ];
    const steerSin = Math.sin(steerAngle.current);
    const steerCos = Math.cos(steerAngle.current);
    let groundedCount = 0;
    let maxSlip = 0;
    if (dbg) {
      dbg.hits = 0;
      dbg.lastToi = -1;
      dbg.lastSpring = 0;
      dbg.maxLen = config.wheelRadius + 0.12;
      dbg.anchorY = config.clearance + config.wheelRadius;
      dbg.posY = pos.y;
    }

    for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const a = anchors[i];
      const anchor = quatVec(quat, a.x, config.clearance + config.wheelRadius, a.z);
      const wx = pos.x + anchor.x;
      const wy = pos.y + anchor.y;
      const wz = pos.z + anchor.z;

      const ray = new rapier.Ray({ x: wx, y: wy, z: wz }, { x: 0, y: -1, z: 0 });
      const hit = world.castRay(
        ray,
        config.wheelRadius + config.clearance + 0.35,
        true,
        rapier.QueryFilterFlags.EXCLUDE_DYNAMIC | rapier.QueryFilterFlags.EXCLUDE_SENSORS
      );
      if (dbg && (dbg.steps || 0) <= 12) {
        dbg.rays = dbg.rays || [];
        dbg.rays.push({ w: i, wx: +wx.toFixed(2), wy: +wy.toFixed(2), wz: +wz.toFixed(2), toi: hit ? +hit.timeOfImpact.toFixed(2) : null });
      }
      if (!hit) continue;

      const toi = hit.timeOfImpact;
      const cp = { x: wx, y: wy - toi, z: wz };
      const compress = clamp(rest - toi, 0, 0.22);

      const rx = cp.x - pos.x;
      const ry = cp.y - pos.y;
      const rz = cp.z - pos.z;
      const vcx = lin.x + ang.y * rz - ang.z * ry;
      const vcy = lin.y + ang.z * rx - ang.x * rz;
      const vcz = lin.z + ang.x * ry - ang.y * rx;

      const springLoad = clamp(k * compress, 0, staticLoad * 3);
      const springF = springLoad - c * vcy;
      if (dbg) {
        dbg.hits++;
        dbg.lastToi = toi;
        dbg.lastSpring = Math.max(dbg.lastSpring, springLoad);
      }

      const wfF = front ? steerCos * fwd.x + steerSin * right.x : fwd.x;
      const wfZ = front ? steerCos * fwd.z + steerSin * right.z : fwd.z;
      const wlX = front ? steerCos * right.x - steerSin * fwd.x : right.x;
      const wlZ = front ? steerCos * right.z - steerSin * fwd.z : right.z;

      const vfW = vcx * wfF + vcz * wfZ;
      const vlW = vcx * wlX + vcz * wlZ;

      const mu = handbrake && !front ? 0.32 : 1.12;
      const maxLat = mu * springLoad;
      const latF = clamp(-vlW * config.mass * 16, -maxLat, maxLat);
      maxSlip = Math.max(maxSlip, Math.abs(vlW) * (springF > staticLoad * 0.2 ? 1 : 0));

      let fFwd = 0;
      if (handbrake && !front) {
        fFwd = -Math.sign(vfW) * Math.min(Math.abs(vfW) * config.mass * 6, bf * 0.75);
      } else if (evicting) {
        fFwd = -Math.sign(vfW) * bf * 1.2;
      } else if (throttle > 0.02) {
        fFwd = throttle * ef * Math.max(0.12, 1 - vfW / config.maxSpeed);
      } else if (throttle < -0.02) {
        if (vfW > 0.8) {
          fFwd = -throttle * -bf; // brake
        } else {
          fFwd = throttle * ef * 0.5 * Math.max(0.1, 1 - Math.abs(vfW) / config.reverseMax);
        }
      } else {
        const rollRes = -Math.sign(vfW) * Math.min(Math.abs(vfW) * config.mass * 0.5, driven ? 60 : 9000);
        fFwd = rollRes;
      }

      body.addForceAtPoint(
        {
          x: wfF * fFwd + wlX * latF,
          y: springF,
          z: wfZ * fFwd + wlZ * latF,
        },
        cp,
        true
      );

      const wv = wheelVis.current[i];
      wv.spring = compress * 5;
      wv.steer = front ? steerAngle.current : 0;
      wv.rot += (vfW / config.wheelRadius) * STEP_DT;
    }

    rt.skid = Math.max(0, Math.min(1, rt.skid * 0.9 + clamp(maxSlip / 5, 0, 0.9) * 0.1 + (handbrake ? 0.25 : 0)));

    // gentle self-righting torque to prevent flips from curbs
    const up = quatVec(quat, 0, 1, 0);
    if (up.y < 0.85) {
      const gain = config.mass * 2.2;
      body.applyTorqueImpulse({ x: -up.z * gain * STEP_DT, y: 0, z: up.x * gain * STEP_DT }, true);
    }
  });

  useFrame((_, rawDelta) => {
    const delta = clamp(rawDelta, 0, 0.05);
    const s = useGame.getState();
    const rt = worldApi.vehicles.get(id);
    if (!rt) return;
    const body = bodyRef.current;
    if (!body) return;

    bikeKinematic(body, rt, s, config, delta);
    return;

    const driven = s.controlMode === "driving" && s.activeVehicleId === id;

    const pos = body.translation();
    const quat = body.rotation();
    const lin = body.linvel();
    const fwd = quatVec(quat, 0, 0, 1);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const vf = fwd.x * lin.x + fwd.z * lin.z;

    rt.pos.x = pos.x;
    rt.pos.y = pos.y;
    rt.pos.z = pos.z;
    rt.yaw = yaw;
    rt.speed = vf;
    rt.updateTick++;

    if (wheels.current.length === 4) {
      for (let i = 0; i < 4; i++) {
        const w = wheels.current[i];
        const v = wheelVis.current[i];
        w.steer = v.steer;
        w.spring = v.spring;
        w.spinAngle = -v.rot;
      }
    }

    if (driven) {
      useGame.getState().setSpeed(Math.abs(vf) * 3.6);
      if (Math.abs(vf) < 0.4) {
        worldApi.ground.lastGood = { x: pos.x, z: pos.z };
      }
      if (input.justPressed("headlights")) {
        rt.headlightsOn = !rt.headlightsOn;
      }
      if (input.justPressed("reset")) {
        const ri = nearestRoadInfo(pos.x, pos.z);
        body.setTranslation({ x: ri.x, y: groundHeightAt(ri.x, ri.z) + config.clearance + 0.25, z: ri.z }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        useGame.getState().setResetHint(false);
      }
    }

    const mag = Math.hypot(lin.x, lin.y, lin.z);
    const drop = lastImpactSpeed.current - mag;
    if (drop > 5 && mag < 14) {
      rt.damage = clamp(rt.damage + drop / 50, 0, 1);
      worldApi.camera.shake = Math.min(1, (worldApi.camera.shake || 0) + clamp(drop / 25, 0.15, 0.6));
    }
    lastImpactSpeed.current = mag;
  });

  const g = groundHeightAt(position[0], position[2]);

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      mass={config.mass}
      linearDamping={config.bike ? 0 : 0.02}
      angularDamping={config.bike ? 0 : 1.4}
      ccd
      position={[position[0], position[1], position[2]]}
      rotation={[0, yaw, 0]}
    >
      <CuboidCollider
        args={[config.width / 2, config.height / 2, config.length / 2]}
        position={[0, config.clearance + config.height / 2, 0]}
        friction={0.5}
        restitution={0.05}
      />
      <CuboidCollider args={[config.width * 0.34, config.height * 0.2, config.length * 0.68]} position={[0, config.clearance - 0.04, 0]} density={2.4} />
      <WheelCtx.Provider value={registerWheel}>
        {!config.bike && (
          <>
            <Wheel pos={{ x: -config.wheelTrack / 2, z: config.wheelBase / 2 }} radius={config.wheelRadius} width={config.wheelWidth} front />
            <Wheel pos={{ x: config.wheelTrack / 2, z: config.wheelBase / 2 }} radius={config.wheelRadius} width={config.wheelWidth} front />
            <Wheel pos={{ x: -config.wheelTrack / 2, z: -config.wheelBase / 2 }} radius={config.wheelRadius} width={config.wheelWidth} front={false} />
            <Wheel pos={{ x: config.wheelTrack / 2, z: -config.wheelBase / 2 }} radius={config.wheelRadius} width={config.wheelWidth} front={false} />
          </>
        )}
        {children}
      </WheelCtx.Provider>
    </RigidBody>
  );
}

function quatVec(q: any, x: number, y: number, z: number) {
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  return {
    x: ix * qw + -qx * iw + qy * iz - qz * iy,
    y: iy * qw + -qy * iw + qz * ix - qx * iz,
    z: iz * qw + -qz * iw + qx * iy - qy * ix,
  };
}

function bikeKinematic(body: any, rt: RuntimeVehicle, s: ReturnType<typeof useGame.getState>, config: VehicleConfig, delta: number) {
  const driven = s.controlMode === "driving" && s.activeVehicleId === rt.id;
  let throttle = 0;
  let steer = 0;
  let handbrake = false;
  if (driven && s.phase === "playing") {
    throttle = input.axis("forward", "back");
    steer = input.axis("right", "left");
    handbrake = input.is("jump");
    if (input.justPressed("reset")) {
      const ri = nearestRoadInfo(rt.pos.x, rt.pos.z);
      rt.pos.x = ri.x;
      rt.pos.z = ri.z;
      rt.yaw = ri.yaw;
      rt.speed = 0;
      rt.pos.y = groundHeightAt(ri.x, ri.z) + config.clearance;
      worldApi.ground.lastGood = { x: ri.x, z: ri.z };
      useGame.getState().setResetHint(false);
    }
    if (input.justPressed("headlights")) {
      rt.headlightsOn = !rt.headlightsOn;
    }
    useGame.getState().setResetHint(false);
  }

  let speed = rt.speed;
  const surf = surfaceAt(rt.pos.x, rt.pos.z);
  const grip = gripFor(surf);

  if (throttle > 0) {
    speed += config.accel * throttle * (0.6 + 0.4 * grip) * delta;
  } else if (throttle < 0) {
    if (speed > 0.5) {
      speed -= config.brake * -throttle * delta;
    } else {
      speed -= config.brake * -throttle * delta * 0.4;
      speed = Math.max(speed, -config.reverseMax);
    }
  } else {
    speed *= Math.max(0, 1 - 1.4 * delta);
    if (Math.abs(speed) < 0.1) speed = 0;
  }

  if (handbrake) {
    speed *= Math.max(0, 1 - 2.8 * delta * grip);
  }
  speed = clamp(speed, -config.reverseMax, config.maxSpeed);

  const speedNL = clamp(Math.abs(speed) / config.maxSpeed, 0, 1);
  const steerScale = 1 / (1 + speedNL * config.steerAtSpeed);
  const targetSteer = steer * config.steering * steerScale;
  const steerAngle = rt.steer + (targetSteer - rt.steer) * clamp(delta * 8, 0, 1);
  const turnSpeed = Math.abs(speed) > 0.05 ? 1 : 0;
  const yaw = rt.yaw + steerAngle * turnSpeed * delta * (speed >= 0 ? 1 : -1) * (0.4 + 0.6 * grip);
  rt.steer = steerAngle;

  const vx = Math.sin(yaw) * speed;
  const vz = Math.cos(yaw) * speed;
  let nx = rt.pos.x + vx * delta;
  let nz = rt.pos.z + vz * delta;

  const beforeX = nx;
  const beforeZ = nz;
  const push = pushOutOfBuildings(nx, nz, config.width * 0.7);
  nx = push.x;
  nz = push.z;
  if (Math.abs(nx - beforeX) + Math.abs(nz - beforeZ) > 0.35 && Math.abs(speed) > 6) {
    rt.damage = clamp(rt.damage + 0.06, 0, 1);
  }

  const groundY = groundHeightAt(nx, nz);
  rt.pos.x = nx;
  rt.pos.z = nz;
  rt.pos.y = groundY + config.clearance;
  rt.speed = speed;
  rt.yaw = yaw;

  const roll = -steerAngle * speedNL * config.bodyRoll * (speed >= 0 ? 1 : -1);
  const dive = clamp(-speed * 0.004 * (throttle < 0 ? 1 : 0) + speed * 0.004 * (throttle > 0 ? 0.4 : 0), -0.14, 0.14);
  const quat = new THREE.Quaternion();
  const eul = new THREE.Euler(0, yaw + Math.PI / 2, 0, "YXZ");
  eul.x = dive;
  eul.z = roll * (config.bike ? 2.2 : 1);
  quat.setFromEuler(eul);

  body.setNextKinematicTranslation?.({ x: nx, y: rt.pos.y, z: nz });
  body.setNextKinematicRotation?.(quat);

  rt.skid = handbrake && Math.abs(speed) > 5 ? clamp((Math.abs(speed) / config.maxSpeed) * 0.8 + 0.2, 0, 1) : 0;

  if (driven) {
    useGame.getState().setSpeed(Math.abs(speed) * 3.6);
    if (Math.abs(speed) < 0.4) {
      worldApi.ground.lastGood = { x: nx, z: nz };
    }
  }
}

function gripFor(surf: string): number {
  switch (surf) {
    case "asphalt":
    case "bridge":
      return 1;
    case "wet":
      return 0.62;
    case "sand":
      return 0.38;
    case "grass":
      return 0.55;
    case "dirt":
      return 0.5;
    default:
      return 0.6;
  }
}