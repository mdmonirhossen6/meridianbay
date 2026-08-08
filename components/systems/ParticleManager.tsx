"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
}

const POOL_SIZE = 72;

const pool: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
  active: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 0,
  maxLife: 1,
  size: 0.2,
}));

let cursor = 0;

export function spawnDust(x: number, y: number, z: number, color: THREE.Color = new THREE.Color("#b8a488")) {
  const p = pool[cursor];
  cursor = (cursor + 1) % POOL_SIZE;
  p.active = true;
  p.x = x;
  p.y = y;
  p.z = z;
  p.vx = (Math.random() - 0.5) * 1.6;
  p.vy = Math.random() * 1.1;
  p.vz = (Math.random() - 0.5) * 1.6;
  p.life = 0;
  p.maxLife = 0.7 + Math.random() * 0.7;
  p.size = 0.22 + Math.random() * 0.2;
}

export function ParticleManager() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#cbb48d",
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    []
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    let anyVisible = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) {
        dummy.position.set(0, -500, 0);
        dummy.scale.setScalar(0.001);
      } else {
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          dummy.position.set(0, -500, 0);
          dummy.scale.setScalar(0.001);
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy -= 1.8 * dt;
          const fade = 1 - p.life / p.maxLife;
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.setScalar(p.size * (0.5 + fade));
          dummy.rotation.set(p.life * 3, p.life * 2, 0);
          anyVisible = true;
        }
      }
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      if (anyVisible) ref.current.count = POOL_SIZE;
      else ref.current.count = 0;
    }
  });

  return (
    <group name="particles">
      <instancedMesh ref={ref} args={[undefined, undefined, POOL_SIZE]} material={mat} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 6]} />
      </instancedMesh>
    </group>
  );
}