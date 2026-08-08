"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { VEHICLE_CONFIGS } from "./vehicleConfigs";
import { VehicleBody } from "./VehicleController";
import { useBodyMaterial, Headlamp } from "./vehicleKit";

export function TruckSUV({ id, color, position, yaw = 0, manual = true }: { id: string; color: string | number; position: [number, number, number]; yaw?: number; manual?: boolean }) {
  const cfg = VEHICLE_CONFIGS.suv;
  return (
    <VehicleBody config={cfg} id={id} manual={manual} position={position} yaw={yaw}>
      <Visual id={id} color={color} />
    </VehicleBody>
  );
}

function Visual({ id, color }: { id: string; color: string | number }) {
  const cfg = VEHICLE_CONFIGS.suv;
  const bodyMat = useBodyMaterial(id, color);
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1c1e22", roughness: 0.8, metalness: 0.2 }), []);
  const glass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8ea9bd",
        metalness: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    []
  );
  const L = cfg.length;
  const W = cfg.width;

  return (
    <group>
      <mesh material={bodyMat} castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[W * 1.05, 0.95, L]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 1.2, -0.1]}>
        <boxGeometry args={[W * 1.02, 0.42, L * 0.52]} />
      </mesh>
      <mesh material={glass} position={[0, 0.95, 0.75]}>
        <boxGeometry args={[W * 0.9, 0.55, 0.2]} />
      </mesh>
      <mesh material={glass} position={[0, 1.05, -0.3]}>
        <boxGeometry args={[W * 0.88, 0.55, 1.2]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 1.42, -0.3]}>
        <boxGeometry args={[W * 0.95, 0.1, 2.3]} />
      </mesh>
      {/* roof rack */}
      <mesh material={trim} position={[-W / 2 + 0.3, 1.5, -0.1]}>
        <boxGeometry args={[0.18, 0.08, 1.7]} />
      </mesh>
      <mesh material={trim} position={[W / 2 - 0.3, 1.5, -0.1]}>
        <boxGeometry args={[0.18, 0.08, 1.7]} />
      </mesh>
      {/* bumpers (chunky) */}
      <mesh material={trim} position={[0, 0.5, L / 2 + 0.14]}>
        <boxGeometry args={[W * 1.14, 0.42, 0.32]} />
      </mesh>
      <mesh material={trim} position={[0, 0.5, -L / 2 - 0.14]}>
        <boxGeometry args={[W * 1.14, 0.42, 0.32]} />
      </mesh>
      {/* side pipes */}
      <mesh material={trim} position={[-W / 2 - 0.12, 0.4, -0.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, L * 0.7, 8]} />
      </mesh>
      <mesh material={trim} position={[-W / 2 - 0.1, 0.55, 0.3]}>
        <boxGeometry args={[0.1, 0.14, 0.22]} />
      </mesh>
      <mesh material={trim} position={[W / 2 + 0.1, 0.55, 0.3]}>
        <boxGeometry args={[0.1, 0.14, 0.22]} />
      </mesh>
      <Headlamp id={id} position={[-W / 2 + 0.24, 0.95, L / 2 + 0.04]} />
      <Headlamp id={id} position={[W / 2 - 0.24, 0.95, L / 2 + 0.04]} />
    </group>
  );
}

const trimMat = new THREE.MeshStandardMaterial({ color: "#1c2c22", roughness: 0.8, metalness: 0.2 });