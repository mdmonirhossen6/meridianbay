"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, useRapier, useBeforePhysicsStep } from "@react-three/rapier";
import { useGame } from "@/store/gameStore";
import { input } from "@/lib/input/InputManager";
import { worldApi } from "@/lib/worldApi";
import { clamp } from "@/lib/procgen/noise";
import { getCity, groundHeightAt } from "@/components/city/cityData";
import { CityLayout } from "@/components/city/CityLayout";
import { WorldColliders } from "@/components/physics/WorldColliders";
import { PlayerCharacter } from "@/components/character/PlayerCharacter";
import { VehicleSpawner } from "@/components/vehicles/VehicleSpawner";
import { VEHICLE_CONFIGS } from "@/components/vehicles/vehicleConfigs";
import { TrafficAI } from "@/components/ai/TrafficAI";
import { PoliceAI } from "@/components/ai/PoliceAI";
import { PedestrianAI } from "@/components/ai/PedestrianAI";
import { CameraManager } from "@/components/cameras/CameraManager";
import { DayNightCycle } from "@/components/systems/DayNightCycle";
import { ParticleManager } from "@/components/systems/ParticleManager";
import { initObjectiveSystem, updateObjectiveSystem, collectibles } from "@/components/systems/ObjectiveSystem";
import { initWantedSystem, updateWantedSystem } from "@/components/systems/WantedSystem";
import {
  ensureAudio,
  resumeAudio,
  setMuted,
  setRadio,
  stopRadio,
  startEngine,
  stopEngine,
  setEngineSound,
  startSkid,
  stopSkid,
  setSkid,
  startWind,
  stopWind,
  setWind,
  playHorn,
  startAmbience,
} from "@/components/audio/AudioManager";

const RADIO_NAMES = ["Radio off", "FM Static", "Velocity FM", "Ocean Drive"];

export function startGame() {
  const s = useGame.getState();
  ensureAudio();
  resumeAudio();
  initObjectiveSystem();
  initWantedSystem();
  if (!worldApi.started) {
    worldApi.started = true;
    startAmbience();
  }
  s.setPhase("playing");
}

function PhysicsDebugProbe() {
  const { world, rapier } = useRapier();
  const { camera } = useThree();
  useEffect(() => {
    (window as any).__probe = (x: number, y: number, z: number, dx: number, dy: number, dz: number, maxToi: number) => {
      const ray = new rapier.Ray({ x, y, z }, { x: dx, y: dy, z: dz });
      const hit = world.castRay(ray, maxToi, true);
      return hit ? { toi: hit.timeOfImpact, px: x + dx * hit.timeOfImpact, py: y + dy * hit.timeOfImpact, pz: z + dz * hit.timeOfImpact } : null;
    };
    (window as any).__cam = () => {
      const v = new THREE.Vector3();
      camera.getWorldDirection(v);
      return { x: v.x, y: v.y, z: v.z };
    };
  }, [world, rapier, camera]);
  useBeforePhysicsStep(() => {
    (window as any).__stepProbe = ((window as any).__stepProbe || 0) + 1;
  });
  return null;
}

function SystemLoop() {  const lastVehicle = useRef<string | null>(null);
  const engineRunning = useRef(false);

  useFrame((_, rawDt) => {
    const dt = clamp(rawDt, 0, 0.05);
    const s = useGame.getState();

    if (s.phase === "playing") {
      worldApi.time += dt;
      s.setDayTime((s.dayTime + dt / 240) % 1);
      updateWantedSystem(dt);
      updateObjectiveSystem(dt);
    }

    if (input.justPressed("pause")) s.togglePause();

    if (s.phase === "playing") {
      if (input.justPressed("radio")) {
        const next = (s.radio + 1) % (RADIO_NAMES.length);
        s.setRadio(next);
        if (s.controlMode === "driving" && s.activeVehicleId) setRadio(next === 0 ? -1 : next);
        else stopRadio();
        s.notify(RADIO_NAMES[next]);
      }
      if (input.justPressed("horn") && s.controlMode === "driving") playHorn();
      if (input.justPressed("mute")) {
        s.toggleMuted();
        setMuted(s.muted);
      }
    }

    const v = s.activeVehicleId ? worldApi.vehicles.get(s.activeVehicleId) : undefined;
    const driving = s.controlMode === "driving" && !!v;

    if (driving && v) {
      const cfg = VEHICLE_CONFIGS[v.class];
      if (lastVehicle.current !== v.id) {
        lastVehicle.current = v.id;
        if (!engineRunning.current) {
          engineRunning.current = true;
          startEngine(v.class);
          startSkid();
          startWind();
          setRadio(s.radio === 0 ? -1 : s.radio);
        }
      }
      const throttle = input.axis("forward", "back");
      const ratio = clamp(Math.abs(v.speed) / cfg.maxSpeed, 0, 1);
      setEngineSound(v.class, ratio, throttle > 0 ? 1 : 0);
      setSkid(v.skid);
      setWind(ratio);
    } else if (lastVehicle.current !== null) {
      lastVehicle.current = null;
      if (engineRunning.current) {
        engineRunning.current = false;
        stopEngine();
        stopSkid();
        stopWind();
        stopRadio();
      }
    }
  });

  return null;
}

function CollectibleMarkers() {
  const groupRef = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const baseY = useMemo(() => collectibles.map((c) => groundHeightAt(c.x, c.z) + 1.1), []);
  const t0 = useRef(performance.now());

  useFrame(() => {
    const s = useGame.getState();
    const show = s.phase === "playing";
    const bob = Math.sin((performance.now() - t0.current) / 420) * 0.16;
    for (let i = 0; i < meshes.current.length; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const taken = collectibles[i]?.taken ?? true;
      m.visible = show && !taken;
      m.position.y = baseY[i] + bob;
      m.rotation.y += 0.03;
    }
    if (groupRef.current) groupRef.current.visible = show;
  });

  return (
    <group name="collectible-markers" ref={groupRef}>
      {collectibles.map((c, i) => (
        <mesh
          key={i}
          position={[c.x, baseY[i], c.z]}
          ref={(el) => {
            if (el) meshes.current[i] = el;
          }}
        >
          <cylinderGeometry args={[0.34, 0.34, 0.55, 10]} />
          <meshStandardMaterial color="#ffd25e" emissive="#a86c00" emissiveIntensity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function ObjectiveMarkers() {
  const pick = useRef<THREE.Group>(null);
  const target = useRef<THREE.Group>(null);
  const pickLight = useRef<THREE.PointLight>(null);
  const t0 = useRef(performance.now());

  useFrame(() => {
    const s = useGame.getState();
    const o = s.objective;
    const show = s.phase === "playing" && !!o;
    const bob = Math.sin((performance.now() - t0.current) / 380) * 0.2;

    if (pick.current) {
      pick.current.visible = show;
      if (o) {
        pick.current.position.set(o.location[0], groundHeightAt(o.location[0], o.location[1]) + 1.2 + bob, o.location[1]);
      }
      if (o?.type === "delivery" && (o.progress ?? 0) >= 0.5 && o.target) {
        if (target.current) {
          target.current.visible = true;
          target.current.position.set(o.target[0], groundHeightAt(o.target[0], o.target[1]) + 1.2 + bob, o.target[1]);
        }
      } else if (target.current) {
        target.current.visible = false;
      }
    }
    if (pickLight.current && pick.current) {
      pickLight.current.position.copy(pick.current.position);
      pickLight.current.intensity = show ? 1.6 : 0;
    }
  });

  return (
    <group>
      <group ref={pick}>
        <mesh>
          <cylinderGeometry args={[0.7, 0.7, 0.14, 14]} />
          <meshStandardMaterial color="#ffe9a8" emissive="#ffb300" emissiveIntensity={1.4} />
        </mesh>
        <pointLight ref={pickLight} color="#ffd57a" distance={26} intensity={1.6} />
      </group>
      <group ref={target}>
        <mesh>
          <cylinderGeometry args={[0.7, 0.7, 0.14, 14]} />
          <meshStandardMaterial color="#9affa8" emissive="#00c853" emissiveIntensity={1.4} />
        </mesh>
      </group>
    </group>
  );
}

export function Scene() {
  const city = getCity();
  const start: [number, number, number] = useMemo(
    () => [city.spawns[0].x - 6, groundHeightAt(city.spawns[0].x - 6, city.spawns[0].z + 6) + 1.7, city.spawns[0].z + 6],
    [city]
  );

  if (typeof window !== "undefined" && !(window as any).__gameApi) {
    (window as any).__gameApi = {
      player: () => ({
        x: worldApi.player.pos.x,
        y: worldApi.player.pos.y,
        z: worldApi.player.pos.z,
        vx: worldApi.player.vel.x,
        vy: worldApi.player.vel.y,
        vz: worldApi.player.vel.z,
        yaw: worldApi.player.yaw,
        moving: worldApi.player.moving,
        speed: worldApi.player.speed,
        grounded: worldApi.player.grounded,
        onFoot: worldApi.player.onFoot,
        mode: useGame.getState().controlMode,
        phase: useGame.getState().phase,
        vehicle: useGame.getState().activeVehicleId,
      }),
      buildings: getCity().buildings.map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d })),
      vehicles: () =>
        Array.from(worldApi.vehicles.values()).map((v) => ({ id: v.id, x: v.pos.x, y: v.pos.y, z: v.pos.z, speed: v.speed, class: v.class })),
      teleport: (x: number, z: number) => worldApi.teleportPlayer(x, groundHeightAt(x, z) + 0.88, z),
      bodyHandle: () => worldApi.playerBodyRef?.current?.handle ?? null,
      bodyIsBody: () => !!(worldApi.playerBodyRef?.current && worldApi.playerBodyRef.current.setTranslation && worldApi.playerBodyRef.current.translation),
    };
  }

  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ fov: 62, near: 0.1, far: 1600, position: [start[0] + 8, start[1] + 3, start[2] + 8] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0a1128"]} />
      <fog attach="fog" args={["#3a6ea8", 120, 720]} />
      <Physics gravity={[0, -9.81, 0]}>
        <PhysicsDebugProbe />
        <DayNightCycle />
        <WorldColliders />
        <CityLayout />
        <PlayerCharacter start={start} />
        <VehicleSpawner />
        <TrafficAI count={26} />
        <PoliceAI count={6} />
        <PedestrianAI count={22} />
        <CollectibleMarkers />
        <ObjectiveMarkers />
        <ParticleManager />
        <CameraManager />
        <SystemLoop />
      </Physics>
    </Canvas>
  );
}