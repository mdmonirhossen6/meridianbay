"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { worldApi } from "@/lib/worldApi";

export function useBodyMaterial(id: string, baseColor: string | number, extra?: Partial<THREE.MeshStandardMaterialParameters>) {
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.6, metalness: 0.12, ...extra }),
    [id, baseColor]
  );
  useFrame(() => {
    const rt = worldApi.vehicles.get(id);
    const d = rt?.damage ?? 0;
    mat.color.set(baseColor).multiplyScalar(Math.max(0.4, 1 - d * 0.5));
  });
  return mat;
}

export function Headlamp({ id, position, rotY = 0, radius = 0.11 }: { id: string; position: [number, number, number]; rotY?: number; radius?: number }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#fff9e0",
        emissive: new THREE.Color("#fff1c0"),
        emissiveIntensity: 0.06,
        roughness: 0.2,
      }),
    []
  );
  useFrame(() => {
    const rt = worldApi.vehicles.get(id);
    const on = !!rt?.headlightsOn;
    mat.emissiveIntensity += ((on ? 1.1 : 0.06) - mat.emissiveIntensity) * 0.2;
  });
  return <mesh position={position} rotation={[0, rotY, 0]} material={mat}><sphereGeometry args={[radius, 10, 10]} /></mesh>;
}

export function HeadlightBeam({ id, position, rotY = 0, night }: { id: string; position: [number, number, number]; rotY?: number; night: number }) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffe9a8",
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    []
  );
  useFrame(() => {
    const rt = worldApi.vehicles.get(id);
    const on = !!rt?.headlightsOn;
    mat.opacity = (on ? 0.28 : 0.02) * (0.3 + night);
  });
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={mat} position={[0, -0.05, 0.6]} rotation={[0.35, 0, 0]}>
        <coneGeometry args={[0.55, 3.2, 8, 1, true]} />
      </mesh>
      <mesh material={mat} position={[0, -0.05, 0.6]}>
        <coneGeometry args={[0.55, 3.2, 8, 1, true]} />
      </mesh>
    </group>
  );
}

export function Taillight({ id, position, rotY = 0 }: { id: string; position: [number, number, number]; rotY?: number }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#7a1020",
        emissive: new THREE.Color("#ff2b3a"),
        emissiveIntensity: 0.55,
        roughness: 0.3,
      }),
    []
  );
  useFrame(() => {
    const rt = worldApi.vehicles.get(id);
    const braking = rt && rt.skid > 0;
    const target = braking || (rt && rt.speed < -0.2) ? 1.4 : 0.55;
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.2;
  });
  return <mesh position={position} rotation={[0, rotY, 0]} material={mat}><boxGeometry args={[0.26, 0.1, 0.06]} /></mesh>;
}

export function WindowGlass({ position = [0, 0, 0] as [number, number, number], size = [1, 1, 1] as [number, number, number], tint = "#9fb6c6" }) {
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tint,
        metalness: 0.35,
        roughness: 0.08,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    [tint]
  );
  return (
    <mesh position={position} material={mat}>
      <boxGeometry args={size} />
    </mesh>
  );
}