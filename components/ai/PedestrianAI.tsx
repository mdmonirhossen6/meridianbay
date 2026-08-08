"use client";

import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { groundHeightAt, GRID } from "../city/cityData";
import { mulberry32, clamp } from "@/lib/procgen/noise";

interface Ped {
  x: number;
  z: number;
  dir: number;
  speed: number;
}

const EXT_HALF = ((GRID - 1) * 80) / 2;

export function PedestrianAI({ count = 22 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  const peds = useMemo<Ped[]>(() => {
    const rng = mulberry32(5556);
    const list: Ped[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: rng() * EXT_HALF * 2 - EXT_HALF,
        z: rng() * EXT_HALF * 2 - EXT_HALF,
        dir: rng() * Math.PI * 2,
        speed: 1 + rng() * 1.6,
      });
    }
    return list;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, rawDt) => {
    const dt = clamp(rawDt, 0, 0.05);
    for (let i = 0; i < peds.length; i++) {
      const p = peds[i];
      if (Math.random() < dt * 0.5) p.dir += (Math.random() - 0.5) * 1.6;
      p.x += Math.cos(p.dir) * p.speed * dt;
      p.z += Math.sin(p.dir) * p.speed * dt;

      if (p.x > EXT_HALF) p.dir = Math.PI - p.dir;
      if (p.x < -EXT_HALF) p.dir = Math.PI - p.dir;
      if (p.z > EXT_HALF) p.dir = -p.dir;
      if (p.z < -EXT_HALF) p.dir = -p.dir;

      const y = groundHeightAt(p.x, p.z);
      dummy.position.set(p.x, y + 0.92, p.z);
      dummy.rotation.set(0, p.dir, 0);
      dummy.scale.set(0.85, 1, 0.85);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="pedestrians">
      <instancedMesh ref={ref} args={[undefined, undefined, count]} castShadow>
        <boxGeometry args={[0.4, 1.7, 0.36]} />
        <meshStandardMaterial color="#d8b98a" roughness={0.8} />
      </instancedMesh>
    </group>
  );
}