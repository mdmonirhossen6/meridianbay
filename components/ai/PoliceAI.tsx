"use client";

import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "@/store/gameStore";
import { worldApi } from "@/lib/worldApi";
import { groundHeightAt, nearestRoadInfo, pushOutOfBuildings } from "../city/cityData";
import { clamp } from "@/lib/procgen/noise";

interface Cop {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  active: boolean;
}

export function PoliceAI({ count = 6 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const beaconRef = useRef<THREE.InstancedMesh>(null);

  const cops = useMemo<Cop[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: 0,
        z: 0,
        yaw: 0,
        speed: 0,
        active: false,
      })),
    [count]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    useGame.subscribe((s) => {
      if (s.wanted > 0) {
        for (let i = 0; i < cops.length; i++) {
          if (!cops[i].active && i < s.wanted) {
            cops[i].active = true;
            cops[i].x = worldApi.player.pos.x + 30;
            cops[i].z = worldApi.player.pos.z + 30;
          }
        }
      }
    });
  }, [cops]);

  useFrame((_, rawDt) => {
    const dt = clamp(rawDt, 0, 0.05);
    const s = useGame.getState();
    if (s.phase === "paused") return;

    const wanted = s.wanted;

    for (let i = 0; i < cops.length; i++) {
      const c = cops[i];
      c.active = i < wanted;
      if (!c.active) continue;

      const px = worldApi.player.pos.x;
      const pz = worldApi.player.pos.z;

      const targetSpeed = wanted >= 3 ? 16 : 11;
      c.speed += clamp(targetSpeed - c.speed, -4 * dt, 2 * dt);

      const targetYaw = Math.atan2(pz - c.z, px - c.x);
      let dy = targetYaw - c.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      c.yaw += dy * clamp(dt * 2, 0, 1);

      c.x += Math.cos(c.yaw) * c.speed * dt;
      c.z += Math.sin(c.yaw) * c.speed * dt;

      const push = pushOutOfBuildings(c.x, c.z, 1);
      c.x = push.x;
      c.z = push.z;

      const y = groundHeightAt(c.x, c.z);
      dummy.position.set(c.x, y + 0.3, c.z);
      dummy.rotation.set(0, c.yaw, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
      beaconRef.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
    if (beaconRef.current) beaconRef.current.instanceMatrix.needsUpdate = true;

    // bust check: player stopped near a cop
    if (wanted > 0 && s.controlMode === "driving") {
      const v = s.activeVehicleId ? worldApi.vehicles.get(s.activeVehicleId) : undefined;
      if (v && v.speed < 0.4) {
        let near = false;
        for (const c of cops) {
          if (!c.active) continue;
          const d = Math.hypot(c.x - v.pos.x, c.z - v.pos.z);
          if (d < 6) near = true;
        }
        if (near) {
          bustTimer += dt;
          if (bustTimer > 4) {
            bustTimer = 0;
            doBust(s, v);
          }
        } else {
          bustTimer = Math.max(0, bustTimer - dt);
        }
      } else {
        bustTimer = Math.max(0, bustTimer - dt);
      }
    }
  });

  return (
    <group name="police">
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
        <boxGeometry args={[1.8, 1.2, 4.4]} />
        <meshStandardMaterial color="#1e2a38" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={beaconRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshBasicMaterial color="#ff3040" />
      </instancedMesh>
    </group>
  );
}

let bustTimer = 0;

function doBust(s: ReturnType<typeof useGame.getState>, v: { pos: { x: number; z: number } }) {
  s.setWanted(0);
  const ri = nearestRoadInfo(v.pos.x, v.pos.z);
  s.notify("BUSTED — wanted reset");
  useGame.getState().setWanted(0);
  // reset player position to a road
  worldApi.player.pos.set(ri.x, groundHeightAt(ri.x, ri.z) + 1.7, ri.z);
  s.setSpeed(0);
}