"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { VEHICLE_CONFIGS } from "./vehicleConfigs";
import { VehicleBody } from "./VehicleController";
import { useBodyMaterial, Headlamp } from "./vehicleKit";

export function SportsCoupe({ id, color, position, yaw = 0, manual = true }: { id: string; color: string | number; position: [number, number, number]; yaw?: number; manual?: boolean }) {
  const cfg = VEHICLE_CONFIGS.sports;
  return (
    <VehicleBody config={cfg} id={id} manual={manual} position={position} yaw={yaw}>
      <Visual id={id} color={color} />
    </VehicleBody>
  );
}

function Visual({ id, color }: { id: string; color: string | number }) {
  const cfg = VEHICLE_CONFIGS.sports;
  const bodyMat = useBodyMaterial(id, color, { metalness: 0.6, roughness: 0.3 });
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: "#17181c", roughness: 0.5, metalness: 0.5 }), []);
  const glass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7f93a8",
        metalness: 0.5,
        roughness: 0.05,
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
      <mesh material={bodyMat} castShadow position={[0, 0.32, 0]}>
        <boxGeometry args={[W * 1.0, 0.42, L * 0.98]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 0.16, -0.3]}>
        <boxGeometry args={[W * 0.9, 0.24, L * 0.5]} />
      </mesh>
      {/* front wedge */}
      <mesh material={bodyMat} castShadow position={[0, 0.34, 1.05]}>
        <boxGeometry args={[W * 0.9, 0.2, 1.1]} />
      </mesh>
      <mesh material={glass} position={[0, 0.62, 0.15]}>
        <boxGeometry args={[W * 0.72, 0.48, 1.7]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 0.84, -0.1]}>
        <boxGeometry args={[W * 0.72, 0.1, 1.5]} />
      </mesh>
      <mesh material={bodyMat} castShadow position={[0, 0.78, -1.05]}>
        <boxGeometry args={[W * 1.0, 0.12, 0.4]} />
      </mesh>
      {/* spoiler */}
      <mesh material={trim} position={[0, 0.92, -L / 2 - 0.06]}>
        <boxGeometry args={[W * 0.95, 0.08, 0.4]} />
      </mesh>
      <mesh material={trim} position={[0, 0.78, -L / 2 - 0.04]}>
        <boxGeometry args={[0.1, 0.26, 0.06]} />
      </mesh>
      <mesh material={trim} position={[0, 0.22, L / 2 + 0.08]}>
        <boxGeometry args={[W * 1.04, 0.22, 0.2]} />
      </mesh>
      <mesh material={trim} position={[0, 0.22, -L / 2 - 0.08]}>
        <boxGeometry args={[W * 1.04, 0.22, 0.2]} />
      </mesh>
      <mesh material={trim} position={[-W / 2 - 0.08, 0.55, 0.2]}>
        <boxGeometry args={[0.1, 0.12, 0.2]} />
      </mesh>
      <mesh material={trim} position={[W / 2 + 0.08, 0.55, 0.2]}>
        <boxGeometry args={[0.1, 0.12, 0.2]} />
      </mesh>
      {/* interior hints */}
      <mesh material={trim} position={[0.26, 0.5, -0.5]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.12, 0.02, 8, 14]} />
      </mesh>
      <Headlamp id={id} position={[-W / 2 + 0.18, 0.42, L / 2 + 0.02]} />
      <Headlamp id={id} position={[W / 2 - 0.18, 0.42, L / 2 + 0.02]} />
    </group>
  );
}