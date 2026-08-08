"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { VEHICLE_CONFIGS } from "./vehicleConfigs";
import { VehicleBody, Wheel } from "./VehicleController";
import { useBodyMaterial, Headlamp } from "./vehicleKit";

export function Motorcycle({ id, color, position, yaw = 0, manual = true }: { id: string; color: string | number; position: [number, number, number]; yaw?: number; manual?: boolean }) {
  const cfg = VEHICLE_CONFIGS.motorcycle;
  return (
    <VehicleBody config={cfg} id={id} manual={manual} position={position} yaw={yaw}>
      <Visual id={id} color={color} />
    </VehicleBody>
  );
}

function Visual({ id, color }: { id: string; color: string | number }) {
  const cfg = VEHICLE_CONFIGS.motorcycle;
  const bodyMat = useBodyMaterial(id, color, { metalness: 0.35, roughness: 0.55 });
  const trim = useMemo(() => new THREE.MeshStandardMaterial({ color: "#23262b", roughness: 0.6, metalness: 0.7 }), []);
  const skin = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c9a37a", roughness: 0.7 }), []);

  return (
    <group>
      {/* rear wheel */}
      <Wheel pos={{ x: 0, z: -0.72 }} radius={0.3} width={0.13} front={false} hub="#3b3f46" />
      {/* front wheel */}
      <Wheel pos={{ x: 0, z: 0.72 }} radius={0.28} width={0.1} front />

      {/* frame */}
      <mesh material={trim} position={[0, 0.42, 0]}>
        <boxGeometry args={[0.09, 0.3, 1.5]} />
      </mesh>
      {/* fuel tank block */}
      <mesh material={bodyMat} castShadow position={[0, 0.5, 0.28]}>
        <boxGeometry args={[0.42, 0.22, 0.55]} />
      </mesh>
      {/* seat */}
      <mesh material={trim} position={[0, 0.58, -0.25]}>
        <boxGeometry args={[0.4, 0.1, 0.5]} />
      </mesh>
      {/* tail */}
      <mesh material={bodyMat} castShadow position={[0, 0.62, -0.7]}>
        <boxGeometry args={[0.12, 0.24, 0.3]} />
      </mesh>
      {/* engine block */}
      <mesh material={trim} position={[0, 0.32, 0.55]}>
        <boxGeometry args={[0.28, 0.2, 0.42]} />
      </mesh>
      {/* exhaust */}
      <mesh material={trim} position={[0, 0.3, -0.25]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.6, 8]} />
      </mesh>

      {/* forks + handlebars */}
      <mesh material={trim} position={[0, 0.62, 0.72]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 6]} />
      </mesh>
      <mesh material={trim} position={[0, 0.95, 0.66]}>
        <boxGeometry args={[0.5, 0.045, 0.045]} />
      </mesh>
      <mesh material={skin} position={[-0.25, 0.95, 0.66]}>
        <cylinderGeometry args={[0.03, 0.03, 0.09, 6]} />
      </mesh>
      <mesh material={skin} position={[0.25, 0.95, 0.66]}>
        <cylinderGeometry args={[0.03, 0.03, 0.09, 6]} />
      </mesh>

      {/* headlight */}
      <Headlamp id={id} position={[0, 0.9, 0.88]} radius={0.09} />

      {/* Rider */}
      <group position={[0, 0.6, -0.18]}>
        <mesh material={skin} position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.14, 10, 10]} />
        </mesh>
        <mesh material={skin} position={[0, 0.2, 0]}>
          <boxGeometry args={[0.3, 0.2, 0.1]} />
        </mesh>
        <group position={[0.16, 0.32, 0]}>
          <mesh material={skin} position={[0.1, -0.05, 0]}>
            <boxGeometry args={[0.07, 0.2, 0.07]} />
          </mesh>
        </group>
      </group>
      {/* rear foot pegs */}
      <mesh material={trim} position={[-0.16, 0.28, -0.55]}>
        <boxGeometry args={[0.08, 0.02, 0.16]} />
      </mesh>
      <mesh material={trim} position={[0.16, 0.28, -0.55]}>
        <boxGeometry args={[0.08, 0.02, 0.16]} />
      </mesh>
    </group>
  );
}