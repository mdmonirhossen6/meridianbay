"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { getCity, CELL } from "./cityData";
import { mulberry32 } from "@/lib/procgen/noise";
import { useBodyMaterial } from "@/components/vehicles/vehicleKit";

export function Landmarks() {
  const city = getCity();

  const stadium = useMemo(() => city.landmarks.find((l) => l.kind === "stadium"), [city]);
  const tower = useMemo(() => city.landmarks.find((l) => l.kind === "tower"), [city]);

  return (
    <group>
      {stadium && <Stadium position={[stadium.x + 20, 0, stadium.z]} />}
      {tower && <CenterTower position={[tower.x, 0, tower.z]} />}
    </group>
  );
}

function Stadium({ position }: { position: [number, number, number] }) {
  const grass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3c8d3c", roughness: 0.9 }), []);
  const wall = useMemo(() => new THREE.MeshStandardMaterial({ color: "#8f949c", roughness: 0.7 }), []);
  const roof = useMemo(() => new THREE.MeshStandardMaterial({ color: "#cfd3d8", roughness: 0.5, metalness: 0.4 }), []);
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 1.5, 0]} material={wall} castShadow receiveShadow>
        <cylinderGeometry args={[34, 36, 3, 24]} />
      </mesh>
      <mesh position={[0, 3, 0]} material={roof} castShadow>
        <torusGeometry args={[34, 1.2, 8, 24]} />
      </mesh>
      <mesh position={[0, 1.5, 0]} material={grass}>
        <cylinderGeometry args={[28, 28, 1, 24]} />
      </mesh>
      {/* entrance gaps appear as darker boxes */}
      <mesh position={[0, 1.5, 34]} material={grass2}>
        <boxGeometry args={[10, 3.4, 1]} />
      </mesh>
    </group>
  );
}

const grass2 = new THREE.MeshStandardMaterial({ color: "#2e6e2e", roughness: 0.9 });

function CenterTower({ position }: { position: [number, number, number] }) {
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9aa1aa", metalness: 0.7, roughness: 0.4 }), []);
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: "#5f7f9f", metalness: 0.4, roughness: 0.2, transparent: true, opacity: 0.6 }), []);
  return (
    <group position={[position[0], -4, position[1]]}>
      <mesh position={[0, 24, 0]} material={glass} castShadow receiveShadow>
        <cylinderGeometry args={[5, 6, 52, 10]} />
      </mesh>
      <mesh position={[0, 52, 0]} material={metal} castShadow>
        <coneGeometry args={[1.2, 8, 8]} />
      </mesh>
      <mesh position={[0, 52, 0]} material={redBeacon}>
        <sphereGeometry args={[0.5, 8, 8]} />
      </mesh>
    </group>
  );
}

const redBeacon = new THREE.MeshStandardMaterial({
  color: "#ff4b4b",
  emissive: new THREE.Color("#ff2b2b"),
  emissiveIntensity: 1,
});