"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { VEHICLE_CONFIGS } from "./vehicleConfigs";
import { VehicleBody } from "./VehicleController";
import { useBodyMaterial, Headlamp } from "./vehicleKit";

export function Sedan({ id, color, position, yaw = 0, manual = true }: { id: string; color: string | number; position: [number, number, number]; yaw?: number; manual?: boolean }) {
  const cfg = VEHICLE_CONFIGS.sedan;
  return (
    <VehicleBody config={cfg} id={id} manual={manual} position={position} yaw={yaw}>
      <Visual id={id} color={color} />
    </VehicleBody>
  );
}

function Visual({ id, color }: { id: string; color: string | number }) {
  const cfg = VEHICLE_CONFIGS.sedan;
  const bodyMat = useBodyMaterial(id, color);
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: "#262428", roughness: 0.75, metalness: 0.4 }), []);
  const glass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#9fb6c6",
        metalness: 0.3,
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
      <mesh material={bodyMat} castShadow position={[0, 0.48, 0]}>
        <boxGeometry args={[W * 1.02, 0.62, L * 0.99]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 0.26, -0.35]}>
        <boxGeometry args={[W * 0.94, 0.3, L * 0.6]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 0.62, 0.9]}>
        <boxGeometry args={[W * 0.9, 0.24, 1.5]} />
      </mesh>
      <mesh material={glass} position={[0, 0.84, -0.2]}>
        <boxGeometry args={[W * 0.78, 0.6, 1.55]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 1.1, -0.4]}>
        <boxGeometry args={[W * 0.8, 0.12, 1.6]} />
      </mesh>
      <mesh material={trim} position={[0, 0.36, L / 2 + 0.12]}>
        <boxGeometry args={[W * 1.05, 0.3, 0.24]} />
      </mesh>
      <mesh material={trim} position={[0, 0.36, -L / 2 - 0.12]}>
        <boxGeometry args={[W * 1.05, 0.3, 0.24]} />
      </mesh>
      <mesh material={trim} position={[-W / 2 - 0.1, 0.72, 0.3]}>
        <boxGeometry args={[0.12, 0.16, 0.24]} />
      </mesh>
      <mesh material={trim} position={[W / 2 + 0.1, 0.72, 0.3]}>
        <boxGeometry args={[0.12, 0.16, 0.24]} />
      </mesh>
      <mesh material={glass} position={[0, 0.5, -0.4]}>
        <boxGeometry args={[W * 0.6, 0.3, 0.05]} />
      </mesh>
      <mesh material={trim} position={[0.3, 0.62, -0.6]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.14, 0.024, 8, 14]} />
      </mesh>
      <Headlamp id={id} position={[-W / 2 + 0.22, 0.6, L / 2 + 0.04]} />
      <Headlamp id={id} position={[W / 2 - 0.22, 0.6, L / 2 + 0.04]} />
    </group>
  );
}